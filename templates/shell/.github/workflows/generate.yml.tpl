name: generate {{GAME}} preview

on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  generate:
    {{CONTINUE_ON_ERROR}}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          github_user_name: ${{ github.repository_owner }}
      - name: commit preview
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add '*.svg'
          git diff --cached --quiet || git commit -m "chore: update {{GAME}} preview"
          git push
