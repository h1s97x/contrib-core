import { expect, it } from "bun:test";
import { arcadeGames, gameNames } from "../games";
import { parseEntry } from "../outputsOptions";
import {
  createRenderContext,
  rendererNames,
  renderers,
  resolveRenderer,
} from "../renderers";
import type { Cell } from "../sources";
import * as grids from "../solver/__fixtures__/grid";
import { getColor } from "../types";

const grid = grids.realistic;
const cells: Cell[] = [];
for (let x = 0; x < grid.width; x++)
  for (let y = 0; y < grid.height; y++)
    cells.push({
      x,
      y,
      date: "",
      count: getColor(grid, x, y),
      level: getColor(grid, x, y),
    });

const render = (name: string) => {
  const out = parseEntry(`out.svg?game=${name}`)!;
  return renderers[name as keyof typeof renderers].createSvg(
    createRenderContext(grid, cells),
    {
      drawOptions: out.drawOptions,
      animationOptions: out.animationOptions,
      paletteName: out.paletteName,
    },
  );
};

it("registers every game as a renderer", () => {
  for (const game of arcadeGames) {
    expect(game.status).toBe("ready");
    expect(rendererNames).toContain(game.name);
    expect(resolveRenderer(game.name)).toBe(game.name);
  }
});

const reimplemented = [
  "pacman",
  "breakout",
  "galaga",
  "puzzle-bobble",
  "bomberman",
  "minesweeper",
  "tetris",
];

for (const name of reimplemented)
  it(`renders ${name} with a complete first frame and bounded animation`, () => {
    const svg = render(name);
    expect(svg).toContain("<svg");
    expect(svg).toContain(`${name} gameplay`);
    expect(svg).toContain("rules reimplemented from scratch");
    // 静态首帧就是完整的 53×7 网格，没有格子被隐藏或延迟出现
    expect((svg.match(/class="g l\d/g) ?? []).length).toBe(cells.length);
    expect(svg).toContain("prefers-color-scheme");
    expect(svg).toContain("prefers-reduced-motion");
    expect(svg).toContain("@keyframes e0");
    expect(svg.length).toBeLessThan(120_000);
  });

it("gives each game a distinct animation", () => {
  const svgs = gameNames.map(render);
  expect(new Set(svgs).size).toBe(svgs.length);
});
