/**
 * 8 个街机玩法的唯一清单。core 用它做参数校验与提示，scaffold 用它生成薄壳。
 * 加第 9 个游戏：在这里加一行 + 在 src/renderers/ 实现同名 renderer。
 * 注意：玩法是照规则自行实现，不复制任何第三方源码。
 */
export type GameStatus = "ready" | "planned";

export type GameMeta = {
  name: string;
  label: string;
  status: GameStatus;
  summary: string;
  /** 该游戏的薄壳仓库（CNB 路径）。snake 复用已有仓库，不新建。 */
  shellRepo: string;
};

export const arcadeGames = [
  {
    name: "pacman",
    label: "Pac-Man",
    status: "planned",
    summary: "A Pac-Man eats contribution cells while ghosts give chase.",
    shellRepo: "h1s97x/plugins/arcade-pacman",
  },
  {
    name: "breakout",
    label: "Breakout",
    status: "planned",
    summary: "A ball bounces around breaking contribution bricks.",
    shellRepo: "h1s97x/plugins/arcade-breakout",
  },
  {
    name: "galaga",
    label: "Galaga",
    status: "planned",
    summary: "A fighter ship clears the contribution grid with lasers.",
    shellRepo: "h1s97x/plugins/arcade-galaga",
  },
  {
    name: "puzzle-bobble",
    label: "Puzzle Bobble",
    status: "planned",
    summary: "Colored bubbles pop matching contribution clusters.",
    shellRepo: "h1s97x/plugins/arcade-puzzle-bobble",
  },
  {
    name: "bomberman",
    label: "Bomberman",
    status: "planned",
    summary: "Bombers blast contribution cells across the grid.",
    shellRepo: "h1s97x/plugins/arcade-bomberman",
  },
  {
    name: "minesweeper",
    label: "Minesweeper",
    status: "planned",
    summary: "A solver clears safe cells and flags guaranteed mines.",
    shellRepo: "h1s97x/plugins/arcade-minesweeper",
  },
  {
    name: "snake",
    label: "Snake",
    status: "ready",
    summary: "The original snake game: cells get eaten along a solved path.",
    shellRepo: "h1s97x/plugins/contrib-snake",
  },
  {
    name: "tetris",
    label: "Tetris",
    status: "planned",
    summary: "Falling pieces line up with the contribution grid.",
    shellRepo: "h1s97x/plugins/arcade-tetris",
  },
] as const satisfies readonly GameMeta[];

export type GameName = (typeof arcadeGames)[number]["name"];

export const gameNames = arcadeGames.map((g) => g.name) as GameName[];

export const pendingGameNames = arcadeGames
  .filter((g) => g.status === "planned")
  .map((g) => g.name) as string[];

/** 需要新建仓库的壳（snake 已有 contrib-snake，排除）。 */
export const newShellNames = arcadeGames
  .filter((g) => g.name !== "snake")
  .map((g) => g.shellRepo.split("/").at(-1)!);

export const getGame = (name: string) =>
  arcadeGames.find((g) => g.name === name.trim().toLowerCase());

/** core 仓库：GitHub 镜像供薄壳的 `uses:` 引用；CNB 仓库是 canonical。 */
export const CORE_REPO = "h1s97x/contrib-arcade-core";
export const CORE_URL = "https://github.com/h1s97x/contrib-arcade-core";
export const CORE_CNB_PATH = "h1s97x/plugins/contrib-arcade-core";
export const CNB_GROUP = "h1s97x/plugins";
