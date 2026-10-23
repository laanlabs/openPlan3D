# GitHub Actions

This folder contains a Dockerfile for GitHub to bundle the pipeline-built application,
and the ci workflow.

## Dockerfile

The dockerfile is a simply `npm install` + copy. In-image building can be done
using the `Dockerfile` in the root.

## `ci.yaml`

This file uses `@vX` versions and the `gh actions-lock` action to create a lockfile.
No injecting of raw SHAs anymore, this is far more readable.

To update, [install the actions-lock extension][1] and run `gh actions-lock --no-narrow`.

[1]: https://github.com/github/gh-actions-lock/
