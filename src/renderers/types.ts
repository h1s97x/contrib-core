import type { DrawOptions } from "../render/index";
import type { Cell } from "../sources";
import type { Grid, Snake } from "../types";

export type AnimationOptions = { stepDurationMs: number };

/**
 * 一次生成的共享上下文：所有 outputs 复用同一份贡献数据。
 * getSnakeChain 是惰性的，只有需要路径的皮肤才会触发 solver。
 */
export type RenderContext = {
  grid: Grid;
  cells: Cell[];
  getSnakeChain: () => Snake[];
};

export type RenderOptions = {
  drawOptions: DrawOptions;
  animationOptions: AnimationOptions;
  /** 解析后的调色板名，皮肤据此推断暗色变体 */
  paletteName: string;
};

export type Renderer = {
  name: string;
  createSvg: (context: RenderContext, options: RenderOptions) => string;
};
