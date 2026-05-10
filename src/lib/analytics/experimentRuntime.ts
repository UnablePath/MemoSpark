import { createHash } from "node:crypto";

export interface ExperimentVariantConfig {
  ctaText?: string;
  ctaClass?: string;
  [key: string]: unknown;
}

export interface ExperimentVariantRecord {
  id: string;
  key: string;
  name: string;
  weight: number;
  config: ExperimentVariantConfig;
}

export interface ExperimentRecord {
  id: string;
  key: string;
  name: string;
  rollout_percentage: number;
}

export const ANONYMOUS_ID_COOKIE = "memospark_aid";
export const HOMEPAGE_CTA_EXPERIMENT_KEY = "homepage_pricing_cta_v1";

/** Readable cookie: assigned variant key for homepage CTA (signup attribution if localStorage is cleared). */
export const HOMEPAGE_CTA_VARIANT_COOKIE = "ms_ab_hp_cta";

export function hashToBucket(value: string): number {
  const hash = createHash("sha256").update(value).digest("hex");
  const shortHash = Number.parseInt(hash.slice(0, 8), 16);
  return shortHash % 100;
}

export function chooseWeightedVariant(
  variants: ExperimentVariantRecord[],
  deterministicSeed: string,
): ExperimentVariantRecord {
  const totalWeight = variants.reduce(
    (sum, variant) => sum + variant.weight,
    0,
  );
  if (totalWeight <= 0) return variants[0];

  const hash = createHash("sha256").update(deterministicSeed).digest("hex");
  const numeric = Number.parseInt(hash.slice(0, 8), 16);
  const target = numeric % totalWeight;

  let running = 0;
  for (const variant of variants) {
    running += variant.weight;
    if (target < running) return variant;
  }

  return variants[0];
}

export function buildSubjectKey(
  userId: string | null,
  anonymousId: string,
): string {
  if (userId) return `user:${userId}`;
  return `anon:${anonymousId}`;
}

export function generateAnonymousId(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  return `aid_${hash.slice(0, 20)}`;
}
