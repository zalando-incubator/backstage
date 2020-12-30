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

import { ConfigReader } from '@backstage/config';
import { GitHubIntegration } from './GitHubIntegration';

describe('GitHubIntegration', () => {
  it('has a working factory', () => {
    const integrations = GitHubIntegration.factory({
      config: new ConfigReader({
        integrations: {
          github: [
            {
              host: 'h.com',
              apiBaseUrl: 'a',
              rawBaseUrl: 'r',
              token: 't',
            },
          ],
        },
      }),
    });
    expect(integrations.length).toBe(2); // including default
    expect(integrations[0].predicate(new URL('https://h.com/a'))).toBe(true);
  });

  it('returns the basics', () => {
    const integration = new GitHubIntegration({ host: 'h.com' } as any);
    expect(integration.type).toBe('github');
    expect(integration.title).toBe('h.com');
  });
});
