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
  expect(
    arcadeGames.filter((g) => g.status === "ready").map((g) => g.name),
  ).toEqual(["snake"]);
  expect(pendingGameNames).toHaveLength(7);
});

it("describes planned games instead of reporting them as unknown", () => {
  expect(() => resolveRenderer("breakout")).toThrow(
    /registered but not implemented/,
  );
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
