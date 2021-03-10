---
id: installation
title: Installing in your Backstage App
description: Documentation on How to install Backstage Plugin
---

The catalog plugin comes in two packages, `@backstage/plugin-catalog` and
`@backstage/plugin-catalog-backend`. Each has their own installation steps,
outlined below.

## Installing @backstage/plugin-catalog

> **Note that if you used `npx @backstage/create-app`, the plugin may already be
> present**

The catalog frontend plugin should be installed in your `app` package, which is
created as a part of `@backstage/create-app`. To install the package, run:

```bash
cd packages/app
yarn add @backstage/plugin-catalog
```

Make sure the version of `@backstage/plugin-catalog` matches the version of
other `@backstage` packages. You can update it in `packages/app/package.json` if
it doesn't.

### Adding the Plugin to your `packages/app`

Add the following entry to the head of your `packages/app/src/plugins.ts`:

```ts
export { catalogPlugin } from '@backstage/plugin-catalog';
```

Next we need to install the two pages that the catalog plugin provides. You can
choose any name for these routes, but we recommend the following:

```tsx
import {
  catalogPlugin,
  CatalogIndexPage,
  CatalogEntityPage,
} from '@backstage/plugin-catalog';

// Add to the top-level routes, directly within <FlatRoutes>
<Route path="/catalog" element={<CatalogIndexPage />} />
<Route path="/catalog/:namespace/:kind/:name" element={<CatalogEntityPage />}>
  {/*
    This is the root of the custom entity pages for your app, refer to the example app
    in the main repo or the output of @backstage/create-app for an example
  */}
  <EntityPage />
</Route>
```

The catalog plugin also has one external route that needs to be bound for it to
function: the `createComponent` route which should link to the page where the
user can create components. In a typical setup the create component route will
be linked to the Scaffolder plugin's template index page:

```ts
import { catalogPlugin } from '@backstage/plugin-catalog';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';

const app = createApp({
  // ...
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, {
      createComponent: scaffolderPlugin.routes.root,
    });
  },
});
```

You may also want to add a link to the catalog index page to your sidebar:

```tsx
import HomeIcon from '@material-ui/icons/Home';

// Somewhere within the <Sidebar>
<SidebarItem icon={HomeIcon} to="/catalog" text="Home" />;
```

This is all that is needed for the frontend part of the Catalog plugin to work!

## Gotchas that we will fix

Since the catalog plugin currently ships with a sentry plugin `InfoCard`
installed by default, you'll need to set `sentry.organization` in your
`app-yaml.yaml`. For example:

```yaml
sentry:
  organization: Acme Corporation
```

If you've created an app with an older version of `@backstage/create-app` or
`@backstage/cli create-app`, be sure to remove the Welcome plugin from the app,
as that will conflict with the catalog routes.

## Installing @backstage/plugin-catalog-backend

> **Note that if you used `npx @backstage/create-app`, the plugin may already be
> present**

The catalog backend should be installed in your `backend` package, which is
created as a part of `@backstage/create-app`. To install the package, run:

```bash
cd packages/backend
yarn add @backstage/plugin-catalog-backend
```

Make sure the version of `@backstage/plugin-catalog-backend` matches the version
of other `@backstage` packages. You can update it in
`packages/backend/package.json` if it doesn't.

### Adding the Plugin to your `packages/backend`

You'll need to add the plugin to the `backend`'s router. You can do this by
creating a file called `packages/backend/src/plugins/catalog.ts` with the
following contents to get you up and running quickly.

```ts
import {
  createRouter,
  DatabaseEntitiesCatalog,
  DatabaseLocationsCatalog,
  DatabaseManager,
  HigherOrderOperations,
  LocationReaders,
  runPeriodically,
} from '@backstage/plugin-catalog-backend';
import { PluginEnvironment } from '../types';
import { useHotCleanup } from '@backstage/backend-common';

export default async function createPlugin({
  logger,
  database,
}: PluginEnvironment) {
  const locationReader = new LocationReaders(logger);

  const db = await DatabaseManager.createDatabase(database, { logger });
  const entitiesCatalog = new DatabaseEntitiesCatalog(db);
  const locationsCatalog = new DatabaseLocationsCatalog(db);
  const higherOrderOperation = new HigherOrderOperations(
    entitiesCatalog,
    locationsCatalog,
    locationReader,
    db,
    logger,
  );

  useHotCleanup(
    module,
    runPeriodically(() => higherOrderOperation.refreshAllLocations(), 10000),
  );

  return await createRouter({
    entitiesCatalog,
    locationsCatalog,
    higherOrderOperation,
    logger,
  });
}
```

Once the `catalog.ts` router setup file is in place, add the router to
`packages/backend/src/index.ts`:

```ts
import catalog from './plugins/catalog';

const catalogEnv = useHotMemoize(module, () => createEnv('catalog'));

const service = createServiceBuilder(module)
  .loadConfig(configReader)
  /** several different routers */
  .addRouter('/catalog', await catalog(catalogEnv));
```

### Adding Entries to the Catalog

At this point the catalog backend is installed in your backend package, but you
will not have any entities loaded.

To get up and running and try out some templates quickly, you can add some of
our example templates through static configuration. Add the following to the
`catalog.locations` section in your `app-config.yaml`:

```yaml
catalog:
  locations:
    # Backstage Example Component
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/artist-lookup-component.yaml
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/playback-order-component.yaml
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/podcast-api-component.yaml
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/queue-proxy-component.yaml
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/searcher-component.yaml
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/playback-lib-component.yaml
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/www-artist-component.yaml
    - type: url
      target: https://github.com/backstage/backstage/blob/master/packages/catalog-model/examples/shuffle-api-component.yaml
```

### Running the Backend

Finally, start up the backend with the new configuration:

```bash
cd packages/backend
yarn start
```

If you've also set up the frontend plugin, so you should be ready to go browse
the catalog at [localhost:3000](http://localhost:3000) now!
