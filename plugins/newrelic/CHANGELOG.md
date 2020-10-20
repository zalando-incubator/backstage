# @backstage/plugin-newrelic

## 0.2.0
### Minor Changes

- 28edd7d2: Create backend plugin through CLI
- 4512b996: The New Relic plugin now uses the Backstage proxy to communicate with New Relic's API.
  
  Please update your `app-config.yaml` as follows:
  
  ```yaml
  # Old Config
  newrelic:
    api:
      baseUrl: 'https://api.newrelic.com/v2'
      key: NEW_RELIC_REST_API_KEY
  ```
  
  ```yaml
  # New Config
  proxy:
    '/newrelic/apm/api':
      target: https://api.newrelic.com/v2
      headers:
        X-Api-Key:
          $env: NEW_RELIC_REST_API_KEY
  ```

### Patch Changes

- Updated dependencies [819a7022]
- Updated dependencies [ae598338]
- Updated dependencies [0d4459c0]
- Updated dependencies [482b6313]
- Updated dependencies [1c60f716]
- Updated dependencies [144c66d5]
- Updated dependencies [b79017fd]
- Updated dependencies [782f3b35]
- Updated dependencies [2713f28f]
- Updated dependencies [406015b0]
- Updated dependencies [ac8d5d5c]
- Updated dependencies [ebca83d4]
- Updated dependencies [754e31db]
  - @backstage/core@0.2.0
  - @backstage/theme@0.2.0
