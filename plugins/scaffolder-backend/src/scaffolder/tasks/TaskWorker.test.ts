/*
 * Copyright 2021 Spotify AB
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

import {
  getVoidLogger,
  SingleConnectionDatabaseManager,
} from '@backstage/backend-common';
import { TaskWorker } from './TaskWorker';
import os from 'os';
import { ConfigReader, JsonObject } from '@backstage/config';
import { StorageTaskBroker } from './StorageTaskBroker';
import { DatabaseTaskStore } from './DatabaseTaskStore';
import { createTemplateAction, TemplateActionRegistry } from '../actions';

async function createStore(): Promise<DatabaseTaskStore> {
  const manager = SingleConnectionDatabaseManager.fromConfig(
    new ConfigReader({
      backend: {
        database: {
          client: 'sqlite3',
          connection: ':memory:',
        },
      },
    }),
  ).forPlugin('scaffolder');
  return await DatabaseTaskStore.create(await manager.getClient());
}

describe('TaskWorker', () => {
  let storage: DatabaseTaskStore;

  beforeAll(async () => {
    storage = await createStore();
  });

  const logger = getVoidLogger();
  const actionRegistry = new TemplateActionRegistry();
  actionRegistry.register({
    id: 'test-action',
    handler: async ctx => {
      ctx.output('testOutput', 'winning');
    },
  });

  it('should fail when action does not exist', async () => {
    const broker = new StorageTaskBroker(storage, logger);
    const taskWorker = new TaskWorker({
      logger,
      workingDirectory: os.tmpdir(),
      actionRegistry,
      taskBroker: broker,
    });
    const { taskId } = await broker.dispatch({
      steps: [{ id: 'test', name: 'test', action: 'not-found-action' }],
      output: {
        result: '{{ steps.test.output.testOutput }}',
      },
      values: {},
    });
    const task = await broker.claim();
    await taskWorker.runOneTask(task);
    const { events } = await storage.listEvents({ taskId });
    const event = events.find(e => e.type === 'completion');

    expect((event?.body?.error as JsonObject)?.message).toBe(
      "Template action with ID 'not-found-action' is not registered.",
    );
  });

  it('should template output', async () => {
    const broker = new StorageTaskBroker(storage, logger);
    const taskWorker = new TaskWorker({
      logger,
      workingDirectory: os.tmpdir(),
      actionRegistry,
      taskBroker: broker,
    });

    const { taskId } = await broker.dispatch({
      steps: [{ id: 'test', name: 'test', action: 'test-action' }],
      output: {
        result: '{{ steps.test.output.testOutput }}',
      },
      values: {},
    });

    const task = await broker.claim();
    await taskWorker.runOneTask(task);

    const { events } = await storage.listEvents({ taskId });
    const event = events.find(e => e.type === 'completion');
    expect((event?.body?.output as JsonObject).result).toBe('winning');
  });

  it('should template input', async () => {
    const inputAction = createTemplateAction<{
      name: string;
    }>({
      id: 'test-input',
      schema: {
        input: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              title: 'name',
              description: 'Enter name',
              type: 'string',
            },
          },
        },
      },
      async handler(ctx) {
        if (ctx.input.name !== 'winning') {
          throw new Error(
            `expected name to be "winning" got ${ctx.input.name}`,
          );
        }
      },
    });
    actionRegistry.register(inputAction);

    const broker = new StorageTaskBroker(storage, logger);
    const taskWorker = new TaskWorker({
      logger,
      workingDirectory: os.tmpdir(),
      actionRegistry,
      taskBroker: broker,
    });

    const { taskId } = await broker.dispatch({
      steps: [
        { id: 'test', name: 'test', action: 'test-action' },
        {
          id: 'test-input',
          name: 'test-input',
          action: 'test-input',
          input: {
            name: '{{ steps.test.output.testOutput }}',
          },
        },
      ],
      output: {
        result: '{{ steps.test.output.testOutput }}',
      },
      values: {},
    });

    const task = await broker.claim();
    await taskWorker.runOneTask(task);

    const { events } = await storage.listEvents({ taskId });
    const event = events.find(e => e.type === 'completion');
    expect((event?.body?.output as JsonObject).result).toBe('winning');
  });
});
