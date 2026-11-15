import { basePalettes } from "../../palettes";
import type { DrawOptions } from "../../render";
import { createAnimation, minifyCss } from "../../render/css-utils";
import { h } from "../../render/xml-utils";
import type { Cell } from "../../sources";
import { getColor } from "../../types";
import type { Grid } from "../../types";
import type { RenderContext, RenderOptions } from "../types";

/**
 * 共享的街机帧动画引擎。玩法只描述「哪一帧、哪一格、发生什么」，
 * 网格、配色、明暗主题、角色层与 CSS 动画编译全部在这里统一完成。
 * 与上游每个游戏各写一份 SVG 渲染器不同，这里 53×7 的结构只画一次。
 */
export type FrameEvent = {
  frame: number;
  x: number;
  y: number;
  tone?: "primary" | "secondary";
};

export type ActorShape = "dot" | "bar" | "ship" | "bubble" | "cross" | "ghost";

export type ActorTrack = {
  shape: ActorShape;
  points: { frame: number; x: number; y: number }[];
};

export type Gameplay = {
  /** 有限步数；末尾留出定格帧，让循环回到完整棋盘 */
  totalFrames: number;
  events: FrameEvent[];
  actors?: ActorTrack[];
};

export type GameplayFactory = (grid: Grid, cells: Cell[]) => Gameplay;

