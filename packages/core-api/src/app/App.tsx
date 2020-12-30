/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, {
  ComponentType,
  PropsWithChildren,
  ReactElement,
  useMemo,
  useState,
} from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAsync } from 'react-use';
import {
  AnyApiFactory,
  ApiHolder,
  ApiProvider,
  ApiRegistry,
  AppTheme,
  appThemeApiRef,
  AppThemeSelector,
  configApiRef,
  ConfigReader,
  LocalStorageFeatureFlags,
  useApi,
} from '../apis';
import {
  AppThemeApi,
  ConfigApi,
  featureFlagsApiRef,
  identityApiRef,
} from '../apis/definitions';
import { ApiFactoryRegistry, ApiResolver } from '../apis/system';
import {
  childDiscoverer,
  routeElementDiscoverer,
  traverseElementTree,
} from '../extensions/traversal';
import { IconComponent, SystemIconKey, SystemIcons } from '../icons';
import { BackstagePlugin } from '../plugin';
import { RouteRef } from '../routing';
import {
  routeObjectCollector,
  routeParentCollector,
  routePathCollector,
} from '../routing/collectors';
import { RoutingProvider, validateRoutes } from '../routing/hooks';
import { ExternalRouteRef } from '../routing/RouteRef';
import { AppContextProvider } from './AppContext';
import { AppIdentity } from './AppIdentity';
import { AppThemeProvider } from './AppThemeProvider';
import {
  AppComponents,
  AppConfigLoader,
  AppOptions,
  AppRouteBinder,
  BackstageApp,
  SignInPageProps,
  SignInResult,
} from './types';

export function generateBoundRoutes(
  bindRoutes: AppOptions['bindRoutes'],
): Map<ExternalRouteRef, RouteRef> {
  const result = new Map<ExternalRouteRef, RouteRef>();

  if (bindRoutes) {
    const bind: AppRouteBinder = (externalRoutes, targetRoutes) => {
      for (const [key, value] of Object.entries(targetRoutes)) {
        const externalRoute = externalRoutes[key];
        if (!externalRoute) {
          throw new Error(`Key ${key} is not an existing external route`);
        }

        result.set(externalRoute, value);
      }
    };
    bindRoutes({ bind });
  }

  return result;
}

type FullAppOptions = {
  apis: Iterable<AnyApiFactory>;
  icons: SystemIcons;
  plugins: BackstagePlugin<any, any>[];
  components: AppComponents;
  themes: AppTheme[];
  configLoader?: AppConfigLoader;
  defaultApis: Iterable<AnyApiFactory>;
  bindRoutes?: AppOptions['bindRoutes'];
};

function useConfigLoader(
  configLoader: AppConfigLoader | undefined,
  components: AppComponents,
  appThemeApi: AppThemeApi,
): { api: ConfigApi } | { node: JSX.Element } {
  // Keeping this synchronous when a config loader isn't set simplifies tests a lot
  const hasConfig = Boolean(configLoader);
  const config = useAsync(configLoader || (() => Promise.resolve([])));

  let noConfigNode = undefined;

  if (hasConfig && config.loading) {
    const { Progress } = components;
    noConfigNode = <Progress />;
  } else if (config.error) {
    const { BootErrorPage } = components;
    noConfigNode = <BootErrorPage step="load-config" error={config.error} />;
  }

  // Before the config is loaded we can't use a router, so exit early
  if (noConfigNode) {
    return {
      node: (
        <ApiProvider apis={ApiRegistry.from([[appThemeApiRef, appThemeApi]])}>
          <AppThemeProvider>{noConfigNode}</AppThemeProvider>
        </ApiProvider>
      ),
    };
  }

  const configReader = ConfigReader.fromConfigs(config.value ?? []);

  return { api: configReader };
}

export class PrivateAppImpl implements BackstageApp {
  private apiHolder?: ApiHolder;
  private configApi?: ConfigApi;

  private readonly apis: Iterable<AnyApiFactory>;
  private readonly icons: SystemIcons;
  private readonly plugins: BackstagePlugin<any, any>[];
  private readonly components: AppComponents;
  private readonly themes: AppTheme[];
  private readonly configLoader?: AppConfigLoader;
  private readonly defaultApis: Iterable<AnyApiFactory>;
  private readonly bindRoutes: AppOptions['bindRoutes'];

  private readonly identityApi = new AppIdentity();

  constructor(options: FullAppOptions) {
    this.apis = options.apis;
    this.icons = options.icons;
    this.plugins = options.plugins;
    this.components = options.components;
    this.themes = options.themes;
    this.configLoader = options.configLoader;
    this.defaultApis = options.defaultApis;
    this.bindRoutes = options.bindRoutes;
  }

  getPlugins(): BackstagePlugin<any, any>[] {
    return this.plugins;
  }

  getSystemIcon(key: SystemIconKey): IconComponent {
    return this.icons[key];
  }

  getRoutes(): JSX.Element[] {
    const routes = new Array<JSX.Element>();

    const featureFlagsApi = this.getApiHolder().get(featureFlagsApiRef)!;

    const { NotFoundErrorPage } = this.components;

    for (const plugin of this.plugins.values()) {
      for (const output of plugin.output()) {
        switch (output.type) {
          case 'legacy-route': {
            const { path, component: Component } = output;
            routes.push(
              <Route key={path} path={path} element={<Component />} />,
            );
            break;
          }
          case 'route': {
            const { target, component: Component } = output;
            routes.push(
              <Route
                key={`${plugin.getId()}-${target.path}`}
                path={target.path}
                element={<Component />}
              />,
            );
            break;
          }
          case 'legacy-redirect-route': {
            const { path, target } = output;
            routes.push(<Navigate key={path} to={target} />);
            break;
          }
          case 'redirect-route': {
            const { from, to } = output;
            routes.push(<Navigate key={from.path} to={to.path} />);
            break;
          }
          case 'feature-flag': {
            featureFlagsApi.registerFlag({
              name: output.name,
              pluginId: plugin.getId(),
            });
            break;
          }
          default:
            break;
        }
      }
    }

    routes.push(
      <Route
        key="not-found-error-page"
        path="/*"
        element={<NotFoundErrorPage />}
      />,
    );

    return routes;
  }

