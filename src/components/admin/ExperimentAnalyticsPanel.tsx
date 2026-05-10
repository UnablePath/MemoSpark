"use client";

import { refreshExperimentSummaryAction } from "@/app/admin/experiments/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExperimentSummaryResult } from "@/lib/analytics/experimentSummaryQuery";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

const CONVERSION_TYPES = [
  { value: "sign_up_started", label: "Sign-up started (CTA click)" },
  { value: "sign_up_completed", label: "Sign-up completed" },
] as const;

const WINDOW_DAYS = [7, 14, 30, 90] as const;

function formatRate(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(2)}%`;
}

function formatLift(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

interface ExperimentAnalyticsPanelProps {
  initial: ExperimentSummaryResult;
  experimentKey: string;
}

export function ExperimentAnalyticsPanel({
  initial,
  experimentKey,
}: ExperimentAnalyticsPanelProps) {
  const [data, setData] = useState<ExperimentSummaryResult>(initial);
  const [conversionType, setConversionType] = useState(initial.conversionType);
  const [days, setDays] = useState(initial.windowDays);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await refreshExperimentSummaryAction({
        experimentKey,
        conversionType,
        days,
      });
      if (!result.success) {
        setError(result.error || "Load failed");
        return;
      }
      setData(result);
    });
  }, [experimentKey, conversionType, days]);

  const skipFilterSync = useRef(true);
  useEffect(() => {
    if (skipFilterSync.current) {
      skipFilterSync.current = false;
      return;
    }
    load();
  }, [load]);

  useEffect(() => {
    const intervalMs = 90_000;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      load();
    }, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const generatedLabel = useMemo(() => {
    try {
      return new Date(data.generatedAt).toLocaleString();
    } catch {
      return data.generatedAt;
    }
  }, [data.generatedAt]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          A/B experiment analytics
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Data updates automatically every few minutes while this tab is open,
          and when you return to the tab. Change conversion or window below to
          refetch on demand.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{data.experiment.name}</CardTitle>
          <CardDescription>
            Key{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {data.experiment.key}
            </code>
            <span className="mx-2">·</span>
            Generated {generatedLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="conversion-type">Conversion</Label>
              <Select
                value={conversionType}
                onValueChange={(value) => setConversionType(value)}
              >
                <SelectTrigger
                  id="conversion-type"
                  className="w-[min(100vw-2rem,280px)]"
                >
                  <SelectValue placeholder="Event" />
                </SelectTrigger>
                <SelectContent>
                  {CONVERSION_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="window-days">Window</Label>
              <Select
                value={String(days)}
                onValueChange={(value) => setDays(Number.parseInt(value, 10))}
              >
                <SelectTrigger id="window-days" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WINDOW_DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Last {d} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={load} disabled={pending}>
              {pending ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <div className="text-muted-foreground">Exposures (window)</div>
              <div className="text-lg font-semibold tabular-nums">
                {data.summary.totalExposures}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <div className="text-muted-foreground">Conversions (event)</div>
              <div className="text-lg font-semibold tabular-nums">
                {data.summary.totalConversions}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <div className="text-muted-foreground">
                Attributed value (sum)
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {data.summary.totalConversionValue.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Exposures</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Lift vs control</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.variants.map((row) => (
                  <TableRow key={row.variantKey}>
                    <TableCell>
                      <span className="font-medium">{row.variantName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({row.variantKey})
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.exposures}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.conversions}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(row.conversionRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatLift(row.liftVsControl)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
