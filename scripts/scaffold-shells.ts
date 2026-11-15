/**
 * 从 templates/shell/ 生成 8 个薄壳仓库目录（本地，可直接 push 到各自远端）。
 * 用法（在 core 仓库根目录）：bun run scaffold [--out=shells] [--owner=h1s97x]
 *
 * 这份清单来自 src/games.ts 的 shellTargets（要生成哪些壳），
 * 与 src/renderers/index.ts 的渲染器注册表是两件事：其它 contrib 项目
 * 可以直接注册 Renderer，不必出现在这里。
 * 8 个壳都有独立仓库；发布由 scripts/publish-shells.sh 按 tag 驱动。
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { CORE_REPO, CORE_URL, shellTargets } from "../src/games";

const root = process.cwd();
const templateDir = path.join(root, "templates", "shell");
const args = process.argv.slice(2);
const arg = (name: string, fallback: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ??
  fallback;

const outDir = path.resolve(arg("out", path.join(root, "shells")));
const owner = arg("owner", "h1s97x");
// 发布时由 publish-shells.sh 注入不可变 tag；本地开发默认跟随 main。
const coreRef = arg("core-ref", process.env.CORE_REF ?? "main");

// contrib- 前缀与既有项目一致；arcade 标记这 8 个街机游戏这一组
const shellName = (game: string) => `contrib-arcade-${game}`;

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

for (const game of shellTargets) {
  const name = shellName(game.name);
  const target = path.join(outDir, name);
  const values: Record<string, string> = {
    SHELL_NAME: name,
    SHELL_CNB_PATH: game.shellRepo,
    GAME: game.name,
    LABEL: game.label,
    SUMMARY: game.summary,
    STATUS: game.status,
    STATUS_LINE:
      game.status === "ready"
        ? "**Status: ready** — this game is implemented in core and usable today."
        : "**Status: planned** — the shell, docs and CI are in place, but the game logic is not implemented in core yet.",
    CORE_REPO,
    CORE_URL,
    CORE_REF: coreRef,
    MIRROR_NOTE:
      "Create this mirror separately to use the shell as a GitHub Action.",
    SHELL_REPO: `${owner}/${name}`,
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

console.log(
  `\n${shellTargets.length} shells generated in ${outDir} (core ${coreRef})`,
);
console.log("Publish them with: CORE_REF=<tag> bash scripts/publish-shells.sh");
