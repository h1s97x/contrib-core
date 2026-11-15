# Contributing

Thanks for your interest in improving **contrib-core**! This document
explains how to set up a development environment, run the project, and what to
expect when you open an issue or a pull request.

## Development setup

The core is built with [Bun](https://bun.sh). Generating an SVG from a real
contribution graph also requires a token for the platform you query.

```bash
# install dependencies
bun install

# type-check
bun run type

# formatter / linter check
bun run lint

# run the test suite
bun test
```

## Generating a snake locally

The CLI reads `platform`, `user` and the matching token from command-line flags,
`INPUT_*` (GitHub Action style) or `PLUGIN_*` (CNB plugin style) variables.
`github_user_name` / `--github_user` are kept as legacy aliases.

```bash
# github
bun src/cli.ts --platform=github --user=<your-name> --github_token=<token> \
  --output=dist/github-snake.svg \
  --output=dist/github-snake-dark.svg?palette=github-dark

# cnb
CNB_TOKEN=<token> bun src/cli.ts --platform=cnb --user=<your-name> \
  --output=dist/cnb.svg

# via Action-style environment variables
INPUT_PLATFORM=github \
INPUT_USER_NAME=<your-name> \
INPUT_GITHUB_TOKEN=<token> \
INPUT_OUTPUTS=$'dist/github-snake.svg\ndist/github-snake-dark.svg?palette=github-dark' \
bun src/cli.ts
```

> Without a token the GitHub GraphQL API returns `401`, so a real generation
> needs a personal access token with read access to your contribution calendar.
> CNB pipelines inject `CNB_TOKEN` automatically.

## Project layout

- `src/cli.ts` — entry point (GitHub Action + CNB plugin + CLI).
- `src/sources/` — platform adapters; each one produces the same `Cell[]`.
  `github.ts` (GraphQL), `cnb.ts` (calendar API), `gitlab.ts` (`calendar.json`),
  `daily.ts` (date-keyed grid helper), `index.ts` (dispatch).
- `src/generate.ts` — orchestration: fetch → shared render context → SVG.
- `src/renderers/` — skin registry; `snake.ts` and `mosaic.ts` implement the
  `Renderer` contract, `index.ts` resolves names and builds the shared context.
- `src/solver/` — computes the snake path that "eats" the contribution cells
  (only the `snake` skin needs it).
- `src/render/` — the original snake SVG renderer, kept byte-for-byte.
- `src/palettes.ts`, `src/outputsOptions.ts` — color / output configuration.
- `src/games.ts` — the eight game names / statuses, shared with the scaffold.
- `src/index.ts` — public API for forks.
- `scripts/scaffold-shells.ts`, `templates/shell/` — generate the 8 thin shells.
- `action.yml` — GitHub Action definition.
- `Dockerfile`, `entrypoint.sh` — CNB Docker plugin.

## Adding a renderer (any contrib project)

Add `src/renderers/<name>.ts` exporting a `Renderer` and register it in
`src/renderers/index.ts`. The contract is small:

- `RenderContext` gives you `grid` and `cells`. `getSnakeChain()` is optional —
  only the `snake` skin needs the solver.
- `Renderer` needs `name`, `createSvg(context, options) => string`, and an
  optional `defaultPalette` if it ships its own colors (see `mosaic`).
- `RenderOptions` carries `drawOptions`, `animationOptions` and `paletteName`.

For grid-based output, `renderGameplay()` in `src/renderers/gameplay/` compiles
a `Gameplay` (frames + cell events + actor tracks) into a complete SVG. For
non-grid output (3D, tree, sequencer), just build your own SVG string —
`mosaic` does exactly that. Cover it with an offline test in `src/__tests__/`.

`src/games.ts` (`shellTargets`) is a **distribution list**, not the renderer
catalog: it only says which games get their own thin-shell repo. Registering a
renderer from any other contrib project does not require touching it.

## Adding an arcade game shell

To give a ninth arcade game its own repository:

1. Add one entry to `shellTargets` with `status: "planned"`.
2. Implement `src/renderers/gameplay/simulations.ts` + register the renderer,
   then flip the status to `ready`.
3. Run `bun run scaffold` — a new thin shell is generated automatically.
4. Cover the renderer with an offline test in `src/__tests__/`.

Game rules are re-implemented from scratch; do not copy third-party source.
`mosaic` is deliberately not in `shellTargets`: it is a skin, not a game.

## Adding a platform

Add `src/sources/<platform>.ts` returning `Promise<Cell[]>`, register it in
`src/sources/types.ts` and `src/sources/index.ts`, add palettes, and cover the
adapter with an offline test in `src/__tests__/`.

## Repository sync

CNB (`h1s97x/plugins/contrib-core`) is the source of truth; GitHub
(`h1s97x/contrib-core`) is the mirror for the Action / Marketplace.

- **CNB → GitHub**: `.cnb.yml` `main.push` syncs on every push (credentials come
  from the `h1s97x/secret-env` key repository).
- **GitHub → CNB**: `.github/workflows/sync-cnb.yml` is the fallback for edits
  made directly on GitHub. It needs a `CNB_TOKEN` repository secret on GitHub
  with `repo-code:rw` (_Settings → Secrets and variables → Actions_); without it
  the workflow skips with a notice instead of failing.
- **Plugin image**: pushing a tag runs the `tag_push` pipeline in `.cnb.yml` and
  publishes `docker.cnb.cool/h1s97x/plugins/contrib-core:latest`.

## Contribution policy

This project is open to contributions.

- **Issues** and **pull requests** are both welcome.
- Fork the repo, make your change, and open a PR against `main`.
- Keep changes focused and add or adjust tests where relevant.
- For larger or API/rendering changes, opening an issue first to discuss is
  appreciated but not required.

## Running the tests

Most tests are offline (they render synthetic grids and mock the platform
APIs). One integration test fetches a real GitHub contribution graph and
therefore needs `GITHUB_TOKEN` to pass.
