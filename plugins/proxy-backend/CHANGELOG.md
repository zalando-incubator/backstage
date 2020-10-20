# @backstage/plugin-proxy-backend

## 0.2.0
### Minor Changes

- 5249594c: Add service discovery interface and implement for single host deployments
  
  Fixes #1847, #2596
  
  Went with an interface similar to the frontend DiscoveryApi, since it's dead simple but still provides a lot of flexibility in the implementation.
  
  Also ended up with two different methods, one for internal endpoint discovery and one for external. The two use-cases are explained a bit more in the docs, but basically it's service-to-service vs callback URLs.
  
  This did get me thinking about uniqueness and that we're heading towards a global namespace for backend plugin IDs. That's probably fine, but if we're happy with that we should leverage it a bit more to simplify the backend setup. For example we'd have each plugin provide its own ID and not manually mount on paths in the backend.
  
  Draft until we're happy with the implementation, then I can add more docs and changelog entry. Also didn't go on a thorough hunt for places where discovery can be used, but I don't think there are many since it's been pretty awkward to do service-to-service communication.
- 9226c2aa: Limit the http headers that are forwarded from the request to a safe set of defaults.
  A user can configure additional headers that should be forwarded if the specific applications needs that.
  
  ```yaml
  proxy:
    '/my-api':
      target: 'https://my-api.com/get'
      allowedHeaders:
        # We need to forward the Authorization header that was provided by the caller
        - Authorization
  ```

### Patch Changes

- Updated dependencies [5249594c]
- Updated dependencies [56e4eb58]
- Updated dependencies [e37c0a00]
- Updated dependencies [f00ca3cb]
- Updated dependencies [440a17b3]
- Updated dependencies [8afce088]
  - @backstage/backend-common@0.2.0
