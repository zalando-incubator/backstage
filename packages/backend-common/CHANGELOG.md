# @backstage/backend-common

## 0.2.0
### Minor Changes

- 5249594c: Add service discovery interface and implement for single host deployments
  
  Fixes #1847, #2596
  
  Went with an interface similar to the frontend DiscoveryApi, since it's dead simple but still provides a lot of flexibility in the implementation.
  
  Also ended up with two different methods, one for internal endpoint discovery and one for external. The two use-cases are explained a bit more in the docs, but basically it's service-to-service vs callback URLs.
  
  This did get me thinking about uniqueness and that we're heading towards a global namespace for backend plugin IDs. That's probably fine, but if we're happy with that we should leverage it a bit more to simplify the backend setup. For example we'd have each plugin provide its own ID and not manually mount on paths in the backend.
  
  Draft until we're happy with the implementation, then I can add more docs and changelog entry. Also didn't go on a thorough hunt for places where discovery can be used, but I don't think there are many since it's been pretty awkward to do service-to-service communication.
- 56e4eb58: Make CSP configurable to fix app-backend served app not being able to fetch
  
  See discussion [here on discord](https://discordapp.com/channels/687207715902193673/687235481154617364/758721460163575850)
- e37c0a00: Use localhost to fall back to IPv4 if IPv6 isn't available
- f00ca3cb: Auto-create plugin databases
  
  Relates to #1598.
  
  This creates databases for plugins before handing off control to plugins.
  
  The list of plugins currently need to be hard-coded depending on the installed plugins. A later PR will properly refactor the code to provide a factory pattern where plugins specify what they need, and Knex instances will be provided based on the input.
- 8afce088: Use APP_ENV before NODE_ENV for determining what config to load

### Patch Changes

- 440a17b3: Added new UrlReader interface for reading opaque data from URLs with different providers.
  
  This new URL reading system is intended as a replacement for the various integrations towards
  external systems in the catalog, scaffolder, and techdocs. It is configured via a new top-level
  config section called 'integrations'.
  
  Along with the UrlReader interface is a new UrlReaders class, which exposes static factory
  methods for instantiating readers that can read from many different integrations simultaneously.
- Updated dependencies [ce5512bc]
  - @backstage/config-loader@0.2.0
