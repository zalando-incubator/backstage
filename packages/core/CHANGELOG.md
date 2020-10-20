# @backstage/core

## 0.2.0
### Minor Changes

- 819a7022: Add SAML login to backstage
  
  ![](https://user-images.githubusercontent.com/872486/92251660-bb9e3400-eeff-11ea-86fe-1f2a0262cd31.png)
  
  ![](https://user-images.githubusercontent.com/872486/93851658-1a76f200-fce3-11ea-990b-26ca1a327a15.png)
- 482b6313: Fix dense in Structured Metadata Table
- 1c60f716: Added EmptyState component
- b79017fd: Updated the `GithubAuth.create` method to configure the default scope of the Github Auth Api. As a result the
  default scope is configurable when overwriting the Core Api in the app.
  
  ```
  GithubAuth.create({
    discoveryApi,
    oauthRequestApi,
    defaultScopes: ['read:user', 'repo'],
  }),
  ```

### Patch Changes

- ae598338: Fix banner position and color
  
  This PR closes: #2245
  
  The "fixed" props added to control the position of the banner. When it is set to true the banner will be shown in bottom of that page and the width will be based on the content of the message.
  
  ![](https://user-images.githubusercontent.com/15106494/93765685-999df480-fc15-11ea-8fa5-11cac5836cf1.png)
  
  ![](https://user-images.githubusercontent.com/15106494/93765697-9e62a880-fc15-11ea-92af-b6a7fee4bb21.png)
- 144c66d5: Fixed banner component position in DismissableBanner component
- 782f3b35: add test case for Progress component
- 2713f28f: fix the warning of all the core components test cases
- 406015b0: Update ItemCard headers to pass color contrast standards.
- ac8d5d5c: update the test cases of CodeSnippet component
- ebca83d4: add test cases for Status components
- 754e31db: give aria-label attribute to Status Ok, Warning and Error
- Updated dependencies [819a7022]
- Updated dependencies [ae598338]
- Updated dependencies [0d4459c0]
- Updated dependencies [cbbd271c]
- Updated dependencies [b79017fd]
  - @backstage/core-api@0.2.0
  - @backstage/theme@0.2.0