  getProvider(): ComponentType<{}> {
    const Provider = ({ children }: PropsWithChildren<{}>) => {
      const appThemeApi = useMemo(
        () => AppThemeSelector.createWithStorage(this.themes),
        [],
      );

      const { routePaths, routeParents, routeObjects } = useMemo(() => {
        const result = traverseElementTree({
          root: children,
          discoverers: [childDiscoverer, routeElementDiscoverer],
          collectors: {
            routePaths: routePathCollector,
            routeParents: routeParentCollector,
            routeObjects: routeObjectCollector,
          },
        });

        validateRoutes(result.routePaths, result.routeParents);

        return result;
      }, [children]);

      const loadedConfig = useConfigLoader(
        this.configLoader,
        this.components,
        appThemeApi,
      );

      if ('node' in loadedConfig) {
        // Loading or error
        return loadedConfig.node;
      }

      this.configApi = loadedConfig.api;

      return (
        <ApiProvider apis={this.getApiHolder()}>
          <AppContextProvider app={this}>
            <AppThemeProvider>
              <RoutingProvider
                routePaths={routePaths}
                routeParents={routeParents}
                routeObjects={routeObjects}
                routeBindings={generateBoundRoutes(this.bindRoutes)}
              >
                {children}
              </RoutingProvider>
            </AppThemeProvider>
          </AppContextProvider>
        </ApiProvider>
      );
    };
    return Provider;
  }

  getRouter(): ComponentType<{}> {
    const {
      Router: RouterComponent,
      SignInPage: SignInPageComponent,
    } = this.components;

    // This wraps the sign-in page and waits for sign-in to be completed before rendering the app
    const SignInPageWrapper = ({
      component: Component,
      children,
    }: {
      component: ComponentType<SignInPageProps>;
      children: ReactElement;
    }) => {
      const [result, setResult] = useState<SignInResult>();

      if (result) {
        this.identityApi.setSignInResult(result);
        return children;
      }

      return <Component onResult={setResult} />;
    };

    const AppRouter = ({ children }: PropsWithChildren<{}>) => {
      const configApi = useApi(configApiRef);

      let { pathname } = new URL(
        configApi.getOptionalString('app.baseUrl') ?? '/',
        'http://dummy.dev', // baseUrl can be specified as just a path
      );
      if (pathname.endsWith('/')) {
        pathname = pathname.replace(/\/$/, '');
      }

      // If the app hasn't configured a sign-in page, we just continue as guest.
      if (!SignInPageComponent) {
        this.identityApi.setSignInResult({
          userId: 'guest',
          profile: {
            email: 'guest@example.com',
            displayName: 'Guest',
          },
        });

        return (
          <RouterComponent>
            <Routes>
              <Route path={`${pathname}/*`} element={<>{children}</>} />
            </Routes>
          </RouterComponent>
        );
      }

      return (
        <RouterComponent>
          <SignInPageWrapper component={SignInPageComponent}>
            <Routes>
              <Route path={`${pathname}/*`} element={<>{children}</>} />
            </Routes>
          </SignInPageWrapper>
        </RouterComponent>
      );
    };

    return AppRouter;
  }

  private getApiHolder(): ApiHolder {
    if (this.apiHolder) {
      return this.apiHolder;
    }

    const registry = new ApiFactoryRegistry();

    registry.register('static', {
      api: appThemeApiRef,
      deps: {},
      factory: () => AppThemeSelector.createWithStorage(this.themes),
    });
    registry.register('static', {
      api: configApiRef,
      deps: {},
      factory: () => {
        if (!this.configApi) {
          throw new Error(
            'Tried to access config API before config was loaded',
          );
        }
        return this.configApi;
      },
    });
    registry.register('static', {
      api: identityApiRef,
      deps: {},
      factory: () => this.identityApi,
    });

    // It's possible to replace the feature flag API, but since we must have at least
    // one implementation we add it here directly instead of through the defaultApis.
    registry.register('default', {
      api: featureFlagsApiRef,
      deps: {},
      factory: () => new LocalStorageFeatureFlags(),
    });
    for (const factory of this.defaultApis) {
      registry.register('default', factory);
    }

    for (const plugin of this.plugins) {
      for (const factory of plugin.getApis()) {
        if (!registry.register('default', factory)) {
          throw new Error(
            `Plugin ${plugin.getId()} tried to register duplicate or forbidden API factory for ${
              factory.api
            }`,
          );
        }
      }
    }

    for (const factory of this.apis) {
      if (!registry.register('app', factory)) {
        throw new Error(
          `Duplicate or forbidden API factory for ${factory.api} in app`,
        );
      }
    }

    ApiResolver.validateFactories(registry, registry.getAllApis());

    this.apiHolder = new ApiResolver(registry);

    return this.apiHolder;
  }

  verify() {
    const pluginIds = new Set<string>();

    for (const plugin of this.plugins) {
      const id = plugin.getId();
      if (pluginIds.has(id)) {
        throw new Error(`Duplicate plugin found '${id}'`);
      }
      pluginIds.add(id);
    }
  }
}
