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

import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { AnyRouteRef, BackstageRouteObject, RouteRef } from './types';
import { generatePath, matchRoutes, useLocation } from 'react-router-dom';
import { ExternalRouteRef } from './RouteRef';

// The extra TS magic here is to require a single params argument if the RouteRef
// had at least one param defined, but require 0 arguments if there are no params defined.
// Without this we'd have to pass in empty object to all parameter-less RouteRefs
// just to make TypeScript happy, or we would have to make the argument optional in
// which case you might forget to pass it in when it is actually required.
export type RouteFunc<Params extends { [param in string]: string }> = (
  ...[params]: Params[keyof Params] extends never
    ? readonly []
    : readonly [Params]
) => string;

class RouteResolver {
  constructor(
    private readonly routePaths: Map<AnyRouteRef, string>,
    private readonly routeParents: Map<AnyRouteRef, AnyRouteRef | undefined>,
    private readonly routeObjects: BackstageRouteObject[],
    private readonly routeBindings: Map<ExternalRouteRef, RouteRef>,
  ) {}

  resolve<Params extends { [param in string]: string }>(
    routeRefOrExternalRouteRef: RouteRef<Params> | ExternalRouteRef,
    sourceLocation: ReturnType<typeof useLocation>,
  ): RouteFunc<Params> {
    const routeRef =
      this.routeBindings.get(routeRefOrExternalRouteRef) ??
      (routeRefOrExternalRouteRef as RouteRef<Params>);

    const match = matchRoutes(this.routeObjects, sourceLocation) ?? [];

    const lastPath = this.routePaths.get(routeRef);
    if (!lastPath) {
      throw new Error(`No path for ${routeRef}`);
    }
    const targetRefStack = Array<AnyRouteRef>();
    let matchIndex = -1;

    for (
      let currentRouteRef: AnyRouteRef | undefined = routeRef;
      currentRouteRef;
      currentRouteRef = this.routeParents.get(currentRouteRef)
    ) {
      matchIndex = match.findIndex(m =>
        (m.route as BackstageRouteObject).routeRefs.has(currentRouteRef!),
      );
      if (matchIndex !== -1) {
        break;
      }

      targetRefStack.unshift(currentRouteRef);
    }

    // If our target route is present in the initial match we need to construct the final path
    // from the parent of the matched route segment. That's to allow the caller of the route
    // function to supply their own params.
    if (targetRefStack.length === 0) {
      matchIndex -= 1;
    }

    // This is the part of the route tree that the target and source locations have in common.
    // We re-use the existing pathname directly along with all params.
    const parentPath = matchIndex === -1 ? '' : match[matchIndex].pathname;

    // This constructs the mid section of the path using paths resolved from all route refs
    // we need to traverse to reach our target except for the very last one. None of these
    // paths are allowed to require any parameters, as the called would have no way of knowing
    // what parameters those are.
    const prefixPath = targetRefStack
      .slice(0, -1)
      .map(ref => {
        const path = this.routePaths.get(ref);
        if (!path) {
          throw new Error(`No path for ${ref}`);
        }
        if (path.includes(':')) {
          throw new Error(
            `Cannot route to ${routeRef} with parent ${ref} as it has parameters`,
          );
        }
        return path;
      })
      .join('/')
      .replace(/\/\/+/g, '/'); // Normalize path to not contain repeated /'s

    const routeFunc: RouteFunc<Params> = (...[params]) => {
      return `${parentPath}${prefixPath}${generatePath(lastPath, params)}`;
    };
    return routeFunc;
  }
}

const RoutingContext = createContext<RouteResolver | undefined>(undefined);

export function useRouteRef<Params extends { [param in string]: string }>(
  routeRef: RouteRef<Params> | ExternalRouteRef,
): RouteFunc<Params> {
  const sourceLocation = useLocation();
  const resolver = useContext(RoutingContext);
  const routeFunc = useMemo(
    () => resolver && resolver.resolve(routeRef, sourceLocation),
    [resolver, routeRef, sourceLocation],
  );

  if (!routeFunc) {
    throw new Error('No route resolver found in context');
  }

  return routeFunc;
}

type ProviderProps = {
  routePaths: Map<AnyRouteRef, string>;
  routeParents: Map<AnyRouteRef, AnyRouteRef | undefined>;
  routeObjects: BackstageRouteObject[];
  routeBindings: Map<ExternalRouteRef, RouteRef>;
  children: ReactNode;
};

export const RoutingProvider = ({
  routePaths,
  routeParents,
  routeObjects,
  routeBindings,
  children,
}: ProviderProps) => {
  const resolver = new RouteResolver(
    routePaths,
    routeParents,
    routeObjects,
    routeBindings,
  );
  return (
    <RoutingContext.Provider value={resolver}>
      {children}
    </RoutingContext.Provider>
  );
};

export function validateRoutes(
  routePaths: Map<AnyRouteRef, string>,
  routeParents: Map<AnyRouteRef, AnyRouteRef | undefined>,
) {
  const notLeafRoutes = new Set(routeParents.values());
  notLeafRoutes.delete(undefined);

  for (const route of routeParents.keys()) {
    if (notLeafRoutes.has(route)) {
      continue;
    }

    let currentRouteRef: AnyRouteRef | undefined = route;

    let fullPath = '';
    while (currentRouteRef) {
      const path = routePaths.get(currentRouteRef);
      if (!path) {
        throw new Error(`No path for ${currentRouteRef}`);
      }
      fullPath = `${path}${fullPath}`;
      currentRouteRef = routeParents.get(currentRouteRef);
    }

    const params = fullPath.match(/:(\w+)/g);
    if (params) {
      for (let j = 0; j < params.length; j++) {
        for (let i = j + 1; i < params.length; i++) {
          if (params[i] === params[j]) {
            throw new Error(
              `Parameter ${params[i]} is duplicated in path ${fullPath}`,
            );
          }
        }
      }
    }
  }
}
