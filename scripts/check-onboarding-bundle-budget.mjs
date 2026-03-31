#!/usr/bin/env node
/**
 * §4.5 — Post-build chunk size spot-check for onboarding-related routes.
 * Run after `pnpm build`. Fails if any matched client chunk exceeds the budget (default 450 KiB).
 *
 * Usage: node scripts/check-onboarding-bundle-budget.mjs
 * Env:   ONBOARDING_BUDGET_KB=500 (optional)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const staticDir = path.join(root, ".next", "static", "chunks");

const budgetBytes =
  (Number.parseInt(process.env.ONBOARDING_BUDGET_KB || "450", 10) || 450) * 1024;

const needles = ["onboarding", "questionnaire", "WelcomeFlow", "OnboardingWizard"];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".js")) acc.push(p);
  }
  return acc;
}

const files = walk(staticDir);
const flagged = [];

for (const file of files) {
  let text = "";
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const base = path.basename(file);
  const rel = path.relative(root, file);
  const hit = needles.some((n) => text.includes(n) || base.includes(n));
  if (!hit) continue;
  const { size } = fs.statSync(file);
  if (size > budgetBytes) {
    flagged.push({ rel, kb: (size / 1024).toFixed(1) });
  }
}

if (!fs.existsSync(staticDir)) {
  console.error(
    "No .next/static/chunks — run `pnpm build` first, then re-run this script.",
  );
  process.exit(2);
}

if (flagged.length > 0) {
  console.error(
    `Onboarding-related chunks over ${(budgetBytes / 1024).toFixed(0)} KiB budget:`,
  );
  for (const f of flagged) console.error(`  ${f.rel}  (${f.kb} KiB)`);
  process.exit(1);
}

console.log(
  `OK — no onboarding-tagged chunks over ${(budgetBytes / 1024).toFixed(0)} KiB (heuristic string match).`,
);
