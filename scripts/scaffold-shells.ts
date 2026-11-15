/**
 * 从 templates/shell/ 生成 8 个薄壳仓库目录（本地，可直接 push 到各自远端）。
 * 用法（在 core 仓库根目录）：bun run scaffold [--out=shells] [--owner=h1s97x]
 * 生成物是派生产物：要改壳，改模板后重跑，不要手改 shells/。
 * snake 壳对应已存在的 h1s97x/plugins/contrib-snake，不需要新建仓库。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { arcadeGames, CORE_REPO, CORE_URL, newShellNames } from "../src/games";

const root = process.cwd();
const templateDir = path.join(root, "templates", "shell");
const args = process.argv.slice(2);
const arg = (name: string, fallback: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ??
  fallback;

const outDir = path.resolve(arg("out", path.join(root, "shells")));
const owner = arg("owner", "h1s97x");

const shellName = (game: string) => `arcade-${game}`;

const walk = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );

const render = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template,
  );

const templates = walk(templateDir);

for (const game of arcadeGames) {
  const name = shellName(game.name);
  const target = path.join(outDir, name);
  const values: Record<string, string> = {
    SHELL_NAME: game.name === "snake" ? "contrib-snake" : name,
    SHELL_CNB_PATH: game.shellRepo,
    GAME: game.name,
    LABEL: game.label,
    SUMMARY: game.summary,
    STATUS: game.status,
    STATUS_LINE:
      game.status === "ready"
        ? "**Status: ready** — this game is implemented in core and usable today."
        : "**Status: planned** — the shell, docs and CI are in place, but the game logic is not implemented in core yet. Running this action returns a clear `registered but not implemented` error until the renderer lands.",
    CORE_REPO,
    CORE_URL,
    MIRROR_NOTE:
      game.name === "snake"
        ? "This mirror already exists."
        : "Create this mirror separately to use the shell as a GitHub Action.",
    SHELL_REPO:
      game.name === "snake" ? "h1s97x/contrib-snake" : `${owner}/${name}`,
    CONTINUE_ON_ERROR:
      game.status === "planned"
        ? "continue-on-error: true"
        : "# game is ready; fail the workflow on real errors",
  };

  for (const file of templates) {
    const rel = path.relative(templateDir, file).replace(/\.tpl$/, "");
    const dest = path.join(target, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, render(fs.readFileSync(file, "utf8"), values));
  }
  fs.copyFileSync(path.join(root, "LICENSE"), path.join(target, "LICENSE"));
  console.log(`✓ ${target} (${game.status}) → ${game.shellRepo}`);
}

console.log(`\n${arcadeGames.length} shells generated in ${outDir}`);
console.log(`snake uses the existing h1s97x/plugins/contrib-snake repository.`);
console.log(
  `New repos to create: contrib-arcade-core, ${newShellNames.join(", ")}`,
);