type Palette = (typeof basePalettes)[keyof typeof basePalettes];
type Theme = {
  bg: string;
  border: string;
  dots: string[];
  primary: string;
  secondary: string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const dotsOf = (colorEmpty: string, colorDots: DrawOptions["colorDots"]) => {
  const byIndex = new Map(
    Object.entries(colorDots).map(([k, v]) => [Number(k), String(v)]),
  );
  return Array.from({ length: 5 }, (_, i) =>
    i === 0 ? colorEmpty : (byIndex.get(i) ?? byIndex.get(0) ?? colorEmpty),
  );
};

const themeOf = (o: DrawOptions): Theme => {
  const dots = dotsOf(o.colorEmpty, o.colorDots);
  return {
    bg: o.colorBackground ?? "#ffffff",
    border: o.colorDotBorder,
    dots,
    primary: o.colorSnake,
    secondary: dots[4],
  };
};

const darkThemeOf = (paletteName: string, o: DrawOptions): Theme => {
  const stem = paletteName.replace(/-(light|dark)$/, "");
  const p: Palette =
    (basePalettes as Record<string, Palette>)[`${stem}-dark`] ??
    basePalettes["github-dark"];
  return {
    bg: p.colorBackground,
    border: p.colorDotBorder,
    dots: [...p.colorDots],
    primary: o.colorSnake,
    secondary: p.colorDots[4],
  };
};

const vars = (t: Theme) =>
  `:root{--gb:${t.bg};--gt:${t.border};--gp:${t.primary};--gs:${t.secondary};${t.dots
    .map((c, i) => `--g${i}:${c};`)
    .join("")}}`;

const shapeOf = (shape: ActorShape, cell: number, dot: number) => {
  const s = dot * 0.72;
  switch (shape) {
    case "bar":
      return {
        w: cell * 2.2,
        h: dot * 0.34,
        r: 2,
        ox: -cell * 0.6,
        oy: dot * 0.33,
      };
    case "ship":
      return {
        w: dot,
        h: dot * 0.62,
        r: 2,
        ox: (cell - dot) / 2,
        oy: dot * 0.19,
      };
    default:
      return {
        w: s,
        h: s,
        r: shape === "cross" ? 2 : s / 2,
        ox: (cell - s) / 2,
        oy: (cell - s) / 2,
      };
  }
};

export const renderGameplay = (
  context: RenderContext,
  options: RenderOptions,
  gameplay: Gameplay,
  name: string,
): string => {
  const { grid } = context;
  const { drawOptions, animationOptions, paletteName } = options;
  const { sizeCell, sizeDot } = drawOptions;
  const width = (grid.width + 2) * sizeCell;
  const height = (grid.height + 4) * sizeCell;
  const left = -sizeCell;
  const top = -2 * sizeCell;
  const total = Math.max(1, gameplay.totalFrames);
  const duration = Math.max(4000, total * animationOptions.stepDurationMs);
  const isDarkOnly = /-dark$/.test(paletteName);
  const light = themeOf(drawOptions);
  const dark = darkThemeOf(paletteName, drawOptions);

  // 静态首帧：所有格子都按贡献等级着色，是一张完整的年度图。
  const cells = context.cells.length
    ? context.cells.map((c) => ({ x: c.x, y: c.y, level: c.level }))
    : Array.from({ length: grid.width }, (_, x) =>
        Array.from({ length: grid.height }, (_, y) => ({
          x,
          y,
          level: Number(getColor(grid, x, y)),
        })),
      ).flat();

  const eventsByCell = new Map<string, FrameEvent[]>();
  for (const e of gameplay.events) {
    if (e.x < 0 || e.y < 0 || e.x >= grid.width || e.y >= grid.height) continue;
    const key = `${e.x}:${e.y}`;
    const list = eventsByCell.get(key) ?? [];
    list.push(e);
    eventsByCell.set(key, list);
  }

  const styles: string[] = [
    `.bg{fill:var(--gb)}`,
    `.g{stroke:var(--gt);stroke-width:1;shape-rendering:geometricPrecision}`,
    ...[0, 1, 2, 3, 4].map((i) => `.l${i}{fill:var(--g${i})}`),
    `@media (prefers-reduced-motion: reduce){.g,.a{animation:none}}`,
  ];
  const elements: string[] = [
    h("rect", { class: "bg", x: left, y: top, width, height }),
  ];

  const m = (sizeCell - sizeDot) / 2;
  const rx = drawOptions.sizeDotBorderRadius || Math.min(3, sizeDot * 0.2);
  let id = 0;

  for (const c of cells) {
    const l = Math.max(0, Math.min(4, Math.round(c.level)));
    const events = eventsByCell.get(`${c.x}:${c.y}`) ?? [];
    const active = events.length > 0;
    elements.push(
      h("rect", {
        class: `g l${l}${active ? ` e${id}` : ""}`,
        x: (c.x * sizeCell + m).toFixed(1),
        y: (c.y * sizeCell + m).toFixed(1),
        width: sizeDot,
        height: sizeDot,
        rx,
      }),
    );

    if (!active) continue;
    // 命中只让格子短暂换成角色色，随后恢复原色：任意一帧都还是完整棋盘。
    const base = `fill:var(--g${l})`;
    const keyframes: { t: number; style: string }[] = [
      { t: 0, style: base },
      { t: 1, style: base },
    ];
    for (const e of events) {
      const hi = e.tone === "secondary" ? "var(--gs)" : "var(--gp)";
      // 第 0 帧永远保留原始配色，保证静态首帧是一张纯粹的成品图
      const frame = Math.max(1, e.frame);
      keyframes.push(
        { t: clamp01((frame - 0.5) / total), style: base },
        { t: clamp01(frame / total), style: `fill:${hi}` },
        { t: clamp01((frame + 2) / total), style: base },
      );
    }
    keyframes.sort((a, b) => a.t - b.t);
    styles.push(createAnimation(`e${id}`, keyframes));
    styles.push(`.e${id}{animation:e${id} ${duration}ms linear infinite}`);
    id++;
  }

  (gameplay.actors ?? []).forEach((actor, i) => {
    if (!actor.points.length) return;
    const d = shapeOf(actor.shape, sizeCell, sizeDot);
    const at = (p: { x: number; y: number }) =>
      `transform:translate(${(p.x * sizeCell + d.ox).toFixed(1)}px,${(p.y * sizeCell + d.oy).toFixed(1)}px)`;
    elements.push(
      h("rect", {
        class: `a a${i}`,
        x: 0,
        y: 0,
        width: d.w.toFixed(1),
        height: d.h.toFixed(1),
        rx: d.r.toFixed(1),
        style: at(actor.points[0]),
      }),
    );
    const frames = actor.points.map((p) => ({
      t: clamp01(p.frame / total),
      style: at(p),
    }));
    frames.push({ t: 1, style: at(actor.points[actor.points.length - 1]) });
    styles.push(createAnimation(`a${i}`, frames));
    styles.push(
      `.a${i}{fill:var(--gp);animation:a${i} ${duration}ms linear infinite}`,
    );
  });

  const css = [
    vars(light),
    isDarkOnly ? "" : `@media (prefers-color-scheme: dark){${vars(dark)}}`,
    ...styles,
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
    `<desc>Generated with https://github.com/h1s97x/contrib-core (${name} gameplay, rules reimplemented from scratch)</desc>`,
    `<style>${minifyCss(css)}</style>`,
    ...elements,
    "</svg>",
  ].join("");
};
