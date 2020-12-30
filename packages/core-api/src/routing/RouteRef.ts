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

import { RouteRefConfig, RouteRef } from './types';

export class AbsoluteRouteRef<Params extends { [param in string]: string }> {
  constructor(private readonly config: RouteRefConfig<Params>) {}

  get icon() {
    return this.config.icon;
  }

  // TODO(Rugvip): Remove this, routes are looked up via the registry instead
  get path() {
    return this.config.path ?? '';
  }

  get title() {
    return this.config.title;
  }

  toString() {
    return `routeRef{title=${this.title}}`;
  }
}

export function createRouteRef<
  ParamKeys extends string,
  Params extends { [param in string]: string } = { [name in ParamKeys]: string }
>(config: RouteRefConfig<Params>): RouteRef<Params> {
  return new AbsoluteRouteRef<Params>(config);
}

export class ExternalRouteRef {
  private constructor() {}

  toString() {
    return `externalRouteRef{}`;
  }
}

export function createExternalRouteRef(): ExternalRouteRef {
  return new ((ExternalRouteRef as unknown) as { new (): ExternalRouteRef })();
}
