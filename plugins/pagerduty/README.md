# PagerDuty

## Overview

This plugin displays PagerDuty information about an entity such as if there are any active incidents and what the escalation policy is.

There is also an easy way to trigger an alarm directly to the person who is currently on-call.

This plugin requires that entities are annotated with an [integration key](https://support.pagerduty.com/docs/services-and-integrations#add-integrations-to-an-existing-service). See more further down in this document.

This plugin provides:

- A list of incidents
- A way to trigger an alarm to the person on-call
- Information details about the person on-call

## Setup instructions

Install the plugin:

```bash
yarn add @backstage/plugin-pagerduty
```

Add it to the app in `plugins.ts`:

```ts
export { plugin as Pagerduty } from '@backstage/plugin-pagerduty';
```

Add it to the `EntityPage.ts`:

```ts
import {
  isPluginApplicableToEntity as isPagerDutyAvailable,
  PagerDutyCard,
} from '@backstage/plugin-pagerduty';
// add to code
{
  isPagerDutyAvailable(entity) && (
    <Grid item md={6}>
      <EntityPagerDutyCard />
    </Grid>
  );
}
```

## Client configuration

If you want to override the default URL for events, you can add it to `app-config.yaml`.

In `app-config.yaml`:

```yaml
pagerduty:
  eventsBaseUrl: 'https://events.pagerduty.com/v2'
```

## Providing the API Token

In order for the client to make requests to the [PagerDuty API](https://developer.pagerduty.com/docs/rest-api-v2/rest-api/) it needs an [API Token](https://support.pagerduty.com/docs/generating-api-keys#generating-a-general-access-rest-api-key).

Then start the backend passing the token as an environment variable:

```bash
$ PAGERDUTY_TOKEN='Token token=<TOKEN>' yarn start
```

This will proxy the request by adding `Authorization` header with the provided token.

## Integration Key

The information displayed for each entity is based on the [integration key](https://support.pagerduty.com/docs/services-and-integrations#add-integrations-to-an-existing-service).

### Adding the integration key to the entity annotation

If you want to use this plugin for an entity, you need to label it with the below annotation:

```yml
annotations:
  pagerduty.com/integration-key: [INTEGRATION_KEY]
```
