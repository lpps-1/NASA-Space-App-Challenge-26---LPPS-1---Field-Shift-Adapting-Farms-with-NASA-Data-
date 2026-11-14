// Fails when a t("…") text used in src has no Urdu/Punjabi row in src/i18n/strings*.js.
// Run: npm run test:i18n
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2] || process.cwd();
const src = path.join(root, "src");
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(f.name) && !p.includes(`${path.sep}i18n${path.sep}`)) files.push(p);
  }
})(src);

const tables = {};
for (const f of fs.readdirSync(path.join(src, "i18n"))) {
  if (!/^strings\d*\.js$/.test(f)) continue;
  const m = await import(pathToFileURL(path.join(src, "i18n", f)).href);
  for (const v of Object.values(m)) if (v && typeof v === "object") Object.assign(tables, v);
}

const used = new Map();
const re = /\bt\(\s*(["'`])((?:\\.|(?!\1).)+?)\1/g;
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  let m;
  while ((m = re.exec(s))) {
    if (m[1] === "`" && m[2].includes("${")) continue;
    const k = m[2].replace(/\\(["'`])/g, "$1");
    if (!used.has(k)) used.set(k, path.relative(root, f));
  }
}
const missing = [...used].filter(([k]) => !(k in tables));
console.log(`used ${used.size}, tables ${Object.keys(tables).length}, missing ${missing.length}`);
for (const [k, f] of missing) console.log(`${f} :: ${k}`);
if (missing.length) process.exit(1);
console.log("All UI texts have translations");
