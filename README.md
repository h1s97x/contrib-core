# contrib-arcade-core

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/h1s97x/contrib-arcade-core/main.yml?label=action&style=flat-square)](https://github.com/h1s97x/contrib-arcade-core/actions/workflows/main.yml)
[![GitHub release](https://img.shields.io/github/release/h1s97x/contrib-arcade-core.svg?style=flat-square)](https://github.com/h1s97x/contrib-arcade-core/releases/latest)
![type definitions](https://img.shields.io/npm/types/typescript?style=flat-square)
![code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)

The **core** repository: the only place with game code. It turns a contribution
grid into an animated SVG, owns the platform adapters (**GitHub**, **CNB**,
**GitLab**), palettes, the renderer registry, CLI, Action, CNB plugin, CI and
the templates that generate the eight thin game shells.

Canonical repository: `h1s97x/plugins/contrib-arcade-core` (CNB). The GitHub
mirror `h1s97x/contrib-arcade-core` is what the shells' `uses:` lines point at;
it must be created separately (this environment has no GitHub credentials).

This repository is **not** a game shell. The existing
`h1s97x/plugins/contrib-snake` repository is the `snake` shell. See
[Architecture](#architecture-core--thin-shells).

<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="https://raw.githubusercontent.com/h1s97x/h1s97x/main/snake-dark.svg"
  />
  <source
    media="(prefers-color-scheme: light)"
    srcset="https://raw.githubusercontent.com/h1s97x/h1s97x/main/snake.svg"
  />
  <img
    alt="github contribution grid snake animation"
    src="https://raw.githubusercontent.com/h1s97x/h1s97x/main/snake.svg"
  />
</picture>

Pull a user's contribution graph and write it as an animated
[svg](https://raw.githubusercontent.com/h1s97x/h1s97x/main/snake.svg). The
default skin plays a snake game over the cells; `mosaic` turns the very same
cells into a finished-looking picture. Colors can be customized via the
`outputs` option.

## Supported platforms

| `platform` | Data source                                  | Token                                                                | Default palette |
| ---------- | -------------------------------------------- | -------------------------------------------------------------------- | --------------- |
| `github`   | GitHub GraphQL `contributionsCollection`     | `github_token` (defaults to the action token)                        | `github`        |
| `cnb`      | `https://api.cnb.cool/users/{user}/calendar` | `CNB_TOKEN` / `cnb_token`                                            | `cnb`           |
| `gitlab`   | `{base}/users/{user}/calendar.json`          | optional `GITLAB_TOKEN` / `gitlab_token` (for private contributions) | `gitlab`        |

All adapters produce the same `Cell[]` shape, so the skins are completely
platform independent. See [Adding a platform](#adding-a-platform).

## Skins

Both skins consume the same `Cell[]` and the same 53×7 calendar. Set `renderer`
globally, or per output with `?renderer=<name>` (the per-output value wins).

- **`snake` (default)** — the original snake game, byte-identical to previous
  releases. Needs the path solver.
- **`mosaic`** — a low-saturation mosaic of the year. Every cell stays in
  place, the static first frame is already the finished picture, and the only
  motion is a soft shimmer plus a gentle pulse on the busiest days. It carries
  both light and dark themes in one SVG and skips the solver entirely.

`mosaic` defaults to its own `mosaic` / `mosaic-dark` palettes; any other
`?palette=` still works. A `-dark` palette produces a dark-only SVG for
`<picture>`, otherwise the single file switches theme by itself.

```yaml
# one run, both skins
outputs: |
  snake.svg
  snake-dark.svg?palette=github-dark
  mosaic.svg?renderer=mosaic
```

## Architecture: core + thin shells

This repository is the **core** — the only place with game code. The eight
**thin shells** are generated from `templates/shell/`: each is a separate
repository with its own README, issues, preview and maintainers, but fixes one
`renderer` and forwards everything else to the core Action. No game logic is
duplicated. The existing `h1s97x/plugins/contrib-snake` repository is the
`snake` shell; it no longer contains any core source.

| Game          | Shell repo (CNB)                          | Status  |
| ------------- | ----------------------------------------- | ------- |
| Pac-Man       | `h1s97x/plugins/arcade-pacman`            | ready   |
| Breakout      | `h1s97x/plugins/arcade-breakout`          | ready   |
| Galaga        | `h1s97x/plugins/arcade-galaga`            | ready   |
| Puzzle Bobble | `h1s97x/plugins/arcade-puzzle-bobble`     | ready   |
| Bomberman     | `h1s97x/plugins/arcade-bomberman`         | ready   |
| Minesweeper   | `h1s97x/plugins/arcade-minesweeper`       | ready   |
| Snake         | `h1s97x/plugins/contrib-snake` (existing) | ready   |
| Tetris        | `h1s97x/plugins/arcade-tetris`            | ready   |

`mosaic` stays a skin in the core rather than becoming a ninth shell.

Generate all eight locally (the output is git-ignored):

```bash
bun run scaffold                                   # writes shells/
bun scripts/scaffold-shells.ts --out=/tmp/shells --owner=<your-name>
```

`scripts/create-shell-repos.sh` creates the core repo plus the seven new shell
repos on CNB and pushes their initial contents. It needs a `CNB_TOKEN` with
`group-resource:rw`: the pipeline token currently has only `repo-code` scope and
gets `403 / errcode 10023`, so run it with a properly scoped token or after
`cnb login`. The GitHub mirror `h1s97x/contrib-arcade-core` must exist before
the shells' `uses:` lines resolve.

Two things make this cheap to extend:

- **Ninth game**: add one line to `src/games.ts`, implement its renderer, and
  re-run `bun run scaffold`. A new shell appears automatically.
- **Upgrade all shells**: change `templates/shell/` once and re-run. No need to
  edit eight repositories, and a fork only has to change the `uses:` line in its
  own `action.yml` to point at a different core.

Game rules are re-implemented from scratch; no third-party game source is
copied into this project.

## Usage

### GitHub Action

Add a workflow to your profile repo (e.g. `.github/workflows/snake.yml`):

```yaml
on:
  schedule:
    - cron: "0 6 * * *" # every day
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: generate snake svg
        uses: h1s97x/contrib-arcade-core@main
        with:
          github_user_name: ${{ github.repository_owner }}
          outputs: |
            snake.svg
            snake-dark.svg?palette=github-dark

      - name: commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add snake.svg snake-dark.svg
          git commit -m "chore: update contribution snake" || exit 0
          git push
```

To render every output with the same non-default skin, set the action input
instead of repeating the query string on each line:

```yaml
- uses: h1s97x/contrib-arcade-core@main
  with:
    github_user_name: ${{ github.repository_owner }}
    renderer: mosaic
    outputs: |
      mosaic.svg
      mosaic-dark.svg?palette=mosaic-dark
```

The same action works for the other platforms — set `platform` and pass the
matching token, for example:

```yaml
- uses: h1s97x/contrib-arcade-core@main
  with:
    platform: gitlab
    user_name: my-gitlab-user
    gitlab_token: ${{ secrets.GITLAB_TOKEN }}
    outputs: |
      snake.svg
      snake-dark.svg?palette=gitlab-dark
```

Then embed it in your `README.md`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="snake-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="snake.svg" />
  <img alt="contribution snake" src="snake.svg" />
</picture>
```

[example with cron job](https://github.com/h1s97x/h1s97x/blob/main/.github/workflows/snake.yml)

### CNB pipeline plugin

This repository also builds a CNB Docker plugin. Pushing a tag publishes
`docker.cnb.cool/h1s97x/plugins/contrib-arcade-core:latest` automatically:

```yaml
main:
  "crontab: 0 0 * * *":
    - name: contribution-snake
      stages:
        - name: generate
          image: docker.cnb.cool/h1s97x/plugins/contrib-arcade-core:latest
          settings:
            theme: both
            output: snake.svg
        - name: commit-back
          image: oven/bun:1.3
          script: |
            git config user.name "cnb-bot"
            git config user.email "bot@cnb.cool"
            git add snake.svg snake-dark.svg
            git diff --cached --quiet || git commit -m "chore: update snake [skip ci]"
            git push
```

| setting     | description                                                           | default     |
| ----------- | --------------------------------------------------------------------- | ----------- |
| `platform`  | `github` / `cnb` / `gitlab`                                           | `cnb`       |
| `username`  | user name; falls back to `CNB_BUILD_USER`                             | —           |
| `token`     | platform token (`CNB_TOKEN` is injected in CNB pipelines)             | —           |
| `days`      | contribution window in days                                           | `365`       |
| `metric`    | `score` / `commit` (CNB only)                                         | `score`     |
| `renderer`  | `snake` / `mosaic`                                                    | `snake`     |
| `theme`     | `light` / `dark` / `both`                                             | `both`      |
| `output`    | base output file; `both` also writes `<name>-dark.svg`                | `snake.svg` |
| `outputs`   | multi-line output list with query options; overrides `theme`/`output` | —           |
| `base_url`  | self-hosted platform API base url                                     | —           |

Settings from the former `cnb-snake` plugin (`username`, `days`, `metric`,
`theme`, `output`) are unchanged. With `renderer: mosaic` and `theme: both`,
the dark file uses the `mosaic-dark` palette by default.

### CLI

```bash
# github
bun src/cli.ts --platform=github --user=h1s97x --github_token=<token> \
  --output=dist/snake.svg \
  --output=dist/snake-dark.svg?palette=github-dark

# mosaic skin (light + dark in one file)
bun src/cli.ts --platform=github --user=h1s97x --github_token=<token> \
  --renderer=mosaic --output=dist/mosaic.svg

# or mix skins in a single run
bun src/cli.ts --platform=github --user=h1s97x --github_token=<token> \
  --output=dist/snake.svg --output=dist/mosaic.svg?renderer=mosaic

# cnb
CNB_TOKEN=<token> bun src/cli.ts --platform=cnb --user=h1s97x \
  --output=dist/snake.svg --output=dist/snake-dark.svg?palette=cnb-dark

# gitlab (self-hosted instance)
bun src/cli.ts --platform=gitlab --user=someone \
  --base_url=https://gitlab.example.com \
  --output=dist/snake.svg?palette=gitlab-light
```

Flags: `--platform`, `--user` (`--username`, legacy `--github_user`), `--token`,
`--github_token`, `--renderer`, `--game` (alias of `--renderer`), `--metric`,
`--days`, `--base_url`, `--output` (repeatable). The CLI also reads `INPUT_*`
(GitHub Action) and `PLUGIN_*` (CNB plugin) environment variables.

### dark mode

![dark mode](https://github.com/user-attachments/assets/6b900b64-0cdc-43f0-a234-e11dba8e786e)

For **dark mode** support on GitHub, use this [special syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-syntax/basic-writing-and-formatting-syntax#specifying-the-theme-an-image-is-shown-to) in your readme (shown above).

A `mosaic` SVG already contains both themes, so a single `<img>` is enough;
generate `?palette=mosaic-dark` only if you prefer the two-file `<picture>` form.

## Adding a platform

1. Add `src/sources/<platform>.ts` exporting a function that returns
   `Promise<Cell[]>` (`{ x, y, date, count, level }`). `cellsFromDailyCounts`
   in `src/sources/daily.ts` builds the grid for date-keyed calendars.
2. Add the platform to `platforms` / `Source` in `src/sources/types.ts` and a
   `case` in `getContribution` (`src/sources/index.ts`).
3. Add `<platform>-light` / `<platform>-dark` palettes to `src/palettes.ts`.

## Migrating from cnb-snake

`h1s97x/plugins/cnb-snake` is archived: its CNB data source, plugin entrypoint,
palettes and multi-platform groundwork now live here. Replace the plugin image
with `docker.cnb.cool/h1s97x/plugins/contrib-arcade-core:latest`; all `settings` keys
stay valid.

Both repositories are now named `contrib-snake`: `h1s97x/plugins/contrib-snake`
on CNB and `h1s97x/contrib-snake` on GitHub; old slugs still redirect. The Action
reference `h1s97x/contrib-arcade-core@main` and the badges above point at the renamed
GitHub mirror.

## Implementation

[solver algorithm](./src/solver/README.md)

## Contributing

Contributions are welcome! This project is open to issues, feature requests, and pull requests.

- **Issues**: open an issue for bugs or ideas.
- **Pull requests**: fork the repo, make your change on a branch, and open a PR against `main`. Keep changes focused and add or update tests where relevant.
- Larger changes are welcome too — open an issue first if you'd like to discuss direction.

## License

Distributed under the [MIT License](./LICENSE).
