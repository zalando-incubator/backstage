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
import { getVoidLogger } from '@backstage/backend-common';
import {
  Entity,
  EntityName,
  ENTITY_DEFAULT_NAMESPACE,
} from '@backstage/catalog-model';
import { ConfigReader } from '@backstage/config';
import mockFs from 'mock-fs';
import os from 'os';
import path from 'path';
import { AzureBlobStoragePublish } from './azureBlobStorage';
import { PublisherBase, TechDocsMetadata } from './types';

// NOTE: /packages/techdocs-common/__mocks__ is being used to mock Azure client library

const createMockEntity = (annotations = {}) => {
  return {
    apiVersion: 'version',
    kind: 'TestKind',
    metadata: {
      name: 'test-component-name',
      namespace: 'test-namespace',
      annotations: {
        ...annotations,
      },
    },
  };
};

const createMockEntityName = (): EntityName => ({
  kind: 'TestKind',
  name: 'test-component-name',
  namespace: 'test-namespace',
});

const rootDir = os.platform() === 'win32' ? 'C:\\rootDir' : '/rootDir';

const getEntityRootDir = (entity: Entity) => {
  const {
    kind,
    metadata: { namespace, name },
  } = entity;

  return path.join(rootDir, namespace || ENTITY_DEFAULT_NAMESPACE, kind, name);
};

function createLogger() {
  const logger = getVoidLogger();
  jest.spyOn(logger, 'info').mockReturnValue(logger);
  jest.spyOn(logger, 'error').mockReturnValue(logger);
  return logger;
}

let publisher: PublisherBase;
beforeEach(async () => {
  mockFs.restore();
  const mockConfig = new ConfigReader({
    techdocs: {
      requestUrl: 'http://localhost:7000',
      publisher: {
        type: 'azureBlobStorage',
        azureBlobStorage: {
          credentials: {
            accountName: 'accountName',
            accountKey: 'accountKey',
          },
          containerName: 'containerName',
        },
      },
    },
  });

  publisher = await AzureBlobStoragePublish.fromConfig(
    mockConfig,
    createLogger(),
  );
});

describe('publishing with valid credentials', () => {
  describe('publish', () => {
    beforeEach(() => {
      const entity = createMockEntity();
      const entityRootDir = getEntityRootDir(entity);

      mockFs({
        [entityRootDir]: {
          'index.html': '',
          '404.html': '',
          assets: {
            'main.css': '',
          },
        },
      });
    });

    it('should publish a directory', async () => {
      const entity = createMockEntity();
      const entityRootDir = getEntityRootDir(entity);

      expect(
        await publisher.publish({
          entity,
          directory: entityRootDir,
        }),
      ).toBeUndefined();
      mockFs.restore();
    });

    it('should fail to publish a directory', async () => {
      expect.assertions(1);
      const wrongPathToGeneratedDirectory = path.join(
        rootDir,
        'wrong',
        'path',
        'to',
        'generatedDirectory',
      );

      const entity = createMockEntity();

      await publisher
        .publish({
          entity,
          directory: wrongPathToGeneratedDirectory,
        })
        .catch(error => {
          // Can not do exact error message match due to mockFs adding unexpected characters in the path when throwing the error
          // Issue reported https://github.com/tschaub/mock-fs/issues/118
          expect.stringContaining(
            `Unable to upload file(s) to Azure Blob Storage. Error: Failed to read template directory: ENOENT, no such file or directory`,
          );

          expect(error.message).toEqual(
            expect.stringContaining(wrongPathToGeneratedDirectory),
          );
        });
      mockFs.restore();
    });
  });

  describe('hasDocsBeenGenerated', () => {
    it('should return true if docs has been generated', async () => {
      const entity = createMockEntity();
      const entityRootDir = getEntityRootDir(entity);

      mockFs({
        [entityRootDir]: {
          'index.html': 'file-content',
        },
      });

      expect(await publisher.hasDocsBeenGenerated(entity)).toBe(true);
      mockFs.restore();
    });

    it('should return false if docs has not been generated', async () => {
      const entity = createMockEntity();

      expect(await publisher.hasDocsBeenGenerated(entity)).toBe(false);
    });
  });

  describe('fetchTechDocsMetadata', () => {
    it('should return tech docs metadata', async () => {
      const entityNameMock = createMockEntityName();
      const entity = createMockEntity();
      const entityRootDir = getEntityRootDir(entity);

      mockFs({
        [entityRootDir]: {
          'techdocs_metadata.json':
            '{"site_name": "backstage", "site_description": "site_content"}',
        },
      });
      const expectedMetadata: TechDocsMetadata = {
        site_name: 'backstage',
        site_description: 'site_content',
      };
      expect(
        await publisher.fetchTechDocsMetadata(entityNameMock),
      ).toStrictEqual(expectedMetadata);
      mockFs.restore();
    });

    it('should return tech docs metadata when json encoded with single quotes', async () => {
      const entityNameMock = createMockEntityName();
      const entity = createMockEntity();
      const entityRootDir = getEntityRootDir(entity);

      mockFs({
        [entityRootDir]: {
          'techdocs_metadata.json': `{'site_name': 'backstage', 'site_description': 'site_content'}`,
        },
      });

      const expectedMetadata: TechDocsMetadata = {
        site_name: 'backstage',
        site_description: 'site_content',
      };
      expect(
        await publisher.fetchTechDocsMetadata(entityNameMock),
      ).toStrictEqual(expectedMetadata);
      mockFs.restore();
    });

    it('should return an error if the techdocs_metadata.json file is not present', async () => {
      const entityNameMock = createMockEntityName();
      const entity = createMockEntity();
      const entityRootDir = getEntityRootDir(entity);

      let error;
      try {
        await publisher.fetchTechDocsMetadata(entityNameMock);
      } catch (e) {
        error = e;
      }

      expect(error).toEqual(
        new Error(
          `TechDocs metadata fetch failed, The file ${path.join(
            entityRootDir,
            'techdocs_metadata.json',
          )} does not exist !`,
        ),
      );
    });
  });
});

