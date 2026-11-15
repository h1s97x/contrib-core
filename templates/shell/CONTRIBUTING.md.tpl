# Contributing to contrib-{{GAME}}

This repo is a thin shell. It owns **only** the branding, default inputs,
issues and maintainers for `{{GAME}}`.

- **Game logic, rendering, themes, data sources, CLI and CI** live in the
  [core]({{CORE_URL}}). Open gameplay PRs there.
- **This repo** is the right place for README wording, preview images, issue
  templates, default `outputs`, and release/permissions for this shell.
- For a fork, edit the `uses:` line in `action.yml` to point at your own core
  fork; nothing else needs to change.

Shell files are generated from `templates/shell/` in the core repo. If you
change something here that should apply to all eight games, change the template
and re-run `bun run scaffold` instead.

Maintainers: this repository can be handed to a separate owner without giving
write access to the core or to any other game's shell.
