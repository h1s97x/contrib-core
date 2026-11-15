/**
 * 街机系列的「薄壳分发清单」：哪些玩法需要独立仓库、实现状态如何。
 *
 * 这不是渲染器清单。core 的渲染器注册表在 src/renderers/index.ts，任意
 * contrib 项目（tree / 3d / sequencer / space-invaders ...）都能注册自己的
 * Renderer，不必加入本清单；只有需要独立薄壳仓库时才在这里加一行。
 * 玩法规则照经典玩法自行实现，不复制任何第三方源码。
 */
export type GameStatus = "ready" | "planned";

export type GameMeta = {
  name: string;
  label: string;
  status: GameStatus;
  summary: string;
  /** 该游戏的薄壳仓库（CNB 路径） */
  shellRepo: string;
};

export const arcadeGames = [
  {
    name: "pacman",
    label: "Pac-Man",
    status: "ready",
    summary: "A Pac-Man eats contribution cells while ghosts give chase.",
    shellRepo: "h1s97x/plugins/contrib-arcade-pacman",
  },
  {
    name: "breakout",
    label: "Breakout",
    status: "ready",
    summary: "A ball bounces around breaking contribution bricks.",
    shellRepo: "h1s97x/plugins/contrib-arcade-breakout",
  },
  {
    name: "galaga",
    label: "Galaga",
    status: "ready",
    summary: "A fighter ship clears the contribution grid with lasers.",
    shellRepo: "h1s97x/plugins/contrib-arcade-galaga",
  },
  {
    name: "puzzle-bobble",
    label: "Puzzle Bobble",
    status: "ready",
    summary: "Colored bubbles pop matching contribution clusters.",
    shellRepo: "h1s97x/plugins/contrib-arcade-puzzle-bobble",
  },
  {
    name: "bomberman",
    label: "Bomberman",
    status: "ready",
    summary: "Bombers blast contribution cells across the grid.",
    shellRepo: "h1s97x/plugins/contrib-arcade-bomberman",
  },
  {
    name: "minesweeper",
    label: "Minesweeper",
    status: "ready",
    summary: "A solver clears safe cells and flags guaranteed mines.",
    shellRepo: "h1s97x/plugins/contrib-arcade-minesweeper",
  },
  {
    name: "snake",
    label: "Snake",
    status: "ready",
    summary: "The original snake game: cells get eaten along a solved path.",
    shellRepo: "h1s97x/plugins/contrib-arcade-snake",
  },
  {
    name: "tetris",
    label: "Tetris",
    status: "ready",
    summary: "Falling pieces line up with the contribution grid.",
    shellRepo: "h1s97x/plugins/contrib-arcade-tetris",
  },
] as const satisfies readonly GameMeta[];

/** 语义化别名：这份清单描述「要生成哪些壳」，不是全部渲染器。 */
export const shellTargets = arcadeGames;

export type GameName = (typeof arcadeGames)[number]["name"];

export const gameNames = arcadeGames.map((g) => g.name) as GameName[];

// 显式放宽到 GameMeta，保留「未来加入 planned 游戏」的类型空间
export const pendingGameNames = (arcadeGames as readonly GameMeta[])
  .filter((g) => g.status === "planned")
  .map((g) => g.name);

/** 需要独立分发仓库的壳清单；由 publish-shells.sh 按 tag 发布。 */
export const newShellNames = (shellTargets as readonly GameMeta[])
  .filter((g) => g.name !== "snake")
  .map((g) => g.shellRepo.split("/").at(-1)!);

export const getGame = (name: string) =>
  arcadeGames.find((g) => g.name === name.trim().toLowerCase());

/** core 是通用运行时，服务所有 contrib 项目，不限于这 8 个街机游戏。 */
export const CORE_REPO = "h1s97x/contrib-core";
export const CORE_URL = "https://github.com/h1s97x/contrib-core";
export const CORE_CNB_PATH = "h1s97x/plugins/contrib-core";
export const CNB_GROUP = "h1s97x/plugins";
