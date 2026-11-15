import { cellsToGrid } from "./cellsToGrid";
import type { DrawOptions } from "./render/index";
import {
  createRenderContext,
  renderers,
  resolveRenderer,
  type RendererName,
} from "./renderers";
import type { AnimationOptions } from "./renderers/types";
import { getContribution, type Source } from "./sources";

export { basePalettes, palettes } from "./palettes";
export { platforms, getContribution } from "./sources";
export type { Cell, Platform, Source } from "./sources";
export { rendererNames, renderers, resolveRenderer } from "./renderers";
export type { RendererName } from "./renderers";
export type { AnimationOptions, Renderer } from "./renderers/types";

export type Output = {
  drawOptions: DrawOptions;
  animationOptions: AnimationOptions;
  renderer?: RendererName;
  paletteName?: string;
  filename?: string;
};

export const generateAnimation = async (
  source: Source,
  outputs: (Output | null)[],
) => {
  console.log(`🎣 fetching user contribution from ${source.platform}`);
  const cells = await getContribution(source);
  const grid = cellsToGrid(cells);
  const context = createRenderContext(grid, cells);

  return Promise.all(
    outputs.map(async (out, i) => {
      if (!out) return;
      const { drawOptions, animationOptions } = out;
      console.log(`🖌 creating svg (outputs[${i}])`);
      return renderers[resolveRenderer(out.renderer)].createSvg(context, {
        drawOptions,
        animationOptions,
        paletteName: out.paletteName ?? "default",
      });
    }),
  );
};

/** 兼容旧 API：默认皮肤仍是 snake，输出字节不变。 */
export const generateSnakeAnimation = generateAnimation;
