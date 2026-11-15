# 架构决策：开发集中，分发独立

> 状态：决策已确认（2026-11-15），实现待办。本文是决策记录，不是已完成的实现说明。
> 范围：`contrib-*` 系列（8 个街机玩法，以及后续的皮肤与其它 contrib 项目）。
> 一句话：**只有一个仓库用于开发；多个仓库只用于分发，且由 CI 自动生成，禁止手工开发。**
> 定名（2026-11-15）：唯一开发仓库为**新建的 `contrib-core`**，不沿用 `contrib-snake`；`contrib-snake` 降级为 snake 分发通道。

---

## 0. 决策

| | 开发 | 分发 |
| --- | --- | --- |
| 仓库数 | 1（`contrib-core`，CNB 为 canonical，GitHub 为镜像） | 8（`contrib-arcade-<game>`） |
| 内容 | 全部源码、测试、CI、模板、发布脚本 | 由模板生成的 `action.yml` / README / CONTRIBUTING / LICENSE / tag |
| 可写性 | 唯一可写处，唯一收 PR / issue 的地方 | **只读派生产物**，只由发布流水线推送 |
| 变化来源 | 人（review 后合并） | 机器（打 tag 后重跑 scaffold + publish） |
| 版本 | 打 `vX.Y.Z` tag | 引用不可变 tag，各通道可停在不同版本 |

上一版（`1 core + 8 个薄壳`）已经把游戏代码从壳里拿掉了，但把 8 个壳当作"可独立维护的仓库"——独立 issue、独立维护者、独立 release 节奏。这等于 9 个治理单元，凭据、CI、同步、改名成本按 9 份计算。

本决策保留那 8 个仓库，但**改变它们的性质**：从"独立维护单元"降级为"自动生成的只读取货窗口"。仓库数量不变，治理单元从 9 降到 1。

**定名结论**：开发仓库不沿用 `contrib-snake`（它承载旧单仓库的历史与身份），改为 `contrib-core`。相应地 `contrib-snake` 不再是开发仓库，而是 8 个分发通道之一（snake），改名 `contrib-arcade-snake`；它当前那批"删掉源码、只留壳"的未提交改动方向是对的，**不撤销**，只需把 `uses:` 从 `@main` 换成不可变 tag 后提交。

---

## 1. 约束：为什么"分发独立"不能只靠一个仓库

GitHub Action 以**仓库**为发布单位：一个仓库根目录一份 `action.yml`，对应一个 Marketplace 条目；使用者按 `uses: owner/repo@ref` 引用。

- 想要 8 个独立 Marketplace 条目、8 个可单独引用的 `uses:` 路径、8 个可单独打 tag / 归档 / 转交的名字，就必须有 8 个仓库。
- 一个仓库里加 `renderer: breakout` 参数，只能得到"一个条目 + 一个参数"，拿不到独立分发身份。
- 但 GitHub 并没有要求这 8 个仓库里有源码、CI、测试或 PR。**独立的是身份，不是开发。**

这条约束决定了架构形态：开发必须集中（成本），分发必须分散（身份），两者由一条自动发布流水线连接。

---

## 2. 架构全貌（给工程师）

### 2.1 运行时分层

以下以 CNB 远端 `h1s97x/plugins/contrib-core@454afc5` 的实际代码为准；最后一轮商定的统一命名与 5 个泛化点尚未推送，不计入。

| 层 | 位置 | 职责 |
| --- | --- | --- |
| L1 数据 | `src/sources/` | `GithubSource \| CnbSource \| GitlabSource` 判别联合；`getContribution()` 单一 switch 产出 `Promise<Cell[]>`，`Cell = { x, y, date, count, level }`。认证、分页、`metric` / `days` / `base_url` 全在这一层 |
| L2 网格 / 求解 | `cellsToGrid.ts`、`solver/` | 53×7 `Grid`；`getBestRoute` / `getPathToPose`，只有 snake 需要 |
| L3 契约 | `src/renderers/types.ts` | `RenderContext { grid, cells, getSnakeChain }`；`Renderer { name, createSvg(ctx, { drawOptions, animationOptions, paletteName }) }` |
| L4 实现 | `src/renderers/` | 注册表 10 项：`snake`、`mosaic`（非游戏皮肤，跳过 solver），8 个游戏共用 `gameplay/engine.ts`（唯一帧引擎：网格、明暗主题、CSS keyframes、角色层、静态首帧）+ `gameplay/simulations.ts`（7 个 `GameplayFactory`，各 20–60 行，只产出 `FrameEvent` / `ActorTrack`） |
| L5 配置 | `outputsOptions.ts`、`palettes.ts` | `x.svg?renderer=&palette=&color_snake=` → `Output`；逐输出可覆盖 renderer；平台官方明暗色板 |
| L6 入口 | `cli.ts` / `action.yml` / `Dockerfile`+`entrypoint.sh` | 同一函数 `generateAnimation()`，输入分别来自 `--flag`、`INPUT_*`（GitHub Action）、`PLUGIN_*`（CNB 插件） |

