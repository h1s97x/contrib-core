import { basePalettes } from "../palettes";
import type { DrawOptions } from "../render/index";
import { minifyCss } from "../render/css-utils";
import { h } from "../render/xml-utils";
import { getColor } from "../types";
import type { Renderer } from "./types";

type Palette = (typeof basePalettes)[keyof typeof basePalettes];
type Theme = { bg: string; border: string; dots: string[] };

// 一格 → 一块方砖：等级只改变砖的大小与颜色，53×7 的结构不丢
const TILE_SCALE = [0.44, 0.58, 0.72, 0.86, 0.96];
const BREATH_GROUPS = 6;
const SHIMMER_MS = 14000;

const dotsOf = (colorEmpty: string, colorDots: DrawOptions["colorDots"]) => {
  const byIndex = new Map(
    Object.entries(colorDots).map(([key, value]) => [
      Number(key),
      String(value),
    ]),
  );
  return Array.from({ length: 5 }, (_, i) =>
    i === 0 ? colorEmpty : (byIndex.get(i) ?? byIndex.get(0) ?? colorEmpty),
  );
};

const themeFromDrawOptions = (o: DrawOptions): Theme => ({
  bg: o.colorBackground ?? "#fbfaf7",
  border: o.colorDotBorder,
  dots: dotsOf(o.colorEmpty, o.colorDots),
});

const themeFromPalette = (p: Palette): Theme => ({
  bg: p.colorBackground,
  border: p.colorDotBorder,
  dots: [...p.colorDots],
});

/** 由调色板名推断暗色变体；找不到时回落到内置的柔和暗色。 */
const darkPalette = (name: string): Palette => {
  const stem = name.replace(/-(light|dark)$/, "");
  return (
    (basePalettes as Record<string, Palette>)[`${stem}-dark`] ??
    basePalettes["mosaic-dark"]
  );
};

const vars = (t: Theme) =>
  `:root{--mb:${t.bg};--mt:${t.border};${t.dots
    .map((c, i) => `--m${i}:${c};`)
    .join("")}}`;

/**
 * mosaic：静态首帧就是完整的年度马赛克，动画只是一道柔光扫过和最高
 * 贡献格的轻微呼吸；停在任意帧都是成品，且单文件自带明暗主题。
 */
export const mosaicRenderer: Renderer = {
  name: "mosaic",
  defaultPalette: "mosaic",
  createSvg: (context, { drawOptions, paletteName }) => {
    const { grid } = context;
    const { sizeCell } = drawOptions;
    const width = (grid.width + 2) * sizeCell;
    const height = (grid.height + 4) * sizeCell;
    const left = -sizeCell;
    const top = -2 * sizeCell;
    const shimmerWidth = Math.round(width * 0.45);
    const isDarkOnly = /-dark$/.test(paletteName);

    const light = themeFromDrawOptions(drawOptions);
    const fallbackDark = darkPalette(paletteName);
    const dark: Theme = drawOptions.dark
      ? {
          bg: fallbackDark.colorBackground,
          border:
            drawOptions.dark.colorDotBorder ?? fallbackDark.colorDotBorder,
          dots: dotsOf(drawOptions.dark.colorEmpty, drawOptions.dark.colorDots),
        }
      : themeFromPalette(fallbackDark);

    const points = context.cells.length
      ? context.cells.map(({ x, y, level }) => ({ x, y, level }))
      : Array.from({ length: grid.width }, (_, x) =>
          Array.from({ length: grid.height }, (_, y) => ({
            x,
            y,
            level: Number(getColor(grid, x, y)),
          })),
        ).flat();

    const tiles = points.map(({ x, y, level }) => {
      const l = Math.max(0, Math.min(4, Math.round(level)));
      const s = sizeCell * TILE_SCALE[l];
      const m = (sizeCell - s) / 2;
      return h("rect", {
        class: `t t${l} d${x % BREATH_GROUPS}`,
        x: (x * sizeCell + m).toFixed(1),
        y: (y * sizeCell + m).toFixed(1),
        width: s.toFixed(1),
        height: s.toFixed(1),
        rx: (s * (l >= 3 ? 0.32 : 0.24)).toFixed(1),
      });
    });

    const styles = [
      `.bg{fill:var(--mb)}`,
      `.t{stroke:var(--mt);stroke-width:1;shape-rendering:geometricPrecision}`,
      ...TILE_SCALE.map((_, i) => `.t${i}{fill:var(--m${i})}`),
      `.t4{animation:m-breathe 6s ease-in-out infinite}`,
      ...Array.from(
        { length: BREATH_GROUPS - 1 },
        (_, i) => `.d${i + 1}{animation-delay:-${i + 1}s}`,
      ),
      `@keyframes m-breathe{0%,100%{opacity:1}50%{opacity:.7}}`,
      `.shimmer{fill:url(#m-shimmer);pointer-events:none;animation:m-shimmer ${SHIMMER_MS}ms linear infinite}`,
      `@keyframes m-shimmer{from{transform:translateX(0px)}to{transform:translateX(${width + shimmerWidth}px)}}`,
      `@media (prefers-reduced-motion: reduce){.t4,.shimmer{animation:none}}`,
      vars(light),
      isDarkOnly ? "" : `@media (prefers-color-scheme: dark){${vars(dark)}}`,
    ]
      .filter(Boolean)
      .join("\n");

    return [
      h("svg", {
        viewBox: [left, top, width, height].join(" "),
        width,
        height,
        xmlns: "http://www.w3.org/2000/svg",
      }).replace("/>", ">"),
      "<desc>Generated with https://github.com/h1s97x/contrib-snake (mosaic skin)</desc>",
      '<defs><linearGradient id="m-shimmer" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ffffff" stop-opacity="0"/><stop offset="50%" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>',
      `<style>${minifyCss(styles)}</style>`,
      h("rect", { class: "bg", x: left, y: top, width, height }),
      ...tiles,
      h("rect", {
        class: "shimmer",
        x: left - shimmerWidth,
        y: top,
        width: shimmerWidth,
        height,
      }),
      "</svg>",
    ].join("");
  },
};
