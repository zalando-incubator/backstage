---
id: create-an-app
title: Create an App
description: Documentation on Creating an App
---

To get set up quickly with your own Backstage project you can create a Backstage
App.

A Backstage App is a monorepo setup with `lerna` that includes everything you
need to run Backstage in your own environment.

## Create an app

To create a Backstage app, you will need to have
[Node.js](https://nodejs.org/en/download/) Active LTS Release installed
(currently v14).

Backstage provides a utility for creating new apps. It guides you through the
initial setup of selecting the name of the app and a database for the backend.
The database options are either SQLite or PostgreSQL, where the latter requires
you to set up a separate database instance. If in doubt, choose SQLite, but
don't worry about the choice, it's easy to change later!

The easiest way to run the create app package is with `npx`:

```bash
npx @backstage/create-app
```

This will create a new Backstage App inside the current folder. The name of the
app-folder is the name that was provided when prompted.

<p align='center'>
  <img src='../assets/getting-started/create-app_output.png' width='600' alt='create app'>
</p>

Inside that directory, it will generate all the files and folder structure
needed for you to run your app.

### Linking in local Backstage packages

It can often be useful to try out changes to the packages in the main Backstage
repo within your own app. For example if you want to make modifications to
`@backstage/core` and try them out in your app.

To link in external packages, add them to your `package.json` and `lerna.json`
workspace paths. These can be either relative or absolute paths with or without
globs. For example:

```json
"packages": [
  "packages/*",
  "plugins/*",
  "../backstage/packages/core", // New path added to work on @backstage/core
],
```

Then reinstall packages to make yarn set up symlinks:

```bash
yarn install
```

With this in place you can now modify the `@backstage/core` package within the
main repo, and have those changes be reflected and tested in your app. Simply
run your app using `yarn start` as normal.

Note that for backend packages you need to make sure that linked packages are
not dependencies of any non-linked package. If you for example want to work on
`@backstage/backend-common`, you need to also link in other backend plugins and
packages that depend on `@backstage/backend-common`, or temporarily disable
those plugins in your backend. This is because the transformation of backend
module tree stops whenever a non-local package is encountered, and from that
point node will `require` packages directly for that entire module subtree.

### Troubleshooting

The create app command doesn't always work as expected, this is a collection of
some of the commonly encountered issues and solutions.

#### Couldn't find any versions for "file-saver"

You may encounter the following error message:

```text
Couldn't find any versions for "file-saver" that matches "eligrey-FileSaver.js-1.3.8.tar.gz-art-external"
```

This is likely because you have a globally configured npm proxy, which breaks
the installation of the `material-table` dependency. This is a known issue and
being worked on in `material-table`, but for now you can work around it using
the following:

```bash
NPM_CONFIG_REGISTRY=https://registry.npmjs.org npx @backstage/create-app
```

#### Can't find Python executable "python"

The install process may also fail if no Python installation is available. Python
is commonly available in most systems already, but if it isn't you can head for
example [here](https://www.python.org/downloads/) to install it.

### General folder structure

Below is a simplified layout of the files and folders generated when creating an
app.

```
app
├── app-config.yaml
├── catalog-info.yaml
├── lerna.json
├── package.json
└── packages
    ├── app
    └── backend
```

- **app-config.yaml**: Main configuration file for the app. See
  [Configuration](https://backstage.io/docs/conf/) for more information.
- **catalog-info.yaml**: Catalog Entities descriptors. See
  [Descriptor Format of Catalog Entities](https://backstage.io/docs/features/software-catalog/descriptor-format)
  to get started.
- **lerna.json**: Contains information about workspaces and other lerna
  configuration needed for the monorepo setup.
- **package.json**: Root package.json for the project. _Note: Be sure that you
  don't add any npm dependencies here as they probably should be installed in
  the intended workspace rather than in the root._
- **packages/**: Lerna leaf packages or "workspaces". Everything here is going
  to be a separate package, managed by lerna.
- **packages/app/**: An fully functioning Backstage frontend app, that acts as a
  good starting point for you to get to know Backstage.
- **packages/backend/**: We include a backend that helps power features such as
  [Authentication](https://backstage.io/docs/auth/),
  [Software Catalog](https://backstage.io/docs/features/software-catalog/software-catalog-overview),
  [Software Templates](https://backstage.io/docs/features/software-templates/software-templates-index)
  and [TechDocs](https://backstage.io/docs/features/techdocs/techdocs-overview)
  amongst other things.

## Run the app

When the installation is complete you can open the app folder and start the app.

```bash
cd my-backstage-app
yarn start
```

_When `yarn start` is ready it should open up a browser window displaying your
app, if not you can navigate to `http://localhost:3000`._

In most cases you will want to start the backend as well, as it is required for
the catalog to work, along with many other plugins.

To start the backend, open a separate terminal session and run the following in
the root directory:

```bash
yarn workspace backend start
```

### Troubleshooting

#### Cannot find module

You may encounter an error similar to below:

```
internal/modules/cjs/loader.js:968
  throw err;
  ^

Error: Cannot find module '../build/Debug/nodegit.node'
```

This can occur if an npm dependency is not completely installed. Because some
dependencies run a post-install script, ensure that both your npm and yarn
configs have the `ignore-scripts` flag set to `false`.
