import { expect, it } from "bun:test";
import { CORE_REPO, arcadeGames, getGame, newShellNames } from "../games";
import { parseEntry } from "../outputsOptions";
import { renderers } from "../renderers";
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

it("follows the contrib naming scheme", () => {
  expect(CORE_REPO).toBe("h1s97x/contrib-core");
  expect(
    arcadeGames.every(
      (g) => g.shellRepo === `h1s97x/plugins/contrib-arcade-${g.name}`,
    ),
  ).toBe(true);
  expect(getGame("pacman")?.shellRepo).toBe(
    "h1s97x/plugins/contrib-arcade-pacman",
  );
  // snake 由现有 contrib-snake 改名而来，不新建仓库
  expect(newShellNames).toHaveLength(7);
  expect(newShellNames).not.toContain("contrib-arcade-snake");
});

it("lets each renderer declare its own default palette", () => {
  expect(renderers.mosaic.defaultPalette).toBe("mosaic");
  expect(renderers.breakout.defaultPalette).toBeUndefined();
  expect(parseEntry("out.svg?renderer=mosaic")?.paletteName).toBe("mosaic");
  expect(parseEntry("out.svg?renderer=breakout")?.paletteName).toBe("default");
});

it("renders a non-game skin without a snake solver in the context", () => {
  const out = parseEntry("out.svg?renderer=mosaic")!;
  // 任意 contrib 项目的 Renderer 只需要 grid + cells，不必提供 solver 能力
  const svg = renderers.mosaic.createSvg(
    { grid, cells },
    {
      drawOptions: out.drawOptions,
      animationOptions: out.animationOptions,
      paletteName: out.paletteName,
    },
  );
  expect(svg).toContain("<svg");
});
