import type { DrawOptions } from "../render/index";
import type { Cell } from "../sources";
import type { Grid, Snake } from "../types";

export type AnimationOptions = { stepDurationMs: number };

/**
 * 一次生成的共享上下文：所有 outputs 复用同一份贡献数据。
 * 这里只放平台无关的通用能力，任何 contrib 项目的 Renderer 都能消费。
 */
export type RenderContext = {
  grid: Grid;
  cells: Cell[];
  /** 仅 snake 皮肤需要；不调用就不会触发 solver，其它 renderer 无需提供。 */
  getSnakeChain?: () => Snake[];
};

export type RenderOptions = {
  drawOptions: DrawOptions;
  animationOptions: AnimationOptions;
  /** 解析后的调色板名，皮肤据此推断暗色变体 */
  paletteName: string;
};

export type Renderer = {
  name: string;
  /** 自带色板的皮肤在此声明；未声明则使用平台默认色板 */
  defaultPalette?: string;
  createSvg: (context: RenderContext, options: RenderOptions) => string;
};
