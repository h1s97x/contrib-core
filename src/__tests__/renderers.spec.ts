import { expect, it } from "bun:test";
import { gameNames } from "../games";
import { generateAnimation } from "../generate";
import { parseEntry, parseOutputsOption } from "../outputsOptions";
import { palettes } from "../palettes";
import { createSvg, type DrawOptions } from "../render";
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

const animationOptions = { stepDurationMs: 100 };
const renderOptions = (paletteName: string, drawOptions: DrawOptions) => ({
  drawOptions,
  animationOptions,
  paletteName,
});

const snakeDrawOptions = parseEntry("out.svg")!.drawOptions;
const mosaicDrawOptions = parseEntry("out.svg?renderer=mosaic")!.drawOptions;

it("registers the available skins and games", () => {
  expect(rendererNames).toContain("snake");
  expect(rendererNames).toContain("mosaic");
  for (const name of gameNames) expect(rendererNames).toContain(name);
  expect(resolveRenderer()).toBe("snake");
  expect(resolveRenderer("MOSAIC")).toBe("mosaic");
  expect(() => resolveRenderer("tree")).toThrow(/unsupported renderer/);
});

it("keeps snake as the default output", () => {
  expect(parseEntry("out.svg")?.renderer).toBe("snake");
  expect(parseEntry("out.svg")?.paletteName).toBe("default");
  expect(parseEntry("out.svg")?.drawOptions.colorDots).toEqual(
    palettes.default.colorDots,
  );
});

it("selects the skin per output and gives it its own palette", () => {
  const outputs = parseOutputsOption([
    "snake.svg",
    "mosaic.svg?renderer=mosaic",
    "mosaic-dark.svg?renderer=mosaic&palette=mosaic-dark",
  ]);
  expect(outputs.map((o) => o?.renderer)).toEqual([
    "snake",
    "mosaic",
    "mosaic",
  ]);
  expect(outputs[1]?.paletteName).toBe("mosaic");
  expect(outputs[1]?.drawOptions.colorDots).toEqual(palettes.mosaic.colorDots);
  expect(outputs[2]?.paletteName).toBe("mosaic-dark");
  expect(() => parseOutputsOption(["bad.svg?renderer=tree"])).toThrow(
    /unsupported renderer/,
  );
});

it("honours a global renderer default", () => {
  const [out] = parseOutputsOption(["out.svg"], "default", "mosaic");
  expect(out?.renderer).toBe("mosaic");
  expect(out?.paletteName).toBe("mosaic");
});

it("keeps the snake svg byte-identical through the registry", () => {
  const context = createRenderContext(grid, cells);
  const viaRegistry = renderers.snake.createSvg(
    context,
    renderOptions("default", snakeDrawOptions),
  );
  const direct = createSvg(
    grid,
    cells,
    context.getSnakeChain(),
    snakeDrawOptions,
    animationOptions,
  );
  expect(viaRegistry).toBe(direct);
  expect(context.getSnakeChain()).toBe(context.getSnakeChain());
});

it("renders every cell on the first frame with only light motion", () => {
  const context = {
    ...createRenderContext(grid, cells),
    getSnakeChain: () => {
      throw new Error("mosaic must not run the solver");
    },
  };
  const svg = renderers.mosaic.createSvg(
    context,
    renderOptions("mosaic", mosaicDrawOptions),
  );
  expect(svg).toContain("<svg");
  expect(svg).toContain("mosaic skin");
  expect((svg.match(/class="t t\d/g) ?? []).length).toBe(cells.length);
  expect(svg).toContain("prefers-color-scheme");
  expect(svg).toContain("@keyframes m-shimmer");
  expect(svg).toContain("opacity:.7");
});

it("omits the dark media block for a dark-only palette", () => {
  const context = createRenderContext(grid, cells);
  const svg = renderers.mosaic.createSvg(
    context,
    renderOptions(
      "mosaic-dark",
      parseEntry("out.svg?palette=mosaic-dark")!.drawOptions,
    ),
  );
  expect(svg).not.toContain("prefers-color-scheme");
});

it("dispatches the selected skin through the generation pipeline", async () => {
  const weeks = Array.from({ length: 8 }, (_, x) => ({
    contributionDays: Array.from({ length: 7 }, (_, y) => ({
      contributionCount: (x + y) % 5,
      contributionLevel: "FIRST_QUARTILE",
      weekday: y,
      date: "2026-01-01",
    })),
  }));
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input: string | URL | Request) =>
    new Response(
      JSON.stringify({
        data: {
          user: {
            contributionsCollection: { contributionCalendar: { weeks } },
          },
        },
      }),
      { status: 200 },
    )) as typeof fetch;
  try {
    const [svg] = await generateAnimation(
      { platform: "github", username: "h1s97x", githubToken: "fake" },
      [parseEntry("out.svg?renderer=mosaic")],
    );
    expect(svg).toContain("mosaic skin");
    expect(svg).toContain("prefers-color-scheme");
  } finally {
    globalThis.fetch = original;
  }
});
