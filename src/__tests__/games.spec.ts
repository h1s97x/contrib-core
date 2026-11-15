import { expect, it } from "bun:test";
import { arcadeGames, gameNames, getGame, pendingGameNames } from "../games";
import { parseEntry } from "../outputsOptions";
import { resolveRenderer } from "../renderers";

it("lists exactly the eight arcade games", () => {
  expect(gameNames).toEqual([
    "pacman",
    "breakout",
    "galaga",
    "puzzle-bobble",
    "bomberman",
    "minesweeper",
    "snake",
    "tetris",
  ]);
  expect(arcadeGames).toHaveLength(8);
  expect(arcadeGames.every((g) => g.status === "ready")).toBe(true);
  expect(pendingGameNames).toHaveLength(0);
});

it("resolves every game and rejects unknown renderers", () => {
  for (const name of gameNames) expect(resolveRenderer(name)).toBe(name);
  expect(() => resolveRenderer("tree")).toThrow(/unsupported renderer/);
  expect(getGame("Galaga")?.label).toBe("Galaga");
});

it("accepts game as an alias of renderer", () => {
  expect(parseEntry("out.svg?game=mosaic")?.renderer).toBe("mosaic");
  expect(parseEntry("out.svg?game=mosaic")?.paletteName).toBe("mosaic");
  expect(parseEntry("out.svg?renderer=snake&game=mosaic")?.renderer).toBe(
    "snake",
  );
});
