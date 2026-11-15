# {{SHELL_NAME}}

> **Read-only distribution channel.** This repository is generated from
> [`contrib-core`]({{CORE_URL}}) by the release pipeline. Please open issues
> and pull requests in the core repository, not here.

{{STATUS_LINE}}

{{SUMMARY}}

CNB: `{{SHELL_CNB_PATH}}`. GitHub mirror: `{{SHELL_REPO}}`. {{MIRROR_NOTE}}
`action.yml` points at the core mirror `{{CORE_REPO}}`, which must exist before
this shell's workflow can run.

This repository is a **thin shell**. It contains no game code: it fixes
`renderer: {{GAME}}` and forwards every other input to the shared
[core]({{CORE_URL}}). The core owns the contribution data sources, the 53×7
grid, palettes, all renderers, the CLI, the GitHub Action and the CNB plugin.

## Usage

```yaml
- uses: {{SHELL_REPO}}@main
  with:
    github_user_name: ${{ github.repository_owner }}
    outputs: |
      {{GAME}}.svg
      {{GAME}}-dark.svg?palette=github-dark
```

Everything else from the core Action works here too: `platform`, `user_name`,
`github_token` and the per-output query options (`palette`, `color_dots`,
`color_snake`, `renderer`). See the [core README]({{CORE_URL}}#readme).

## Why a separate repository

One repo per game means its own issues, README, preview, release cadence and
maintainers. Someone can be given write access to just this game's shell
without touching the other seven. Upgrades still happen once, in the core.

## Forking

Fork this repo to change branding, default outputs, issue templates or
maintainers without touching game logic. To use your own core, edit the `uses:`
line in `action.yml` from `{{CORE_REPO}}@main` to your fork and ref.

To change how the game actually plays, open a PR against the core renderer in
[{{CORE_REPO}}]({{CORE_URL}}) instead — every shell picks up the change
automatically.

## Regenerating

This shell was produced by `bun run scaffold` in the core repo. To keep all
shells in sync, change `templates/shell/` there and re-run it, rather than
editing generated files by hand.

## License

MIT. See [LICENSE](./LICENSE).
