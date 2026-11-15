name: "{{SHELL_NAME}}"
description: "{{SUMMARY}} Thin shell over {{CORE_REPO}} ({{STATUS}})."
author: "h1s97x"

# This file is the whole shell: it fixes one game and forwards every other
# input to the core. Open gameplay PRs against the core; when forking this
# repo, point the `uses:` line below at your own core fork.

inputs:
  github_user_name:
    description: "user name on the contribution platform"
    required: false
  user_name:
    description: "alias of github_user_name"
    required: false
  github_token:
    description: "token used to fetch the contribution calendar"
    required: false
    default: ${{ github.token }}
  platform:
    description: "github | cnb | gitlab"
    required: false
    default: github
  outputs:
    description: "one SVG per line, with optional ?palette= / ?renderer= query options"
    required: false
    default: |
      {{GAME}}.svg
      {{GAME}}-dark.svg?palette=github-dark

runs:
  using: composite
  steps:
    - uses: {{CORE_REPO}}@main
      with:
        platform: ${{ inputs.platform }}
        user_name: ${{ inputs.user_name }}
        github_user_name: ${{ inputs.github_user_name }}
        github_token: ${{ inputs.github_token }}
        renderer: {{GAME}}
        outputs: ${{ inputs.outputs }}