调用链：

```
profile workflow
  → uses: h1s97x/contrib-arcade-breakout@v1.2.3   # 分发仓库：只读、无源码
      → uses: h1s97x/contrib-core@v1.2.3          # 开发仓库：不可变 tag
          → bun src/cli.ts
              → getContribution(source) → Cell[]
              → cellsToGrid → Grid(53×7)
              → renderers[resolveRenderer("breakout")].createSvg(...)
              → 写 N 个 SVG
```

壳的全部实质内容：透传 5 个 inputs、固定 `renderer: breakout`、引用 core。**壳代码量 = 0；开发仓库 ≈ 43 个 TS 文件、85 个测试。**

### 2.2 目录与所有权

```
contrib-core/                       # 唯一可写仓库
  src/                              #   L1–L6 全部源码
  src/__tests__/                    #   85 测试 + SVG 快照（不变式：首帧 371 格、体积、双主题）
  templates/shell/*.tpl             #   分发产物模板
  scripts/scaffold-shells.ts        #   渲染 8 份分发内容（现有）
  scripts/publish-shells.sh         #   发布到 8 个分发仓库（待实现，由现有 create-shell-repos.sh 改造）
  .cnb.yml / .github/workflows/     #   唯一一套 CI
  shells/                           #   本地派生产物，.gitignore 忽略，不进版本库
```

**所有权规则**：`templates/` 与 `scripts/` 属于开发仓库；`shells/` 和 8 个分发仓库都不是源码，要改壳就改模板后重跑，禁止手改生成物。

### 2.3 分发仓库的硬约束

1. 只允许 5 类文件：`action.yml`、README、CONTRIBUTING、LICENSE、可选预览 workflow。不含 `src/`、不含 CI 逻辑、不含凭据。
2. README / CONTRIBUTING 顶部固定声明：**本仓库是只读分发通道，问题与 PR 请提到 `contrib-core`**；配 issue 模板重定向。
3. 不接受手工提交；发布脚本若发现远端存在非机器人提交，应报警而不是覆盖。
4. `uses:` 指向 `contrib-core@vX.Y.Z`（不可变 tag），**禁止 `@main`**。
5. 可单独授予发布权限、单独归档、单独打 tag / 发版；这些是"分发独立"的全部含义，不包含"可独立开发"。

### 2.4 发布流水线（唯一发布入口）

触发条件：开发仓库 `tag_push` 或手动 `web_trigger`；**不在 `push to main` 上自动发布**。

| 步骤 | 动作 |
| --- | --- |
| 1 验证 | `tsc --noEmit`、prettier、85 测试、9 张 SVG 快照 + 首帧 371 格断言 |
| 2 渲染 | `bun run scaffold`，把 `CORE_REF=vX.Y.Z`、游戏名、状态注入模板，生成 8 份内容 |
| 3 推送 | 逐仓库 `git add -A` → 无 diff 则跳过 → `--no-gpg-sign` 提交 → push 到 CNB 与 GitHub 两端 |
| 4 发版 | 每个分发仓库打自己的 tag / release；单仓库失败不中断其余，可重跑 |
| 5 记录 | 输出「游戏 → core 版本」兼容表，供回滚与排障 |

工程要点（现有 `scripts/create-shell-repos.sh` 已经踩过并解决了大部分）：幂等（无 diff 跳过）、逐仓库失败隔离、`git -c commit.gpgsign=false` 绕过平台 GPG 签名钩子、用一次性 `http.extraHeader` 传 Basic 凭据而不写进 URL 或 `.git/config`、`create-repo` 返回 201 空响应用 `get-by-id` 复核。改造重点是**把"一次性建仓"变成"按 tag 重复发布"**，并注入版本号。

### 2.5 版本与故障半径

