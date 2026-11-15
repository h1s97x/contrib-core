/** core 的公共 API：薄壳无需依赖它（走 composite Action），但 fork 者可直接 import。 */
export { generateAnimation, generateSnakeAnimation } from "./generate";
export type { Output } from "./generate";
export {
  arcadeGames,
  CORE_REPO,
  CORE_URL,
  gameNames,
  getGame,
  pendingGameNames,
  shellTargets,
} from "./games";
export type { GameMeta, GameName, GameStatus } from "./games";
export { parseEntry, parseOutputsOption } from "./outputsOptions";
export type { Output as ParsedOutput } from "./outputsOptions";
export { basePalettes, palettes } from "./palettes";
export {
  createRenderContext,
  rendererNames,
  renderers,
  resolveRenderer,
} from "./renderers";
export type { RendererName } from "./renderers";
export type {
  AnimationOptions,
  RenderContext,
  RenderOptions,
  Renderer,
} from "./renderers/types";
export { getContribution, platforms } from "./sources";
export type { Cell, Platform, Source } from "./sources";
export {
  createGameRenderer,
  gameplayFactories,
  renderGameplay,
} from "./renderers/gameplay";
export type {
  ActorShape,
  ActorTrack,
  FrameEvent,
  Gameplay,
  GameplayFactory,
} from "./renderers/gameplay";
