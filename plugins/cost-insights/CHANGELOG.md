# @backstage/plugin-cost-insights

## 0.2.0
### Minor Changes

- cab47377: This PR adds Spotify's Cost Insights Tool. Cost Insights explains costs from cloud services in an understandable way, using software terms familiar to your engineers. This tool helps you and your team make trade-offs between cost optimization efforts and your other priorities.
  
  Cost Insights features:
  
  Daily cost graph by team or billing account
  Cost comparison against configurable business metrics
  Insights panels for configurable cloud products your company uses
  Cost alerts and recommendations
  Selectable time periods for month over month, or quarter over quarter cost comparison
  Conversion of cost growth into average engineer cost (configurable) to help optimization trade-off decisions
  
  ![plugin-cost-insights](https://user-images.githubusercontent.com/3030003/94430416-e166d380-0161-11eb-891c-9ce10187683e.gif)
  
  This PR adds the Cost Insights frontend React plugin with a defined CostInsightsApi. We include an example client with static data in the expected format. This API should talk with a cloud billing backend that aggregates billing data from your cloud provider.
  
  Fixes #688 💵
- 6a84cb07: Enable custom alert types in Cost Insights
- e7d4ac7c: - getProjectDailyCost and getGroupDailyCost no longer accept a metric as a parameter
  - getDailyMetricData added to API for fetching daily metric data for given interval
  - dailyCost removed as configurable metric
  - default field added to metric configuration for displaying comparison metric data in top panel
  - Metric.kind can no longer be null
  - MetricData type added

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
  - @backstage/test-utils@0.1.1