- core 的 `main` 不再是任何分发仓库的生产依赖：core 的主分支坏了，已发布的壳照常运行。
- 升级是显式动作：重新发布 → 逐个更新，可灰度、可单独回滚到旧 tag。
- 代价：8 个壳可能长期停在不同 core 版本上，需要维护兼容表。这是"独立版本节奏"的必要成本，不是缺陷。
- 可选的更强独立：CI 把 core 编译成单文件 `dist/cli.js` 随壳一起发布，壳的 `action.yml` 指向本地 bundle，运行时完全不依赖 core 仓库。代价是修一个 bug 必须重发 8 份产物。**现阶段不采用**；等分发仓库要交给第三方托管、或 core 可能停服时再上。

### 2.6 与上一版的差异

| | 上一版：1 core + 8 个可维护壳 | 本决策：1 开发仓库 + 8 个只读分发通道 |
| --- | --- | --- |
| 治理单元 | 9 | 1 |
| 壳可否收 PR / 手工改 | 可以 | 禁止 |
| 引用 | `@main` 浮动 | `@vX.Y.Z` 不可变 |
| core 一次坏提交 | 8 个壳同时挂 | 已发布壳不受影响 |
| 凭据 / CI / 发版 | 9 套 | 1 套 CI + 8 个自动发布目标 |
| 平台 API 变更 | 改 1 处，8 壳零提交 | 改 1 处，重跑发布流水线 |
| 权限隔离 | 8 个写权限域 | 可单独给发布权限，但不给开发权限 |

### 2.7 优劣

**优势**

1. 开发集中：1 个仓库、1 套 CI、1 套测试、1 个 issue / PR 入口，治理成本接近单仓库。
2. 分发独立：8 个独立 `uses:` 路径 / Marketplace 条目 / 版本号 / 归档与转交能力，一个不少。
3. 变更一次生效：平台 API、认证、SVG 不变式只改一处，发布后 8 个通道一起更新，不会出现 8 份代码版本漂移。
4. 故障隔离：tag 锁定切断了 `main` 与生产之间的实时耦合。
5. 可回退：若以后不需要独立分发，删掉发布流水线即可，源码一行不用动。
6. 可渐进裂变：某个游戏真长出独立维护者时，只把那一个分发仓库从"只读"升级为"可写"，其余保持只读。

**劣势 / 成本**

1. 8 个仓库的"存在成本"仍在：账号、凭据、双端镜像、Marketplace 审核、改名、归档。这次会话已经实付过（`group-resource:rw` 403、令牌过期 401、push 被 GPG 钩子拦、`create-repo` 空响应、CNB CLI 不支持改名）。
2. 发布流水线成为新的关键组件：凭据存放、幂等、失败重试、双端一致性都要在脚本里兜住；它坏了不影响现有壳，但会阻塞所有升级。
3. 派生仓库的 issue 分流：用户仍可能在 8 个壳里提 issue，需要 README + issue 模板反复引导回 core。
4. 版本矩阵：8 个壳停在不同版本上，排障时先看兼容表。
5. 抽象边界要守住：`templates/`（分发元数据）不能混进 `src/renderers/`（运行时契约）。上一轮把 `shellRepo` / `status` 放进 `src/games.ts` 就是这种泄漏，泛化时应拆成"能力清单"与"分发清单"。
6. 若采用 bundle 自包含，bug 修复需重发 8 份产物，发布成本随通道数线性增长。

### 2.8 判据与备选

- **走本决策**：需要 8 个 Marketplace 条目 / 可独立引用的 `uses:` / 可单独归档或转交 / 每个游戏独立版本号。本项目的目标正是这些。
- **退回单仓库 + `renderer=` 参数**：若某天不再需要独立分发身份（只有一个入口、无外部引用），单仓库就能拿到几乎全部技术收益，成本是 1/9。
- **局部裂变**：某个游戏出现真正的独立维护者时，只把那一个分发仓库升级为可写，其余保持只读。

---

## 3. 给非技术读者

想象一家**中央厨房**，和 8 个**门头招牌**。

厨房负责一切"做菜"的事：去 GitHub / CNB / GitLab 采购（取回一年的贡献记录）、洗切摆盘（整理成固定的日历格子）、定灶台和出餐标准（画面、明暗配色、动画、每张图一上来就得是完整的）、质检（85 项检查），还要对接三个外卖平台。

8 个门头只写着"本店卖贪吃蛇""本店卖打砖块"。**门头里没有厨房，也不设办公室**：所有研发、改菜谱、反馈、投诉都回厨房处理；门头是每次厨房出新版本时，由机器自动印好、自动挂上去的，人不去手改。

这样两边的要求都满足了：

