# @backstage/create-app

## 0.2.0
### Minor Changes

- 6d29605d: Change the default backend plugin mount point to /api
- 5249594c: Add service discovery interface and implement for single host deployments
  
  Fixes #1847, #2596
  
  Went with an interface similar to the frontend DiscoveryApi, since it's dead simple but still provides a lot of flexibility in the implementation.
  
  Also ended up with two different methods, one for internal endpoint discovery and one for external. The two use-cases are explained a bit more in the docs, but basically it's service-to-service vs callback URLs.
  
  This did get me thinking about uniqueness and that we're heading towards a global namespace for backend plugin IDs. That's probably fine, but if we're happy with that we should leverage it a bit more to simplify the backend setup. For example we'd have each plugin provide its own ID and not manually mount on paths in the backend.
  
  Draft until we're happy with the implementation, then I can add more docs and changelog entry. Also didn't go on a thorough hunt for places where discovery can be used, but I don't think there are many since it's been pretty awkward to do service-to-service communication.
- 56e4eb58: Make CSP configurable to fix app-backend served app not being able to fetch
  
  See discussion [here on discord](https://discordapp.com/channels/687207715902193673/687235481154617364/758721460163575850)
- d7873e1a: Default to using internal scope for new plugins
- 6f447b3f: Remove identity-backend
  
  Not used, and we're heading down the route of identities in the catalog
- 61db1ddc: Allow node v14 and add to master build matrix
  
  - Upgrade sqlite3@^5.0.0 in @backstage/plugin-catalog-backend
  - Add Node 14 to engines in @backstage/create-app
- a768a07f: Add the ability to import users from GitHub Organization into the catalog.
  
  The token needs to have the scopes `user:email`, `read:user`, and `read:org`.
- f00ca3cb: Auto-create plugin databases
  
  Relates to #1598.
  
  This creates databases for plugins before handing off control to plugins.
  
  The list of plugins currently need to be hard-coded depending on the installed plugins. A later PR will properly refactor the code to provide a factory pattern where plugins specify what they need, and Knex instances will be provided based on the input.
- 7aff112a: The default mount point for backend plugins have been changed to /api. These changes are done in the backend package itself, so it is recommended that you sync up existing backend packages with this new pattern.

### Patch Changes

- e67d49bf: Sync scaffolded backend with example
- 961414d5: Remove discovery api override
- 440a17b3: Bump @backstage/catalog-backend and pass the now required UrlReader interface to the plugin
- 5a920c6e: Updated naming of environment variables. New pattern [NAME]\_TOKEN for Github, Gitlab, Azure & Github enterprise access tokens.
  
  ### Detail:
  
  - Previously we have to export same token for both, catalog & scaffolder
  
  ```bash
  export GITHUB_ACCESS_TOKEN=foo
  export GITHUB_PRIVATE_TOKEN=foo
  ```
  
  with latest changes, only single export is sufficient.
  
  ```bash
  export GITHUB_TOKEN=foo
  export GITLAB_TOKEN=foo
  export GHE_TOKEN=foo
  export AZURE_TOKEN=foo
  ```
  
  ### list:
  
  <table>
    <tr>
      <th>Old name</th>
      <th>New name</th>
    </tr>
    <tr>
      <td>GITHUB_ACCESS_TOKEN</td>
      <td>GITHUB_TOKEN</td>
    </tr>
    <tr>
      <td>GITHUB_PRIVATE_TOKEN</td>
      <td>GITHUB_TOKEN</td>
    </tr>
    <tr>
      <td>GITLAB_ACCESS_TOKEN</td>
      <td>GITLAB_TOKEN</td>
    </tr>
    <tr>
      <td>GITLAB_PRIVATE_TOKEN</td>
      <td>GITLAB_TOKEN</td>
    </tr>
    <tr>
      <td>AZURE_PRIVATE_TOKEN</td>
      <td>AZURE_TOKEN</td>
    </tr>
    <tr>
      <td>GHE_PRIVATE_TOKEN</td>
      <td>GHE_TOKEN</td>
    </tr>
  </table>
- 67d76b41: Fix for configured templates using 'url' locations even though it's not supported yet
