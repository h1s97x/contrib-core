import type { Renderer } from "../types";
import { renderGameplay, type GameplayFactory } from "./engine";
import {
  bomberman,
  breakout,
  galaga,
  minesweeper,
  pacman,
  puzzleBobble,
  tetris,
} from "./simulations";

/** 加第 9 个游戏：在这里注册一个轨迹生成器，并在 renderers/index.ts 加一行。 */
export const gameplayFactories = {
  pacman,
  breakout,
  galaga,
  "puzzle-bobble": puzzleBobble,
  bomberman,
  minesweeper,
  tetris,
} satisfies Record<string, GameplayFactory>;

export const createGameRenderer = (
  name: string,
  factory: GameplayFactory,
): Renderer => ({
  name,
  createSvg: (context, options) =>
    renderGameplay(
      context,
      options,
      factory(context.grid, context.cells),
      name,
    ),
});

export { renderGameplay } from "./engine";
export type {
  ActorShape,
  ActorTrack,
  FrameEvent,
  Gameplay,
  GameplayFactory,
} from "./engine";
