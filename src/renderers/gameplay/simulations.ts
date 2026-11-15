import type { Cell } from "../../sources";
import { getColor } from "../../types";
import type { Grid } from "../../types";
import type { ActorTrack, FrameEvent, GameplayFactory } from "./engine";

/**
 * 7 个街机玩法的轨迹生成器。规则照经典玩法自行实现，不复制任何第三方源码；
 * 全部确定性、有限步数，且不改网格——只产出「哪一帧哪一格被点亮」。
 */
const END_HOLD = 8;

type Board = { w: number; h: number; level: number[][] };

const levelOf = (n: number) => Math.max(0, Math.min(4, Math.round(n)));

const boardOf = (grid: Grid, cells: Cell[]): Board => {
  const w = grid.width;
  const h = grid.height;
  const level = Array.from({ length: w }, () => Array<number>(h).fill(0));
  if (cells.length) {
    for (const c of cells)
      if (c.x >= 0 && c.x < w && c.y >= 0 && c.y < h)
        level[c.x][c.y] = levelOf(c.level);
  } else {
    for (let x = 0; x < w; x++)
      for (let y = 0; y < h; y++)
        level[x][y] = levelOf(Number(getColor(grid, x, y)));
  }
  return { w, h, level };
};

const hit = (
  events: FrameEvent[],
  frame: number,
  x: number,
  y: number,
  tone: FrameEvent["tone"] = "primary",
) => events.push({ frame, x, y, tone });

const actor = (shape: ActorTrack["shape"]): ActorTrack => ({
  shape,
  points: [],
});

/** 打砖块：球在网格内反弹，经过有贡献的格子时点亮，挡板跟随球的横坐标。 */
export const breakout: GameplayFactory = (grid, cells) => {
  const b = boardOf(grid, cells);
  const events: FrameEvent[] = [];
  const ball = actor("dot");
  const paddle = actor("bar");
  let x = Math.floor(b.w / 2);
  let y = b.h - 1;
  let dx = 1;
  let dy = -1;
  const frames = Math.min(180, Math.max(24, b.w * 3));

  for (let f = 0; f < frames; f++) {
    ball.points.push({ frame: f, x, y });
    paddle.points.push({ frame: f, x, y: b.h - 1 });
    if (b.level[x][y] > 0) hit(events, f, x, y);
    if (x + dx < 0 || x + dx >= b.w) dx = -dx;
    if (y + dy < 0 || y + dy >= b.h) dy = -dy;
    x += dx;
    y += dy;
  }
  return { totalFrames: frames + END_HOLD, events, actors: [ball, paddle] };
};

/** 太空射击：飞船在底行往返，周期性向上发射激光，命中最高的贡献格。 */
export const galaga: GameplayFactory = (grid, cells) => {
  const b = boardOf(grid, cells);
  const events: FrameEvent[] = [];
  const ship = actor("ship");
  const frames = Math.min(160, Math.max(24, b.w * 3));
  let sx = Math.floor(b.w / 2);
  let dir = 1;

  for (let f = 0; f < frames; f++) {
    ship.points.push({ frame: f, x: sx, y: b.h - 1 });
    if (f % 4 === 0) {
      let target = 0;
      for (let y = 0; y < b.h; y++)
        if (b.level[sx][y] > 0) {
          target = y;
          break;
        }
      for (let y = b.h - 1; y >= target; y--)
        hit(events, f + (b.h - 1 - y), sx, y, "secondary");
      hit(events, f + (b.h - 1 - target), sx, target);
    }
    sx += dir;
    if (sx <= 0 || sx >= b.w - 1) dir = -dir;
  }
  return { totalFrames: frames + END_HOLD, events, actors: [ship] };
};

/** 泡泡龙：从底部发射泡泡，按同贡献等级做连通簇，逐格点亮。 */
export const puzzleBobble: GameplayFactory = (grid, cells) => {
  const b = boardOf(grid, cells);
  const events: FrameEvent[] = [];
  const bubble = actor("bubble");
  const seen = new Set<string>();
  let f = 0;

  for (let x = 0; x < b.w && f < 170; x++) {
    for (let y = 0; y < b.h && f < 170; y++) {
      if (b.level[x][y] === 0 || seen.has(`${x}:${y}`)) continue;
      const level = b.level[x][y];
      const cluster: { x: number; y: number }[] = [];
      const stack = [{ x, y }];
      while (stack.length && cluster.length < 10) {
        const p = stack.pop()!;
        const key = `${p.x}:${p.y}`;
        if (seen.has(key)) continue;
        if (
          p.x < 0 ||
          p.x >= b.w ||
          p.y < 0 ||
          p.y >= b.h ||
          b.level[p.x][p.y] !== level
        )
          continue;
        seen.add(key);
        cluster.push(p);
        stack.push(
          { x: p.x + 1, y: p.y },
          { x: p.x - 1, y: p.y },
          { x: p.x, y: p.y + 1 },
          { x: p.x, y: p.y - 1 },
        );
      }
      for (let py = b.h - 1; py >= y; py--)
        bubble.points.push({ frame: f++, x, y: py });
      for (const p of cluster) hit(events, f++, p.x, p.y);
      f += 1;
    }
  }
  return { totalFrames: f + END_HOLD, events, actors: [bubble] };
};

