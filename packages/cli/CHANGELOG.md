# @backstage/cli

## 0.2.0
### Minor Changes

- 28edd7d2: Create backend plugin through CLI
- 1d0aec70: Upgrade dependency `esbuild@0.7.7`
- 72f6cda3: Adds a new `BACKSTAGE_CLI_BUILD_PARELLEL` environment variable to control
  parallelism for some build steps.
  
  This is useful in CI to help avoid out of memory issues when using `terser`. The
  `BACKSTAGE_CLI_BUILD_PARELLEL` environment variable can be set to
  `true | false | [integer]` to override the default behaviour. See
  [terser-webpack-plugin](https://github.com/webpack-contrib/terser-webpack-plugin#parallel)
  for more details.
- 8afce088: Use APP_ENV before NODE_ENV for determining what config to load

### Patch Changes

- 3472c8be: Add codeowners processor
  
  - Include ESNext.Promise in TypeScript compilation
- a3840bed: Upgrade dependency rollup-plugin-typescript2 to ^0.27.3
- cba4e4d9: Including source maps with all packages
- 9a3b3dbf: Fixed duplicate help output, and print help on invalid command
- Updated dependencies [ce5512bc]
  - @backstage/config-loader@0.2.0
