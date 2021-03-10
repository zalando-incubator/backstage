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

const mockAccess = jest.fn();
jest.doMock('fs-extra', () => ({
  access: mockAccess,
  promises: {
    access: mockAccess,
  },
  constants: {
    F_OK: 0,
    W_OK: 1,
  },
  mkdir: jest.fn(),
  remove: jest.fn(),
}));

import {
  SingleConnectionDatabaseManager,
  PluginDatabaseManager,
  getVoidLogger,
  UrlReaders,
} from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { Templaters, Preparers, Publishers } from '../scaffolder';
import Docker from 'dockerode';
import { CatalogApi } from '@backstage/catalog-client';

jest.mock('dockerode');

const createCatalogClient = (templates: any[] = []) =>
  ({
    getEntities: async () => ({ items: templates }),
  } as CatalogApi);

function createDatabase(): PluginDatabaseManager {
  return SingleConnectionDatabaseManager.fromConfig(
    new ConfigReader({
      backend: {
        database: {
          client: 'sqlite3',
          connection: ':memory:',
        },
      },
    }),
  ).forPlugin('scaffolder');
}

const mockUrlReader = UrlReaders.default({
  logger: getVoidLogger(),
  config: new ConfigReader({}),
});

describe('createRouter - working directory', () => {
  const mockPrepare = jest.fn();
  const mockPreparers = new Preparers();

  beforeAll(() => {
    const mockPreparer = {
      prepare: mockPrepare,
    };
    mockPreparers.register('dev.azure.com', mockPreparer);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const workDirConfig = (path: string) => ({
    backend: {
      workingDirectory: path,
    },
  });

  const template = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Template',
    metadata: {
      annotations: {
        'backstage.io/managed-by-location': 'url:https://dev.azure.com',
      },
    },
    spec: {
      owner: 'template@backstage.io',
      path: '.',
      schema: {},
    },
  };

  it('should throw an error when working directory does not exist or is not writable', async () => {
    mockAccess.mockImplementation(() => {
      throw new Error('access error');
    });

    await expect(
      createRouter({
        logger: getVoidLogger(),
        preparers: new Preparers(),
        templaters: new Templaters(),
        publishers: new Publishers(),
        config: new ConfigReader(workDirConfig('/path')),
        dockerClient: new Docker(),
        database: createDatabase(),
        catalogClient: createCatalogClient([template]),
        reader: mockUrlReader,
      }),
    ).rejects.toThrow('access error');
  });

  it('should use the working directory when configured', async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
      preparers: mockPreparers,
      templaters: new Templaters(),
      publishers: new Publishers(),
      config: new ConfigReader(workDirConfig('/path')),
      dockerClient: new Docker(),
      database: createDatabase(),
      catalogClient: createCatalogClient([template]),
      reader: mockUrlReader,
    });

    const app = express().use(router);
    await request(app)
      .post('/v1/jobs')
      .send({
        templateName: '',
        values: {
          storePath: 'https://github.com/backstage/good',
        },
      });

    expect(mockPrepare).toBeCalledWith({
      logger: expect.anything(),
      workspacePath: expect.stringContaining('path'),
      url: expect.anything(),
    });
  });

  it('should not pass along anything when no working directory is configured', async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
      preparers: mockPreparers,
      templaters: new Templaters(),
      publishers: new Publishers(),
      config: new ConfigReader({}),
      dockerClient: new Docker(),
      database: createDatabase(),
      catalogClient: createCatalogClient([template]),
      reader: mockUrlReader,
    });

    const app = express().use(router);
    await request(app)
      .post('/v1/jobs')
      .send({
        templateName: '',
        values: {
          storePath: 'https://github.com/backstage/goodrepo',
        },
      });

    expect(mockPrepare).toBeCalledWith({
      logger: expect.anything(),
      workspacePath: expect.anything(),
      url: expect.anything(),
    });
  });
});

describe('createRouter', () => {
  let app: express.Express;
  const template = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Template',
    metadata: {
      description: 'Create a new CRA website project',
      name: 'create-react-app-template',
      tags: ['experimental', 'react', 'cra'],
      title: 'Create React App Template',
      annotations: {
        'backstage.io/managed-by-location': 'url:https://dev.azure.com',
      },
    },
    spec: {
      owner: 'web@example.com',
      path: '.',
      schema: {
        properties: {
          component_id: {
            description: 'Unique name of the component',
            title: 'Name',
            type: 'string',
          },
          description: {
            description: 'Description of the component',
            title: 'Description',
            type: 'string',
          },
          use_typescript: {
            default: true,
            description: 'Include TypeScript',
            title: 'Use TypeScript',
            type: 'boolean',
          },
        },
        required: ['component_id', 'use_typescript'],
      },
      templater: 'cra',
      type: 'website',
    },
  };

  beforeAll(async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
      preparers: new Preparers(),
      templaters: new Templaters(),
      publishers: new Publishers(),
      config: new ConfigReader({}),
      dockerClient: new Docker(),
      database: createDatabase(),
      catalogClient: createCatalogClient([template]),
      reader: mockUrlReader,
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /v1/jobs', () => {
    it('rejects template values which do not match the template schema definition', async () => {
      const response = await request(app)
        .post('/v1/jobs')
        .send({
          templateName: '',
          values: {
            storePath: 'https://github.com/backstage/backstage',
          },
        });

      expect(response.status).toEqual(400);
    });
  });

  describe('GET /v2/actions', () => {
    it('lists available actions', async () => {
      const response = await request(app).get('/v2/actions').send();
      expect(response.status).toEqual(200);
      expect(response.body[0].id).toBeDefined();
      expect(response.body.length).toBeGreaterThan(8);
    });
  });

  describe('POST /v2/tasks', () => {
    it('rejects template values which do not match the template schema definition', async () => {
      const response = await request(app)
        .post('/v2/tasks')
        .send({
          templateName: '',
          values: {
            storePath: 'https://github.com/backstage/backstage',
          },
        });

      expect(response.status).toEqual(400);
    });

    it('return the template id', async () => {
      const response = await request(app)
        .post('/v2/tasks')
        .send({
          templateName: 'create-react-app-template',
          values: {
            storePath: 'https://github.com/backstage/backstage',
            component_id: '123',
            name: 'test',
            use_typescript: false,
          },
        });

      expect(response.body.id).toBeDefined();
      expect(response.status).toEqual(201);
    });
  });
});
