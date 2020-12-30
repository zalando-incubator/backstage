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

jest.mock('@octokit/rest');
jest.mock('./helpers');

import { Octokit } from '@octokit/rest';
import {
  OctokitResponse,
  ReposCreateInOrgResponseData,
  UsersGetByUsernameResponseData,
} from '@octokit/types';
import { GithubPublisher } from './github';
import { initRepoAndPush } from './helpers';
import { getVoidLogger } from '@backstage/backend-common';

const { mockGithubClient } = require('@octokit/rest') as {
  mockGithubClient: {
    repos: jest.Mocked<Octokit['repos']>;
    users: jest.Mocked<Octokit['users']>;
    teams: jest.Mocked<Octokit['teams']>;
  };
};

describe('GitHub Publisher', () => {
  const logger = getVoidLogger();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with public repo visibility', () => {
    const publisher = new GithubPublisher({
      client: new Octokit(),
      token: 'abc',
      repoVisibility: 'public',
    });

    describe('publish: createRemoteInGithub', () => {
      it('should use octokit to create a repo in an organisation if the organisation property is set', async () => {
        mockGithubClient.repos.createInOrg.mockResolvedValue({
          data: {
            clone_url: 'https://github.com/backstage/backstage.git',
          },
        } as OctokitResponse<ReposCreateInOrgResponseData>);
        mockGithubClient.users.getByUsername.mockResolvedValue({
          data: {
            type: 'Organization',
          },
        } as OctokitResponse<UsersGetByUsernameResponseData>);

        const result = await publisher.publish({
          values: {
            storePath: 'blam/test',
            owner: 'bob',
            access: 'blam/team',
          },
          directory: '/tmp/test',
          logger,
        });

        expect(result).toEqual({
          remoteUrl: 'https://github.com/backstage/backstage.git',
          catalogInfoUrl:
            'https://github.com/backstage/backstage/blob/master/catalog-info.yaml',
        });
        expect(mockGithubClient.repos.createInOrg).toHaveBeenCalledWith({
          org: 'blam',
          name: 'test',
          private: false,
          visibility: 'public',
        });
        expect(
          mockGithubClient.teams.addOrUpdateRepoPermissionsInOrg,
        ).toHaveBeenCalledWith({
          org: 'blam',
          team_slug: 'team',
          owner: 'blam',
          repo: 'test',
          permission: 'admin',
        });
        expect(initRepoAndPush).toHaveBeenCalledWith({
          dir: '/tmp/test',
          remoteUrl: 'https://github.com/backstage/backstage.git',
          auth: { username: 'abc', password: 'x-oauth-basic' },
          logger,
        });
      });

      it('should use octokit to create a repo in the authed user if the organisation property is not set', async () => {
        mockGithubClient.repos.createForAuthenticatedUser.mockResolvedValue({
          data: {
            clone_url: 'https://github.com/backstage/backstage.git',
          },
        } as OctokitResponse<ReposCreateInOrgResponseData>);
        mockGithubClient.users.getByUsername.mockResolvedValue({
          data: {
            type: 'User',
          },
        } as OctokitResponse<UsersGetByUsernameResponseData>);

        const result = await publisher.publish({
          values: {
            storePath: 'blam/test',
            owner: 'bob',
            access: 'blam',
          },
          directory: '/tmp/test',
          logger,
        });

        expect(result).toEqual({
          remoteUrl: 'https://github.com/backstage/backstage.git',
          catalogInfoUrl:
            'https://github.com/backstage/backstage/blob/master/catalog-info.yaml',
        });
        expect(
          mockGithubClient.repos.createForAuthenticatedUser,
        ).toHaveBeenCalledWith({
          name: 'test',
          private: false,
        });
        expect(mockGithubClient.repos.addCollaborator).not.toHaveBeenCalled();

        expect(initRepoAndPush).toHaveBeenCalledWith({
          dir: '/tmp/test',
          remoteUrl: 'https://github.com/backstage/backstage.git',
          auth: { username: 'abc', password: 'x-oauth-basic' },
          logger,
        });
      });
    });

    it('should invite other user in the authed user', async () => {
      mockGithubClient.repos.createForAuthenticatedUser.mockResolvedValue({
        data: {
          clone_url: 'https://github.com/backstage/backstage.git',
        },
      } as OctokitResponse<ReposCreateInOrgResponseData>);
      mockGithubClient.users.getByUsername.mockResolvedValue({
        data: {
          type: 'User',
        },
      } as OctokitResponse<UsersGetByUsernameResponseData>);

      const result = await publisher.publish({
        values: {
          storePath: 'blam/test',
          owner: 'bob',
          access: 'bob',
          description: 'description',
        },
        directory: '/tmp/test',
        logger,
      });

      expect(result).toEqual({
        remoteUrl: 'https://github.com/backstage/backstage.git',
        catalogInfoUrl:
          'https://github.com/backstage/backstage/blob/master/catalog-info.yaml',
      });
      expect(
        mockGithubClient.repos.createForAuthenticatedUser,
      ).toHaveBeenCalledWith({
        description: 'description',
        name: 'test',
        private: false,
      });
      expect(mockGithubClient.repos.addCollaborator).toHaveBeenCalledWith({
        owner: 'blam',
        repo: 'test',
        username: 'bob',
        permission: 'admin',
      });
      expect(initRepoAndPush).toHaveBeenCalledWith({
        dir: '/tmp/test',
        remoteUrl: 'https://github.com/backstage/backstage.git',
        auth: { username: 'abc', password: 'x-oauth-basic' },
        logger,
      });
    });
  });

  describe('with internal repo visibility', () => {
    const publisher = new GithubPublisher({
      client: new Octokit(),
      token: 'abc',
      repoVisibility: 'internal',
    });

    it('creates a private repository in the organization with visibility set to internal', async () => {
      mockGithubClient.repos.createInOrg.mockResolvedValue({
        data: {
          clone_url: 'https://github.com/backstage/backstage.git',
        },
      } as OctokitResponse<ReposCreateInOrgResponseData>);
      mockGithubClient.users.getByUsername.mockResolvedValue({
        data: {
          type: 'Organization',
        },
      } as OctokitResponse<UsersGetByUsernameResponseData>);

      const result = await publisher.publish({
        values: {
          isOrg: true,
          storePath: 'blam/test',
          owner: 'bob',
        },
        directory: '/tmp/test',
        logger,
      });

      expect(result).toEqual({
        remoteUrl: 'https://github.com/backstage/backstage.git',
        catalogInfoUrl:
          'https://github.com/backstage/backstage/blob/master/catalog-info.yaml',
      });
      expect(mockGithubClient.repos.createInOrg).toHaveBeenCalledWith({
        org: 'blam',
        name: 'test',
        private: true,
        visibility: 'internal',
      });
      expect(initRepoAndPush).toHaveBeenCalledWith({
        dir: '/tmp/test',
        remoteUrl: 'https://github.com/backstage/backstage.git',
        auth: { username: 'abc', password: 'x-oauth-basic' },
        logger,
      });
    });
  });

  describe('private visibility in a user account', () => {
    const publisher = new GithubPublisher({
      client: new Octokit(),
      token: 'abc',
      repoVisibility: 'private',
    });

    it('creates a private repository', async () => {
      mockGithubClient.repos.createForAuthenticatedUser.mockResolvedValue({
        data: {
          clone_url: 'https://github.com/backstage/backstage.git',
        },
      } as OctokitResponse<ReposCreateInOrgResponseData>);
      mockGithubClient.users.getByUsername.mockResolvedValue({
        data: {
          type: 'User',
        },
      } as OctokitResponse<UsersGetByUsernameResponseData>);

      const result = await publisher.publish({
        values: {
          storePath: 'blam/test',
          owner: 'bob',
        },
        directory: '/tmp/test',
        logger,
      });

      expect(result).toEqual({
        remoteUrl: 'https://github.com/backstage/backstage.git',
        catalogInfoUrl:
          'https://github.com/backstage/backstage/blob/master/catalog-info.yaml',
      });
      expect(
        mockGithubClient.repos.createForAuthenticatedUser,
      ).toHaveBeenCalledWith({
        name: 'test',
        private: true,
      });
      expect(initRepoAndPush).toHaveBeenCalledWith({
        dir: '/tmp/test',
        remoteUrl: 'https://github.com/backstage/backstage.git',
        auth: { username: 'abc', password: 'x-oauth-basic' },
        logger,
      });
    });
  });
});