describe('error reporting', () => {
  it('reports an error when unable to read container properties', async () => {
    const mockConfig = new ConfigReader({
      techdocs: {
        requestUrl: 'http://localhost:7000',
        publisher: {
          type: 'azureBlobStorage',
          azureBlobStorage: {
            credentials: {
              accountName: 'accountName',
            },
            containerName: 'bad_container',
          },
        },
      },
    });

    const logger = createLogger();

    let error;
    try {
      publisher = await AzureBlobStoragePublish.fromConfig(mockConfig, logger);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Could not retrieve metadata about the Azure Blob Storage container bad_container.`,
      ),
    );
  });

  it('reports an error when bad account credentials', async () => {
    const mockConfig = new ConfigReader({
      techdocs: {
        requestUrl: 'http://localhost:7000',
        publisher: {
          type: 'azureBlobStorage',
          azureBlobStorage: {
            credentials: {
              accountName: 'failupload',
              accountKey: 'accountKey',
            },
            containerName: 'containerName',
          },
        },
      },
    });

    const logger = createLogger();

    publisher = await AzureBlobStoragePublish.fromConfig(mockConfig, logger);

    const entity = createMockEntity();
    const entityRootDir = getEntityRootDir(entity);

    mockFs({
      [entityRootDir]: {
        'index.html': '',
      },
    });

    let error;
    try {
      await publisher.publish({
        entity,
        directory: entityRootDir,
      });
    } catch (e) {
      error = e;
    }

    expect(error.message).toContain(
      `Unable to upload file(s) to Azure Blob Storage.`,
    );

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Unable to upload file(s) to Azure Blob Storage. Error: Upload failed for ${path.join(
          entityRootDir,
          'index.html',
        )} with status code 500`,
      ),
    );

    mockFs.restore();
  });

  describe('fetchTechDocsMetadata', () => {
    it('should return tech docs metadata', async () => {
      const entityNameMock = createMockEntityName();
      const entity = createMockEntity();
      const entityRootDir = getEntityRootDir(entity);

      mockFs({
        [entityRootDir]: {
          'techdocs_metadata.json':
            '{"site_name": "backstage", "site_description": "site_content"}',
        },
      });
      const expectedMetadata: TechDocsMetadata = {
        site_name: 'backstage',
        site_description: 'site_content',
      };
      expect(
        await publisher.fetchTechDocsMetadata(entityNameMock),
      ).toStrictEqual(expectedMetadata);
      mockFs.restore();
    });

    it('should return tech docs metadata when json encoded with single quotes', async () => {
      const entityNameMock = createMockEntityName();
      const entity = createMockEntity();
      const entityRootDir = getEntityRootDir(entity);

      mockFs({
        [entityRootDir]: {
          'techdocs_metadata.json': `{'site_name': 'backstage', 'site_description': 'site_content'}`,
        },
      });

      const expectedMetadata: TechDocsMetadata = {
        site_name: 'backstage',
        site_description: 'site_content',
      };
      expect(
        await publisher.fetchTechDocsMetadata(entityNameMock),
      ).toStrictEqual(expectedMetadata);
      mockFs.restore();
    });

    it('should return an error if the techdocs_metadata.json file is not present', async () => {
      const entityNameMock = createMockEntityName();

      let error;
      try {
        await publisher.fetchTechDocsMetadata(entityNameMock);
      } catch (e) {
        error = e;
      }

      expect(error.message).toEqual(
        expect.stringContaining('TechDocs metadata fetch'),
      );
    });
  });
});
