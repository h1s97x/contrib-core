/**
 * 冒烟检查 8 个壳目录：产物、README 本地引用、action.yml 的不可变引用。
 * 用法：bun scripts/verify-shells.ts [--out=shells]
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { shellTargets } from "../src/games";

const argv = process.argv.slice(2);
const outDir = path.resolve(
  argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "shells",
);

let failed = 0;
const rows: string[] = [];

for (const g of shellTargets) {
  const dir = path.join(outDir, `contrib-arcade-${g.name}`);
  const problems: string[] = [];
  const light = path.join(dir, `${g.name}.svg`);
  const dark = path.join(dir, `${g.name}-dark.svg`);

  for (const [label, file] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    if (!fs.existsSync(file)) {
      problems.push(`missing ${label} svg`);
      continue;
    }
    const svg = fs.readFileSync(file, "utf8");
    if (!svg.startsWith("<svg")) problems.push(`${label}: not an svg`);
    const rects = (svg.match(/<rect\b/g) ?? []).length;
    if (rects < 371) problems.push(`${label}: only ${rects} cells`);
    if (svg.length < 10_000) {
      problems.push(`${label}: too small (${svg.length}B)`);
    }
  }

  const readme = path.join(dir, "README.md");
  if (!fs.existsSync(readme)) problems.push("missing README");
  else {
    const text = fs.readFileSync(readme, "utf8");
    if (!text.includes(`./${g.name}.svg`)) {
      problems.push("README missing light preview");
    }
    if (!text.includes(`./${g.name}-dark.svg`)) {
      problems.push("README missing dark preview");
    }
  }

  const action = path.join(dir, "action.yml");
  if (!fs.existsSync(action)) problems.push("missing action.yml");
  else {
    const text = fs.readFileSync(action, "utf8");
    if (!/- uses: h1s97x\/contrib-core@v\d+\.\d+\.\d+/.test(text)) {
      problems.push("core ref not pinned to vX.Y.Z");
    }
    if (!text.includes(`renderer: ${g.name}`)) {
      problems.push("renderer not fixed");
    }
  }

  const size = fs.existsSync(light) ? fs.statSync(light).size : 0;
  rows.push(
    `${problems.length ? "FAIL" : "PASS"} ${g.name.padEnd(14)} ${String(size).padStart(7)}B  ${problems.join("; ")}`,
  );
  if (problems.length) failed++;
}

console.log(rows.join("\n"));
console.log(
  `\n${shellTargets.length - failed}/${shellTargets.length} shells passed`,
);
if (failed) process.exit(1);
