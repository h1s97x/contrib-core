import { pendingGameNames } from "../games";
import { getPathToPose } from "../solver/getPathToPose";
import { getBestRoute } from "../solver/getBestRoute";
import { snake4 } from "../snake";
import type { Cell } from "../sources";
import type { Grid, Snake } from "../types";
import { mosaicRenderer } from "./mosaic";
import { snakeRenderer } from "./snake";
import type { RenderContext, Renderer } from "./types";

export const renderers = {
  snake: snakeRenderer,
  mosaic: mosaicRenderer,
} satisfies Record<string, Renderer>;

export type RendererName = keyof typeof renderers;

export const rendererNames = Object.keys(renderers) as RendererName[];

export const isRendererName = (value: string): value is RendererName =>
  (rendererNames as string[]).includes(value);

export const resolveRenderer = (name?: string): RendererName => {
  const value = (name ?? "").trim().toLowerCase() || "snake";
  if (pendingGameNames.includes(value))
    throw new Error(
      `game "${value}" is registered but not implemented yet; add src/renderers/${value}.ts and register it in src/renderers/index.ts`,
    );
  if (!isRendererName(value))
    throw new Error(
      `unsupported renderer "${value}" (available: ${rendererNames.join(" | ")}; planned games: ${pendingGameNames.join(" | ")})`,
    );
  return value;
};

/** 共享上下文：路径求解惰性执行，且在多个 outputs 之间只跑一次。 */
export const createRenderContext = (
  grid: Grid,
  cells: Cell[],
): RenderContext => {
  let chain: Snake[] | undefined;
  return {
    grid,
    cells,
    getSnakeChain: () => {
      if (!chain) {
        console.log("📡 computing best route");
        const route = getBestRoute(grid, snake4)!;
        route.push(...getPathToPose(route.slice(-1)[0], snake4)!);
        chain = route;
      }
      return chain;
    },
  };
};

export { mosaicRenderer, snakeRenderer };
export type {
  AnimationOptions,
  RenderContext,
  RenderOptions,
  Renderer,
} from "./types";
