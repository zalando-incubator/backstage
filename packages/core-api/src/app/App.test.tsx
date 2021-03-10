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

import { renderWithEffects, withLogCollector } from '@backstage/test-utils';
import { lightTheme } from '@backstage/theme';
import { render, screen } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { BrowserRouter, Routes } from 'react-router-dom';
import { createRoutableExtension } from '../extensions';
import { defaultSystemIcons } from '../icons';
import { createPlugin } from '../plugin';
import { useRouteRef } from '../routing/hooks';
import { createExternalRouteRef, createRouteRef } from '../routing/RouteRef';
import { generateBoundRoutes, PrivateAppImpl } from './App';

describe('generateBoundRoutes', () => {
  it('runs happy path', () => {
    const external = { myRoute: createExternalRouteRef({ id: '1' }) };
    const ref = createRouteRef({ path: '', title: '' });
    const result = generateBoundRoutes(({ bind }) => {
      bind(external, { myRoute: ref });
    });

    expect(result.get(external.myRoute)).toBe(ref);
  });

  it('throws on unknown keys', () => {
    const external = { myRoute: createExternalRouteRef({ id: '2' }) };
    const ref = createRouteRef({ path: '', title: '' });
    expect(() =>
      generateBoundRoutes(({ bind }) => {
        bind(external, { someOtherRoute: ref } as any);
      }),
    ).toThrow('Key someOtherRoute is not an existing external route');
  });
});

describe('Integration Test', () => {
  const plugin1RouteRef = createRouteRef({ path: '/blah1', title: '' });
  const plugin2RouteRef = createRouteRef({
    path: '/blah2',
    title: '',
    params: ['x'],
  });
  const err = createExternalRouteRef({ id: 'err' });
  const errParams = createExternalRouteRef({ id: 'errParams', params: ['x'] });
  const errOptional = createExternalRouteRef({
    id: 'errOptional',
    optional: true,
  });
  const errParamsOptional = createExternalRouteRef({
    id: 'errParamsOptional',
    optional: true,
    params: ['x'],
  });

  const plugin1 = createPlugin({
    id: 'blob',
    externalRoutes: {
      err,
      errParams,
      errOptional,
      errParamsOptional,
    },
  });

  const plugin2 = createPlugin({
    id: 'plugin2',
  });

  const HiddenComponent = plugin2.provide(
    createRoutableExtension({
      component: () => Promise.resolve((_: { path?: string }) => <div />),
      mountPoint: plugin2RouteRef,
    }),
  );

  const ExposedComponent = plugin1.provide(
    createRoutableExtension({
      component: () =>
        Promise.resolve((_: PropsWithChildren<{ path?: string }>) => {
          const errLink = useRouteRef(err);
          const errParamsLink = useRouteRef(errParams);
          const errOptionalLink = useRouteRef(errOptional);
          const errParamsOptionalLink = useRouteRef(errParamsOptional);
          return (
            <div>
              <span>err: {errLink()}</span>
              <span>errParams: {errParamsLink({ x: 'a' })}</span>
              <span>errOptional: {errOptionalLink?.() ?? '<none>'}</span>
              <span>
                errParamsOptional:{' '}
                {errParamsOptionalLink?.({ x: 'b' }) ?? '<none>'}
              </span>
            </div>
          );
        }),
      mountPoint: plugin1RouteRef,
    }),
  );

  const components = {
    NotFoundErrorPage: () => null,
    BootErrorPage: () => null,
    Progress: () => null,
    Router: BrowserRouter,
  };

  it('runs happy paths', async () => {
    const app = new PrivateAppImpl({
      apis: [],
      defaultApis: [],
      themes: [
        {
          id: 'light',
          title: 'Light Theme',
          variant: 'light',
          theme: lightTheme,
        },
      ],
      icons: defaultSystemIcons,
      plugins: [],
      components,
      bindRoutes: ({ bind }) => {
        bind(plugin1.externalRoutes, {
          err: plugin1RouteRef,
          errParams: plugin2RouteRef,
          errOptional: plugin1RouteRef,
          errParamsOptional: plugin2RouteRef,
        });
      },
    });

    const Provider = app.getProvider();
    const Router = app.getRouter();

    await renderWithEffects(
      <Provider>
        <Router>
          <Routes>
            <ExposedComponent path="/" />
            <HiddenComponent path="/foo" />
          </Routes>
        </Router>
      </Provider>,
    );

    expect(screen.getByText('err: /')).toBeInTheDocument();
    expect(screen.getByText('errParams: /foo')).toBeInTheDocument();
    expect(screen.getByText('errOptional: /')).toBeInTheDocument();
    expect(screen.getByText('errParamsOptional: /foo')).toBeInTheDocument();
  });

  it('runs happy paths without optional routes', async () => {
    const app = new PrivateAppImpl({
      apis: [],
      defaultApis: [],
      themes: [
        {
          id: 'light',
          title: 'Light Theme',
          variant: 'light',
          theme: lightTheme,
        },
      ],
      icons: defaultSystemIcons,
      plugins: [],
      components,
      bindRoutes: ({ bind }) => {
        bind(plugin1.externalRoutes, {
          err: plugin1RouteRef,
          errParams: plugin2RouteRef,
        });
      },
    });

    const Provider = app.getProvider();
    const Router = app.getRouter();

    await renderWithEffects(
      <Provider>
        <Router>
          <Routes>
            <ExposedComponent path="/" />
            <HiddenComponent path="/foo" />
          </Routes>
        </Router>
      </Provider>,
    );

    expect(screen.getByText('err: /')).toBeInTheDocument();
    expect(screen.getByText('errParams: /foo')).toBeInTheDocument();
    expect(screen.getByText('errOptional: <none>')).toBeInTheDocument();
    expect(screen.getByText('errParamsOptional: <none>')).toBeInTheDocument();
  });

  it('should throw some error when the route has duplicate params', () => {
    const app = new PrivateAppImpl({
      apis: [],
      defaultApis: [],
      themes: [
        {
          id: 'light',
          title: 'Light Theme',
          variant: 'light',
          theme: lightTheme,
        },
      ],
      icons: defaultSystemIcons,
      plugins: [],
      components,
      bindRoutes: ({ bind }) => {
        bind(plugin1.externalRoutes, {
          err: plugin1RouteRef,
          errParams: plugin2RouteRef,
        });
      },
    });

    const Provider = app.getProvider();
    const Router = app.getRouter();
    const { error: errorLogs } = withLogCollector(() => {
      expect(() =>
        render(
          <Provider>
            <Router>
              <Routes>
                <ExposedComponent path="/test/:thing">
                  <HiddenComponent path="/some/:thing" />
                </ExposedComponent>
              </Routes>
            </Router>
          </Provider>,
        ),
      ).toThrow(
        'Parameter :thing is duplicated in path /test/:thing/some/:thing',
      );
    });
    expect(errorLogs).toEqual([
      expect.stringContaining(
        'Parameter :thing is duplicated in path /test/:thing/some/:thing',
      ),
      expect.stringContaining(
        'The above error occurred in the <Provider> component',
      ),
    ]);
  });
});
