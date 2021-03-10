---
id: architecture-overview
title: Architecture overview
description: Documentation on Architecture overview
---

## Terminology

Backstage is constructed out of three parts. We separate Backstage in this way
because we see three groups of contributors that work with Backstage in three
different ways.

- Core - Base functionality built by core developers in the open source project.
- App - The app is an instance of a Backstage app that is deployed and tweaked.
  The app ties together core functionality with additional plugins. The app is
  built and maintained by app developers, usually a productivity team within a
  company.
- Plugins - Additional functionality to make your Backstage app useful for your
  company. Plugins can be specific to a company or open sourced and reusable. At
  Spotify we have over 100 plugins built by over 50 different teams. It has been
  very powerful to get contributions from various infrastructure teams added
  into a single unified developer experience.

## Overview

The following diagram shows how Backstage might look when deployed inside a
company which uses the Tech Radar plugin, the Lighthouse plugin, the CircleCI
plugin and the service catalog.

There are 3 main components in this architecture:

1. The core Backstage UI
2. The UI plugins and their backing services
3. Databases

Running this architecture in a real environment typically involves
containerising the components. Various commands are provided for accomplishing
this.

![The architecture of a basic Backstage application](../assets/architecture-overview/backstage-typical-architecture.png)

## User Interface

The UI is a thin, client-side wrapper around a set of plugins. It provides some
core UI components and libraries for shared activities such as config
management. [[live demo](https://backstage-demo.roadie.io/)]

![UI with different components highlighted](../assets/architecture-overview/core-vs-plugin-components-highlighted.png)

Each plugin typically makes itself available in the UI on a dedicated URL. For
example, the Lighthouse plugin is registered with the UI on `/lighthouse`.
[[live demo](https://backstage-demo.roadie.io/lighthouse)]

![The lighthouse plugin UI](../assets/architecture-overview/lighthouse-plugin.png)

The CircleCI plugin is available on `/circleci`.

![CircleCI Plugin UI](../assets/architecture-overview/circle-ci.png)

## Plugins and plugin backends

Each plugin is a client side application which mounts itself on the UI. Plugins
are written in TypeScript or JavaScript. They each live in their own directory
in `backstage/plugins`. For example, the source code for the lighthouse plugin
is available at
[backstage/plugins/lighthouse](https://github.com/backstage/backstage/tree/master/plugins/lighthouse).

### Installing plugins

Plugins are typically loaded by the UI in your Backstage applications
`plugins.ts` file. For example,
[here](https://github.com/backstage/backstage/blob/master/packages/app/src/plugins.ts)
is that file in the Backstage sample app.

Plugins can be enabled, and passed configuration in `apis.ts`. For example,
[here](https://github.com/backstage/backstage/blob/master/packages/app/src/apis.ts)
is that file in the Backstage sample app.

This is how the Lighthouse plugin would be enabled in a typical Backstage
application:

```tsx
import { ApiHolder, ApiRegistry } from '@backstage/core';
import {
  lighthouseApiRef,
  LighthouseRestApi,
} from '@backstage/plugin-lighthouse';

const builder = ApiRegistry.builder();

export const lighthouseApi = new LighthouseRestApi(/* URL of the lighthouse microservice! */);
builder.add(lighthouseApiRef, lighthouseApi);

export default builder.build() as ApiHolder;
```

As of this moment, there is no config based install procedure for plugins. Some
code changes are required.

### Plugin architecture

Architecturally, plugins can take three forms:

1. Standalone
2. Service backed
3. Third-party backed

#### Standalone plugins

Standalone plugins run entirely in the browser.
[The Tech Radar plugin](https://backstage-demo.roadie.io/tech-radar), for
example, simply renders hard-coded information. It doesn't make any API requests
to other services.

![tech radar plugin ui](../assets/architecture-overview/tech-radar-plugin.png)

The architecture of the Tech Radar installed into a Backstage app is very
simple.

![ui and tech radar plugin connected together](../assets/architecture-overview/tech-radar-plugin-architecture.png)

#### Service backed plugins

Service backed plugins make API requests to a service which is within the
purview of the organisation running Backstage.

The Lighthouse plugin, for example, makes requests to the
[lighthouse-audit-service](https://github.com/spotify/lighthouse-audit-service).
The `lighthouse-audit-service` is a microservice which runs a copy of Google's
[Lighthouse library](https://github.com/GoogleChrome/lighthouse/) and stores the
results in a PostgreSQL database.

Its architecture looks like this:

![lighthouse plugin backed to microservice and database](../assets/architecture-overview/lighthouse-plugin-architecture.png)

The service catalog in Backstage is another example of a service backed plugin.
It retrieves a list of services, or "entities", from the Backstage Backend
service and renders them in a table for the user.

### Third-party backed plugins

Third-party backed plugins are similar to service backed plugins. The main
difference is that the service which backs the plugin is hosted outside of the
ecosystem of the company hosting Backstage.

The CircleCI plugin is an example of a third-party backed plugin. CircleCI is a
SaaS service which can be used without any knowledge of Backstage. It has an API
which a Backstage plugin consumes to display content.

Requests going to CircleCI from the user's browser are passed through a proxy
service that Backstage provides. Without this, the requests would be blocked by
Cross Origin Resource Sharing policies which prevent a browser page served at
[https://example.com](https://example.com) from serving resources hosted at
https://circleci.com.

![CircleCI plugin talking to proxy talking to SaaS Circle CI](../assets/architecture-overview/circle-ci-plugin-architecture.png)

## Databases

As we have seen, both the `lighthouse-audit-service` and `catalog-backend`
require a database to work with.

The Backstage backend and its builtin plugins are based on the
[Knex](http://knexjs.org/) library, and set up a separate logical database per
plugin. This gives great isolation and lets them perform migrations and evolve
separate from each other.

The Knex library supports a multitude of databases, but Backstage is at the time
of writing tested primarily against two of them: SQLite, which is mainly used as
an in-memory mock/test database, and PostgreSQL, which is the preferred
production database. Other databases such as the MySQL variants are reported to
work but
[aren't tested as fully](https://github.com/backstage/backstage/issues/2460)
yet.

## Containerization

The example Backstage architecture shown above would Dockerize into three
separate Docker images.

1. The frontend container
2. The backend container
3. The Lighthouse audit service container

![Boxes around the architecture to indicate how it is containerised](../assets/architecture-overview/containerised.png)

The backend container can be built by running the following command:

```bash
yarn run docker-build
```

This will create a container called `example-backend`.

The lighthouse-audit-service container is already publicly available in Docker
Hub and can be downloaded and run with

```bash
docker run spotify/lighthouse-audit-service:latest
```