- **开发在一起管**：只有一个厨房、一套菜谱、一个收反馈的地方，改一次菜谱全部生效，不用养 8 套厨房和 8 套质检。
- **分发保证独立**：8 个招牌各有各的名字、评分、版本牌，可以单独换、单独摘牌、单独交给别人经营，某一个出问题不会连累其它门头，厨房当天关门也不影响已经挂出去的招牌照常接单。

代价是：8 张营业执照、8 套账号还是要办（我们已经在这些手续上卡了好几次）；而且"自动印招牌"的那套机器本身要维护好，它坏了不影响现有招牌，但新菜谱就发不出去了。

一句话判断：这个划分值不值，不看技术，看**是否真的需要 8 个独立招牌**。需要，就用这套；哪天不需要了，把招牌收回来、一家店挂 8 个菜单即可，厨房一点不用改。

---

## 4. 现状与落地清单

### 现状（2026-11-16，产物落地后核对）

- **CNB `h1s97x/plugins/contrib-core` 是唯一开发仓库**：`main` = `b1579cf`，`package.json` 版本 `3.6.0`；GitHub 镜像同 HEAD。
- **首个不可变 tag `v3.6.0` 双端存在**，8 个壳的 `action.yml` 引用 `h1s97x/contrib-core@v3.6.0`。
- **9 个仓库在 CNB / GitHub 双端 `main` HEAD 逐仓库一致**（core `b1579cf` + 8 个壳）。
- **每个仓库自带产物**：core 根目录 `demo.svg` / `demo-dark.svg`；8 个壳各自 `<game>.svg` / `<game>-dark.svg`（30–115KB，明暗两份）。全部由 `scripts/render-demo.ts` 用固定种子的 53×7 样本网格离线生成，无需任何 API 凭据。
- **README 已内嵌本地预览**：core 与 8 个壳都用 `<picture>` 指向仓库内 SVG，不再引用外部 profile 仓库；新增「Generated artifacts」「Verification」章节与生成命令。
- **测试结果**：core `tsc --noEmit` 0 错、prettier 全通过、**86 个离线测试通过**（`bun test`，3 快照）；修掉产物 `<desc>` 里的旧仓库名后，16 个 SVG 快照同步更新。`scripts/verify-shells.ts` 逐壳冒烟 **8/8 PASS**（产物存在、首帧 371 格、README 本地引用、core tag 锁定）。
- **生成与验证已纳入发布流水线**：`publish-shells.sh` 在 scaffold 后依次执行 `demo:shells` 与 `verify:shells`，通过后才推双端；`package.json` 暴露 `demo` / `demo:shells` / `verify:shells`。
- **旧仓库**：7 个 `arcade-*` 已由用户手动删除（404）；`contrib-snake` 保留（含 5 个 open issue 与 30 个历史提交）。此前归档 / 删除尝试因缺 `repo-manage:rw` / `repo-delete:rw` 返回 403，未绕过。
- **CI**：`main.push` 的 git-sync 成功；`v3.6.0` 的首次 `tag_push` 发布 job 仍是历史 error（旧脚本非快进），修复已在 `main`，下个 tag 生效。
- **`contrib-snake` 已定位为历史归档仓库**：过时的壳化改动已撤销，README 顶部加了迁移说明，5 个 open issue 与 30 个历史提交保留。架构决策文档已迁入本仓库 `docs/architecture.md`。
- 令牌：本轮复用双端凭据完成推送，临时文件已删除、未写入仓库；**建议轮换所有在对话里明文出现过的令牌**。

### 落地清单（剩余）

1. [x] 架构定名、core 归位、9 个仓库双端就位。
2. [x] 打 `v3.6.0` tag，模板与壳引用改为不可变 tag。
3. [x] 新增 `publish-shells.sh` 与 `.cnb.yml` 的 `tag_push` 发布流水线。
4. [x] 删除 7 个旧 `arcade-*` 仓库（`contrib-snake` 按用户决定保留）。
5. [x] 全量测试（86）、逐壳冒烟（8/8）、每仓库离线产物与 README 内嵌预览。
6. [ ] 用下一个 tag 触发一次完整 `tag_push`，验证自动发布链路（含产物生成与冒烟门禁）。
7. [x] 清理 `/workspace` 过时改动、归档说明与文档迁移；[ ] 更新 `contrib-core` 仓库描述为「唯一开发仓库」。
8. [ ] 清理旧 `todo.md` 收尾项；**轮换所有在对话里明文出现过的令牌**。

> 本文档位于本地工作区，尚未提交；远端落地进度以本节为准。
