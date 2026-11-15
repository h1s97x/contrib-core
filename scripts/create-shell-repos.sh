#!/usr/bin/env bash
# 一次性创建 core 仓库 + 7 个新薄壳仓库，并推送初始内容。
# snake 壳复用已有的 h1s97x/plugins/contrib-snake，不在这里创建。
#
# 前置条件：
#   1. CNB_TOKEN 具备 group-resource:rw（创建仓库）与 repo-code:rw（推送）。
#      当前流水线注入的 token 缺少 group-resource:rw，会返回 403 / errcode 10023。
#      在 CNB「设置 → 访问令牌」补权限后重跑，或用 `cnb login` 换个人凭证。
#   2. 先在本目录跑 `bun run scaffold` 生成 shells/。
#   3. GitHub 镜像 h1s97x/contrib-arcade-core 需另行创建（本环境无 GitHub 凭据），
#      否则薄壳 action.yml 里的 `uses:` 暂时无法解析。
set -euo pipefail

GROUP="h1s97x/plugins"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHELLS="$ROOT/shells"

# create-repo 成功时响应体为空，cnb CLI 会打印 JSON 解析错误但仓库已建成，
# 因此不依赖它的退出码，统一用 get-by-id 复核。
create_repo() {
  local name="$1" desc="$2"
  if cnb repositories get-by-id --repo "$GROUP/$name" 2>&1 | grep -q 'status: 200'; then
    echo "↷ $GROUP/$name already exists"
    return 0
  fi
  echo "▸ creating $GROUP/$name"
  cnb repositories create-repo \
    --slug "$GROUP" \
    --name "$name" \
    --visibility public \
    --description "$desc" >/dev/null 2>&1 || true
  if ! cnb repositories get-by-id --repo "$GROUP/$name" 2>&1 | grep -q 'status: 200'; then
    echo "::error::failed to create $GROUP/$name" >&2
    return 1
  fi
}

# 不把 token 写进 .git/config，也不放进 URL（避免失败日志泄露）：
# 用一次性 http.extraHeader 传递 Basic 凭据。
push_repo() {
  local dir="$1" name="$2" msg="$3"
  local auth
  auth="Authorization: Basic $(printf '%s' "${CNB_TOKEN_USER_NAME:-cnb}:${CNB_TOKEN}" | base64 -w0)"
  (
    cd "$dir"
    if [ ! -d .git ]; then
      git init -b main -q
    fi
    # 首次推送与后续更新走同一条路径：没有改动就跳过提交。
    git add -A
    if ! git diff --cached --quiet; then
      # 平台 GPG 签名接口对普通访问令牌不可用，显式免签名提交。
      git -c commit.gpgsign=false \
          -c user.name="${CNB_BUILD_USER:-h1s97x}" \
          -c user.email="${CNB_COMMITTER_EMAIL:-bot@cnb.cool}" \
          commit -q --no-gpg-sign -m "$msg"
    fi
    git -c http.extraHeader="$auth" push -q \
      "https://cnb.cool/${GROUP}/${name}.git" main:main
  )
  echo "  ✓ pushed $GROUP/$name"
}

create_repo "contrib-arcade-core" \
  "Core renderers, data sources and CI for the contribution-graph arcade shells"
for game in pacman breakout galaga puzzle-bobble bomberman minesweeper tetris; do
  create_repo "arcade-$game" "Thin shell for the $game contribution-graph game"
done

echo
echo "▸ pushing contents"
push_repo "$ROOT" "contrib-arcade-core" "init: contribution-graph arcade core"
for game in pacman breakout galaga puzzle-bobble bomberman minesweeper tetris; do
  push_repo "$SHELLS/arcade-$game" "arcade-$game" "init: $game thin shell"
done

echo
echo "Done. Remember to:"
echo "  - create the GitHub mirror h1s97x/contrib-arcade-core"
echo "  - replace h1s97x/plugins/contrib-snake with shells/arcade-snake/"
