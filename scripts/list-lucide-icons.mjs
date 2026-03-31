import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const root = path.join(process.cwd(), "src");
const files = walk(root);

/** @type {Set<string>} */
const icons = new Set();
const re = /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  let m;
  while ((m = re.exec(src))) {
    const body = m[1].replace(/\s+/g, " ");
    for (const part of body.split(",")) {
      const t = part.trim();
      if (!t) continue;
      const name = t.split(/\s+as\s+/i)[0]?.trim();
      if (name) icons.add(name);
    }
  }
}

console.log([...icons].sort().join("\n"));

