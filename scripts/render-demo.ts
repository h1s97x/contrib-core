/**
 * 用确定性的离线样本数据生成预览 SVG（不访问任何平台 API）。
 *
 * 用法（core 仓库根目录）：
 *   bun scripts/render-demo.ts --out=dist                  # 所有 renderer，各明暗两份
 *   bun scripts/render-demo.ts --out=shells --shells      # 按 8 个壳目录写
 *   bun scripts/render-demo.ts --out=. --game=snake --prefix=demo
 *
 * 固定随机种子，保证每次生成的字节完全一致，可以安全地提交进版本库。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { cellsToGrid } from "../src/cellsToGrid";
import { shellTargets } from "../src/games";
import { parseEntry } from "../src/outputsOptions";
import {
  createRenderContext,
  rendererNames,
  renderers,
  type RendererName,
} from "../src/renderers";
import type { Cell } from "../src/sources";

const argv = process.argv.slice(2);
const arg = (name: string, fallback = "") =>
  argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ??
  fallback;
const has = (name: string) => argv.includes(`--${name}`);

const outDir = path.resolve(arg("out", "dist"));
const game = arg("game");
const prefix = arg("prefix");
const shellMode = has("shells");

let seed = 20261116;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const cells: Cell[] = [];
for (let x = 0; x < 53; x++) {
  for (let y = 0; y < 7; y++) {
    const level = Math.floor(rand() * 5);
    const date = new Date(Date.UTC(2026, 0, 1) + (x * 7 + y) * 86400000);
    cells.push({
      x,
      y,
      date: date.toISOString().slice(0, 10),
      count: level,
      level,
    });
  }
}
const grid = cellsToGrid(cells);
const context = createRenderContext(grid, cells);

const render = (name: RendererName, palette?: string) => {
  const entry = parseEntry(
    palette ? `preview.svg?palette=${palette}` : "preview.svg",
    "default",
    name,
  )!;
  return renderers[name].createSvg(context, {
    drawOptions: entry.drawOptions,
    animationOptions: entry.animationOptions,
    paletteName: entry.paletteName,
  });
};

const writePair = (dir: string, name: RendererName, filePrefix: string) => {
  fs.mkdirSync(dir, { recursive: true });
  const light = render(name);
  const dark = render(name, "github-dark");
  const lightPath = path.join(dir, `${filePrefix}.svg`);
  const darkPath = path.join(dir, `${filePrefix}-dark.svg`);
  fs.writeFileSync(lightPath, light);
  fs.writeFileSync(darkPath, dark);
  console.log(
    `✓ ${path.relative(process.cwd(), lightPath)} ${light.length}B / ${dark.length}B`,
  );
};

if (shellMode) {
  for (const g of shellTargets) {
    const dir = path.join(outDir, `contrib-arcade-${g.name}`);
    writePair(dir, g.name as RendererName, g.name);
  }
} else {
  const names: RendererName[] = game ? [game as RendererName] : rendererNames;
  for (const name of names) writePair(outDir, name, prefix || name);
}
