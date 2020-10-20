# @backstage/plugin-scaffolder-backend

## 0.2.0
### Minor Changes

- 3e254503: Add Azure DevOps support to the scaffolder backend
  
  This adds support for Azure DevOps to the scaffolder (preparer & publisher). I thought I should get this in there now since #2426 has been merged. I had a previous PR with only the preparer but I closed that in favor of this one.
  
  I stayed with the 'azure/api' structure but I guess we should try and go the same way as with GitHub here #2501

### Patch Changes

- 0c370c97: Update SSR template to pass CI
- c926765a: Allow templates to be located on non-default branch
- 6840a68d: Add authentication token to Scaffolder GitHub Preparer
- 1c8c4375: The new `scaffolder.github.baseUrl` config property allows to specify a custom base url for GitHub enterprise instances
- Updated dependencies [3a423657]
- Updated dependencies [e0be86b6]
- Updated dependencies [f70a5286]
- Updated dependencies [12b5fe94]
- Updated dependencies [5249594c]
- Updated dependencies [56e4eb58]
- Updated dependencies [e37c0a00]
- Updated dependencies [a768a07f]
- Updated dependencies [f00ca3cb]
- Updated dependencies [440a17b3]
- Updated dependencies [8afce088]
  - @backstage/catalog-model@0.2.0
  - @backstage/backend-common@0.2.0
