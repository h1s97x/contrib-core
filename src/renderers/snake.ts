import { createSvg } from "../render/index";
import type { Renderer } from "./types";

/** 默认皮肤：沿用原有 renderer，输出保持字节级一致。 */
export const snakeRenderer: Renderer = {
  name: "snake",
  createSvg: (context, { drawOptions, animationOptions }) =>
    createSvg(
      context.grid,
      context.cells,
      context.getSnakeChain!(),
      drawOptions,
      animationOptions,
    ),
};