/** 炸弹人：固定间隔放置炸弹，爆炸沿十字方向逐圈扩散。 */
export const bomberman: GameplayFactory = (grid, cells) => {
  const b = boardOf(grid, cells);
  const events: FrameEvent[] = [];
  const bomb = actor("cross");
  let f = 0;

  for (let x = 1; x < b.w && f < 170; x += 3) {
    const y = (x % 2 === 0 ? 2 : 4) % b.h;
    bomb.points.push({ frame: f, x, y });
    hit(events, f, x, y, "secondary");
    f += 2;
    for (let r = 1; r <= 2; r++) {
      for (const [dx, dy] of [
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r],
      ]) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < b.w && py >= 0 && py < b.h) hit(events, f, px, py);
      }
      f += 1;
    }
    f += 2;
  }
  return { totalFrames: f + END_HOLD, events, actors: [bomb] };
};

/** 扫雷：从左到右揭开全部格子，高贡献格标为「旗」色。 */
export const minesweeper: GameplayFactory = (grid, cells) => {
  const b = boardOf(grid, cells);
  const events: FrameEvent[] = [];
  const cursor = actor("dot");
  let f = 0;

  for (let x = 0; x < b.w; x++) {
    for (let y = 0; y < b.h; y++) {
      const frame = Math.floor(f / 3);
      hit(events, frame, x, y, b.level[x][y] >= 3 ? "secondary" : "primary");
      f++;
      if (f % 3 === 0) cursor.points.push({ frame, x, y });
    }
  }
  return {
    totalFrames: Math.ceil(f / 3) + END_HOLD,
    events,
    actors: [cursor],
  };
};

/** 俄罗斯方块：竖条逐列下落，累计两次触底触发一次整行「消行」高亮。 */
export const tetris: GameplayFactory = (grid, cells) => {
  const b = boardOf(grid, cells);
  const events: FrameEvent[] = [];
  const piece = actor("bar");
  const filled = Array<number>(b.w).fill(0);
  let f = 0;

  for (let col = 0; col < b.w && f < 170; col += 2) {
    for (let y = 0; y < b.h; y++) {
      piece.points.push({ frame: f, x: col, y });
      hit(events, f, col, y, "secondary");
      f++;
    }
    hit(events, f - 1, col, b.h - 1);
    filled[col]++;
    if (filled[col] >= 2) {
      for (let x = 0; x < b.w; x++)
        hit(events, f + Math.floor(x / 8), x, b.h - 1);
      filled[col] = 0;
      f += Math.ceil(b.w / 8);
    }
    f += 1;
  }
  return { totalFrames: f + END_HOLD, events, actors: [piece] };
};

/** 吃豆人：蛇形路径遍历棋盘，幽灵延迟 6 帧跟随；高贡献格是「能量豆」。 */
export const pacman: GameplayFactory = (grid, cells) => {
  const b = boardOf(grid, cells);
  const events: FrameEvent[] = [];
  const pac = actor("bubble");
  const ghost = actor("ghost");
  const path: { x: number; y: number }[] = [];

  for (let x = 0; x < b.w; x++)
    for (let i = 0; i < b.h; i++)
      path.push({ x, y: x % 2 === 0 ? i : b.h - 1 - i });

  const frames = Math.min(path.length, 170);
  for (let f = 0; f < frames; f++) {
    const p = path[f];
    pac.points.push({ frame: f, x: p.x, y: p.y });
    if (f >= 6)
      ghost.points.push({ frame: f, x: path[f - 6].x, y: path[f - 6].y });
    hit(events, f, p.x, p.y, b.level[p.x][p.y] >= 3 ? "primary" : "secondary");
  }
  return { totalFrames: frames + END_HOLD, events, actors: [pac, ghost] };
};
