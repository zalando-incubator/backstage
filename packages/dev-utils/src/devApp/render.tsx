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

import { hot } from 'react-hot-loader';
import React, { ComponentType, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import BookmarkIcon from '@material-ui/icons/Bookmark';
import {
  createApp,
  SidebarPage,
  Sidebar,
  SidebarItem,
  SidebarSpacer,
  ApiFactory,
  createPlugin,
  AlertDisplay,
  OAuthRequestDialog,
  AnyApiFactory,
  IconComponent,
  FlatRoutes,
  attachComponentData,
} from '@backstage/core';
import SentimentDissatisfiedIcon from '@material-ui/icons/SentimentDissatisfied';
import { Outlet } from 'react-router';

const GatheringRoute: (props: {
  path: string;
  children: JSX.Element;
}) => JSX.Element = () => <Outlet />;

attachComponentData(GatheringRoute, 'core.gatherMountPoints', true);

type RegisterPageOptions = {
  element: JSX.Element;
  title?: string;
  icon?: IconComponent;
};

// TODO(rugvip): export proper plugin type from core that isn't the plugin class
type BackstagePlugin = ReturnType<typeof createPlugin>;

/**
 * DevApp builder that is similar to the App builder API, but creates an App
 * with the purpose of developing one or more plugins inside it.
 */
class DevAppBuilder {
  private readonly plugins = new Array<BackstagePlugin>();
  private readonly apis = new Array<AnyApiFactory>();
  private readonly rootChildren = new Array<ReactNode>();
  private readonly routes = new Array<JSX.Element>();
  private readonly sidebarItems = new Array<JSX.Element>();

  /**
   * Register one or more plugins to render in the dev app
   */
  registerPlugin(...plugins: BackstagePlugin[]): DevAppBuilder {
    this.plugins.push(...plugins);
    return this;
  }

  /**
   * Register an API factory to add to the app
   */
  registerApi<
    Api,
    Impl extends Api,
    Deps extends { [name in string]: unknown }
  >(factory: ApiFactory<Api, Impl, Deps>): DevAppBuilder {
    this.apis.push(factory);
    return this;
  }

  /**
   * Adds a React node to place just inside the App Provider.
   *
   * Useful for adding more global components like the AlertDisplay.
   */
  addRootChild(node: ReactNode): DevAppBuilder {
    this.rootChildren.push(node);
    return this;
  }

  addPage({ element, title, icon }: RegisterPageOptions): DevAppBuilder {
    const path = `/page-${this.routes.length + 1}`;
    this.sidebarItems.push(
      <SidebarItem
        key={path}
        to={path}
        text={title ?? path}
        icon={icon ?? BookmarkIcon}
      />,
    );
    this.routes.push(
      <GatheringRoute key={path} path={path} children={element} />,
    );
    return this;
  }
  /**
   * Build a DevApp component using the resources registered so far
   */
  build(): ComponentType<{}> {
    const app = createApp({
      apis: this.apis,
      plugins: this.plugins,
    });

    const AppProvider = app.getProvider();
    const AppRouter = app.getRouter();
    const deprecatedAppRoutes = app.getRoutes();

    const sidebar = this.setupSidebar(this.plugins);

    const DevApp = () => {
      return (
        <AppProvider>
          <AlertDisplay />
          <OAuthRequestDialog />
          {this.rootChildren}

          <AppRouter>
            <SidebarPage>
              {sidebar}
              <FlatRoutes>
                {this.routes}
                {deprecatedAppRoutes}
              </FlatRoutes>
            </SidebarPage>
          </AppRouter>
        </AppProvider>
      );
    };

    return DevApp;
  }

  /**
   * Build and render directory to #root element, with react hot loading.
   */
  render(): void {
    const hotModule =
      require.cache['./dev/index.tsx'] ??
      require.cache['./dev/index.ts'] ??
      module;

    const DevApp = hot(hotModule)(this.build());

    const paths = this.findPluginPaths(this.plugins);

    if (window.location.pathname === '/') {
      if (!paths.includes('/') && paths.length > 0) {
        window.location.pathname = paths[0];
      }
    }

    ReactDOM.render(<DevApp />, document.getElementById('root'));
  }

  // Create a sidebar that exposes the touchpoints of a plugin
  private setupSidebar(plugins: BackstagePlugin[]): JSX.Element {
    const sidebarItems = new Array<JSX.Element>();
    for (const plugin of plugins) {
      for (const output of plugin.output()) {
        switch (output.type) {
          case 'legacy-route': {
            const { path } = output;
            sidebarItems.push(
              <SidebarItem
                key={path}
                to={path}
                text={path}
                icon={BookmarkIcon}
              />,
            );
            break;
          }
          case 'route': {
            const { target } = output;
            sidebarItems.push(
              <SidebarItem
                key={target.path}
                to={target.path}
                text={target.title}
                icon={target.icon ?? SentimentDissatisfiedIcon}
              />,
            );
            break;
          }
          default:
            break;
        }
      }
    }

    return (
      <Sidebar>
        <SidebarSpacer />
        {this.sidebarItems}
        {sidebarItems}
      </Sidebar>
    );
  }

  private findPluginPaths(plugins: BackstagePlugin[]) {
    const paths = new Array<string>();

    for (const plugin of plugins) {
      for (const output of plugin.output()) {
        switch (output.type) {
          case 'legacy-route': {
            paths.push(output.path);
            break;
          }
          case 'route': {
            paths.push(output.target.path);
            break;
          }
          default:
            break;
        }
      }
    }

    return paths;
  }
}

// TODO(rugvip): Figure out patterns for how to allow in-house apps to build upon
// this to provide their own plugin dev wrappers.

/**
 * Creates a dev app for rendering one or more plugins and exposing the touch points of the plugin.
 */
export function createDevApp() {
  return new DevAppBuilder();
}
