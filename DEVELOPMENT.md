# Development Guide

This document contains information on how to build and release the plugin. If
you are looking to use the plugin please head over to [README.md](README.md).

## Building the plugin

1. Install dependencies

```BASH
yarn install
```

2. Build plugin in development mode or run in watch mode

```BASH
yarn dev
```

or

```BASH
yarn watch
```

3. Build plugin in production mode

```BASH
yarn build
```

## Maintenance

Code formatting

```BASH
yarn prettier --write src
```

Update dependencies

```BASH
yarn upgrade --latest
```

## Release

* create pull request:
  * adapt version in package.json to `X.Y.Z`
  * add section in CHANGELOG.md
* merge pull request into main branch
* tag commit in the main branch with `vX.Y.Z`
* save release draft on github
* done
