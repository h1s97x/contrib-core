# Contributing to {{SHELL_NAME}}

This repo is a **read-only distribution channel** for `{{GAME}}`. It is
generated from `templates/shell/` in [`contrib-core`]({{CORE_URL}}); direct
edits here are overwritten by the next release.

- **Game logic, rendering, themes, data sources, CLI and CI** live in the
  [core]({{CORE_URL}}). Open issues and pull requests there.
- **This repo** only carries the generated identity: name, README, default
  `outputs` and the fixed `renderer`; it has no game code and no CI of its own.
- For a fork, edit the `uses:` line in `action.yml` to point at your own core
  fork; nothing else needs to change.

Shell files are generated from `templates/shell/` in the core repo. If you
change something here that should apply to all eight games, change the template
and re-run `bun run scaffold` instead.

Maintainers: this repository can be handed to a separate owner without giving
write access to the core or to any other game's shell.
