# @backstage/plugin-pagerduty

## 0.3.2

### Patch Changes

- 4c049a1a1: - Adds onClick and other props to IconLinkVertical;

  - Allows TriggerButton component to render when pager duty key is missing;
  - Refactors TriggerButton and PagerDutyCard not to have shared state;
  - Removes the `action` prop of the IconLinkVertical component while adding `onClick`.

    Instead of having an action including a button with onClick, now the whole component can be clickable making it easier to implement and having a better UX.

    Before:

    ```ts
    const myLink: IconLinkVerticalProps = {
      label: 'Click me',
      action: <Button onClick={myAction} />,
      icon: <MyIcon onClick={myAction} />,
    };
    ```

    After:

    ```ts
    const myLink: IconLinkVerticalProps = {
      label: 'Click me',
      onClick: myAction,
      icon: <MyIcon />,
    };
    ```

- Updated dependencies [12d8f27a6]
- Updated dependencies [40c0fdbaa]
- Updated dependencies [2a271d89e]
- Updated dependencies [bece09057]
- Updated dependencies [169f48deb]
- Updated dependencies [8a1566719]
- Updated dependencies [9d455f69a]
- Updated dependencies [4c049a1a1]
- Updated dependencies [02816ecd7]
  - @backstage/catalog-model@0.7.3
  - @backstage/core@0.7.0
  - @backstage/plugin-catalog-react@0.1.1

## 0.3.1

### Patch Changes

- Updated dependencies [3a58084b6]
- Updated dependencies [e799e74d4]
- Updated dependencies [d0760ecdf]
- Updated dependencies [1407b34c6]
- Updated dependencies [88f1f1b60]
- Updated dependencies [bad21a085]
- Updated dependencies [9615e68fb]
- Updated dependencies [49f9b7346]
- Updated dependencies [5c2e2863f]
- Updated dependencies [3a58084b6]
- Updated dependencies [2c1f2a7c2]
  - @backstage/core@0.6.3
  - @backstage/plugin-catalog-react@0.1.0
  - @backstage/catalog-model@0.7.2

## 0.3.0

### Minor Changes

- 549a859ac: Improved the UI of the pagerduty plugin, and added a standalone TriggerButton

### Patch Changes

- Updated dependencies [fd3f2a8c0]
- Updated dependencies [d34d26125]
- Updated dependencies [0af242b6d]
- Updated dependencies [f4c2bcf54]
- Updated dependencies [10a0124e0]
- Updated dependencies [07e226872]
- Updated dependencies [f62e7abe5]
- Updated dependencies [96f378d10]
- Updated dependencies [688b73110]
  - @backstage/core@0.6.2
  - @backstage/plugin-catalog-react@0.0.4

## 0.2.8

### Patch Changes

- 29a138636: Use the Luxon Date Library to follow the recommendations of ADR010.
- b288a291e: Migrated to new composability API, exporting the plugin instance as `pagerDutyPlugin`, entity card as `EntityPagerDutyCard`, and entity conditional as `isPagerDutyAvailable`.
- Updated dependencies [19d354c78]
- Updated dependencies [b51ee6ece]
  - @backstage/plugin-catalog-react@0.0.3
  - @backstage/core@0.6.1

## 0.2.7

### Patch Changes

- Updated dependencies [12ece98cd]
- Updated dependencies [d82246867]
- Updated dependencies [c810082ae]
- Updated dependencies [5fa3bdb55]
- Updated dependencies [6e612ce25]
- Updated dependencies [025e122c3]
- Updated dependencies [21e624ba9]
- Updated dependencies [da9f53c60]
- Updated dependencies [32c95605f]
- Updated dependencies [7881f2117]
- Updated dependencies [54c7d02f7]
- Updated dependencies [11cb5ef94]
  - @backstage/core@0.6.0
  - @backstage/theme@0.2.3
  - @backstage/catalog-model@0.7.1

## 0.2.6

### Patch Changes

- Updated dependencies [def2307f3]
- Updated dependencies [efd6ef753]
- Updated dependencies [a187b8ad0]
- Updated dependencies [a93f42213]
  - @backstage/catalog-model@0.7.0
  - @backstage/core@0.5.0

## 0.2.5

### Patch Changes

- b7a124883: Optimize empty state image size.

## 0.2.4

### Patch Changes

- 342270e4d: Create AboutCard in core and use it in pagerduty and catalog plugin
- Updated dependencies [1dc445e89]
- Updated dependencies [342270e4d]
  - @backstage/core@0.4.2

## 0.2.3

### Patch Changes

- 3b50f833d: Supporting Timezones
- Updated dependencies [c911061b7]
- Updated dependencies [8ef71ed32]
- Updated dependencies [0e6298f7e]
- Updated dependencies [ac3560b42]
  - @backstage/catalog-model@0.6.0
  - @backstage/core@0.4.1

## 0.2.2

### Patch Changes

- 6011b7d3e: Added pagerduty plugin to example app
- Updated dependencies [2527628e1]
- Updated dependencies [1c69d4716]
- Updated dependencies [83b6e0c1f]
- Updated dependencies [1665ae8bb]
- Updated dependencies [04f26f88d]
- Updated dependencies [ff243ce96]
  - @backstage/core@0.4.0
  - @backstage/catalog-model@0.5.0
  - @backstage/theme@0.2.2
