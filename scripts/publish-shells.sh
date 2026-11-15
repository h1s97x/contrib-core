#!/usr/bin/env bash
# 按 tag 发布 8 个只读分发壳（幂等，可重复运行）。
#
# 用法：CORE_REF=v3.6.0 bash scripts/publish-shells.sh
#   或：bash scripts/publish-shells.sh v3.6.0
#   在 tag_push 流水线中，CORE_REF 由 git describe 自动取当前 tag。
#
# 环境变量：
#   CORE_REF              必填，vX.Y.Z 不可变 tag
#   CNB_TOKEN             CNB 推送凭据（repo-code:rw）；缺失则跳过 CNB 端
#   CNB_TOKEN_USER_NAME   Basic 用户名，默认 cnb
#   GITHUB_TOKEN          GitHub 推送凭据；缺失则跳过 GitHub 端
#   CNB_GROUP / GH_OWNER  默认 h1s97x/plugins / h1s97x
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
CNB_GROUP="${CNB_GROUP:-h1s97x/plugins}"
GH_OWNER="${GH_OWNER:-h1s97x}"
CORE_REF="${1:-${CORE_REF:-$(git describe --tags --exact-match HEAD 2>/dev/null || true)}}"

if [[ ! "$CORE_REF" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "::error::CORE_REF must be a vX.Y.Z tag, got '${CORE_REF:-<empty>}'" >&2
  exit 1
fi
echo "▸ publishing shells for $CORE_REF"

# 从模板渲染 8 份壳，注入不可变 tag
npx -y bun scripts/scaffold-shells.ts --core-ref="$CORE_REF" >/dev/null || {
  echo "::error::scaffold failed" >&2
  exit 1
}

cnb_auth=""
if [ -n "${CNB_TOKEN:-}" ]; then
  cnb_auth="Authorization: Basic $(printf '%s' "${CNB_TOKEN_USER_NAME:-cnb}:$CNB_TOKEN" | base64 -w0)"
else
  echo "⚠ CNB_TOKEN missing — CNB mirrors will be skipped"
fi
gh_auth=""
if [ -n "${GITHUB_TOKEN:-}" ]; then
  gh_auth="Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)"
else
  echo "⚠ GITHUB_TOKEN missing — GitHub mirrors will be skipped"
fi

failures=()
for dir in "$ROOT"/shells/contrib-arcade-*; do
  name="$(basename "$dir")"
  echo "▸ $name"
  (
    cd "$dir" || exit 1
    if [ ! -d .git ]; then git init -b main -q; fi
    git add -A
    if ! git diff --cached --quiet; then
      git -c commit.gpgsign=false \
          -c user.name="${CNB_BUILD_USER:-h1s97x}" \
          -c user.email="${CNB_COMMITTER_EMAIL:-bot@cnb.cool}" \
          commit --no-gpg-sign -q -m "release: $CORE_REF $name"
    fi
    if [ -n "$cnb_auth" ]; then
      git -c http.extraHeader="$cnb_auth" push -q \
        "https://cnb.cool/$CNB_GROUP/$name.git" main:main
    fi
    if [ -n "$gh_auth" ]; then
      git -c http.extraHeader="$gh_auth" push -q \
        "https://github.com/$GH_OWNER/$name.git" main:main
    fi
  ) || { echo "  ✗ $name"; failures+=("$name"); continue; }
  echo "  ✓ $name → $CORE_REF"
done

echo "▸ compatibility: 8 shells → $CORE_REF"
if [ "${#failures[@]}" -gt 0 ]; then
  echo "::error::failed: ${failures[*]}" >&2
  exit 1
fi
