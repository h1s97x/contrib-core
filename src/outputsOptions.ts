import { palettes } from "./palettes";
import type { DrawOptions } from "./render/index";
import { renderers, resolveRenderer, type RendererName } from "./renderers";
import type { AnimationOptions } from "./renderers/types";

export type { AnimationOptions } from "./renderers/types";

export type Output = {
  filename: string;
  drawOptions: DrawOptions;
  animationOptions: AnimationOptions;
  renderer: RendererName;
  paletteName: string;
};

export const parseOutputsOption = (
  lines: string[],
  defaultPalette: keyof typeof palettes = "default",
  defaultRenderer: RendererName = "snake",
) => lines.map((line) => parseEntry(line, defaultPalette, defaultRenderer));

export const parseEntry = (
  entry: string,
  defaultPalette: keyof typeof palettes = "default",
  defaultRenderer: RendererName = "snake",
): Output | null => {
  const m = entry.trim().match(/^(.+\.svg)(\?(.*)|\s*({.*}))?$/);

  if (!m) return null;

  const [, filename, , q1, q2] = m;

  const query = q1 ?? q2;

  let sp = new URLSearchParams(query || "");

  try {
    const o = JSON.parse(query);

    if (Array.isArray(o.color_dots)) o.color_dots = o.color_dots.join(",");

    sp = new URLSearchParams(o);
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
  }

  // game 是 renderer 的语义别名；显式 renderer 优先
  const renderer = resolveRenderer(
    sp.get("renderer") ?? sp.get("game") ?? defaultRenderer,
  );
  // 色板由 renderer 自己声明，不需要在这里为每种皮肤写特判
  const paletteName =
    sp.get("palette") ?? renderers[renderer].defaultPalette ?? defaultPalette;

  const drawOptions: DrawOptions = {
    sizeDotBorderRadius: 0,
    sizeCell: 16,
    sizeDot: 12,
    ...(palettes[paletteName as keyof typeof palettes] ?? palettes.default),
  };
  const animationOptions: AnimationOptions = {
    stepDurationMs: 100,
  };

  if (sp.has("color_dots")) {
    const colors = sp.get("color_dots")!.split(/[,;]/);
    drawOptions.colorDots = colors;
    drawOptions.colorEmpty = colors[0];
  }
  if (sp.has("color_snake")) drawOptions.colorSnake = sp.get("color_snake")!;
  if (sp.has("color_dot_border"))
    drawOptions.colorDotBorder = sp.get("color_dot_border")!;

  return {
    filename,
    drawOptions,
    animationOptions,
    renderer,
    paletteName,
  };
};
