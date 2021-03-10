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

const runDockerContainer = jest.fn();
const runCommand = jest.fn();
const commandExists = jest.fn();

jest.mock('./helpers', () => ({ runCommand }));
jest.mock('@backstage/backend-common', () => ({ runDockerContainer }));
jest.mock('command-exists-promise', () => commandExists);
jest.mock('fs-extra');

import Docker from 'dockerode';
import fs from 'fs-extra';
import parseGitUrl from 'git-url-parse';
import path from 'path';
import { PassThrough } from 'stream';
import { CookieCutter } from './cookiecutter';

describe('CookieCutter Templater', () => {
  const mockDocker = {} as Docker;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write a cookiecutter.json file with the values from the entity', async () => {
    const values = {
      owner: 'blobby',
      storePath: 'https://github.com/org/repo',
      description: 'description',
      component_id: 'newthing',
      destination: {
        git: parseGitUrl('https://github.com/org/repo'),
      },
    };

    jest.spyOn(fs, 'readdir').mockResolvedValueOnce(['newthing']);

    const templater = new CookieCutter();
    await templater.run({
      workspacePath: 'tempdir',
      values,
      dockerClient: mockDocker,
    });

    expect(fs.ensureDir).toBeCalledWith(path.join('tempdir', 'intermediate'));
    expect(fs.writeJson).toBeCalledWith(
      path.join('tempdir', 'template', 'cookiecutter.json'),
      expect.objectContaining(values),
    );
  });

  it('should merge any value that is in the cookiecutter.json path already', async () => {
    const existingJson = {
      _copy_without_render: ['./github/workflows/*'],
    };

    jest
      .spyOn(fs, 'readJSON')
      .mockImplementationOnce(() => Promise.resolve(existingJson));
    jest.spyOn(fs, 'readdir').mockResolvedValueOnce(['newthing']);

    const values = {
      owner: 'blobby',
      storePath: 'https://github.com/org/repo',
      component_id: 'something',
      destination: {
        git: parseGitUrl('https://github.com/org/repo'),
      },
    };

    const templater = new CookieCutter();
    await templater.run({
      workspacePath: 'tempdir',
      values,
      dockerClient: mockDocker,
    });

    expect(fs.writeJSON).toBeCalledWith(
      path.join('tempdir', 'template', 'cookiecutter.json'),
      {
        ...existingJson,
        ...values,
        destination: {
          git: expect.objectContaining({ organization: 'org', name: 'repo' }),
        },
      },
    );
  });

  it('should throw an error if the cookiecutter json is malformed and not missing', async () => {
    jest.spyOn(fs, 'readJSON').mockImplementationOnce(() => {
      throw new Error('BAM');
    });

    const values = {
      owner: 'blobby',
      storePath: 'https://github.com/org/repo',
      destination: {
        git: parseGitUrl('https://github.com/org/repo'),
      },
    };

    const templater = new CookieCutter();
    await expect(
      templater.run({
        workspacePath: 'tempdir',
        values,
        dockerClient: mockDocker,
      }),
    ).rejects.toThrow('BAM');
  });

  it('should run the correct docker container with the correct bindings for the volumes', async () => {
    const values = {
      owner: 'blobby',
      storePath: 'https://github.com/org/repo',
      component_id: 'newthing',
      destination: {
        git: parseGitUrl('https://github.com/org/repo'),
      },
    };

    jest.spyOn(fs, 'readdir').mockResolvedValueOnce(['newthing']);
    jest
      .spyOn(fs, 'realpath')
      .mockImplementation((filePath: string | Buffer) =>
        Promise.resolve(filePath as string),
      );

    const templater = new CookieCutter();
    await templater.run({
      workspacePath: 'tempdir',
      values,
      dockerClient: mockDocker,
    });

    expect(runDockerContainer).toHaveBeenCalledWith({
      imageName: 'spotify/backstage-cookiecutter',
      args: [
        'cookiecutter',
        '--no-input',
        '-o',
        '/output',
        '/input',
        '--verbose',
      ],
      envVars: { HOME: '/tmp' },
      mountDirs: {
        [path.join('tempdir', 'template')]: '/input',
        [path.join('tempdir', 'intermediate')]: '/output',
      },
      workingDir: '/input',
      logStream: undefined,
      dockerClient: mockDocker,
    });
  });

  it('should pass through the streamer to the run docker helper', async () => {
    const stream = new PassThrough();

    const values = {
      owner: 'blobby',
      storePath: 'https://github.com/org/repo',
      component_id: 'newthing',
      destination: {
        git: parseGitUrl('https://github.com/org/repo'),
      },
    };

    jest.spyOn(fs, 'readdir').mockResolvedValueOnce(['newthing']);

    const templater = new CookieCutter();
    await templater.run({
      workspacePath: 'tempdir',
      values,
      logStream: stream,
      dockerClient: mockDocker,
    });

    expect(runDockerContainer).toHaveBeenCalledWith({
      imageName: 'spotify/backstage-cookiecutter',
      args: [
        'cookiecutter',
        '--no-input',
        '-o',
        '/output',
        '/input',
        '--verbose',
      ],
      envVars: { HOME: '/tmp' },
      mountDirs: {
        [path.join('tempdir', 'template')]: '/input',
        [path.join('tempdir', 'intermediate')]: '/output',
      },
      workingDir: '/input',
      logStream: stream,
      dockerClient: mockDocker,
    });
  });

  describe('when cookiecutter is available', () => {
    it('use the binary', async () => {
      const stream = new PassThrough();

      const values = {
        owner: 'blobby',
        storePath: 'https://github.com/org/repo',
        component_id: 'newthing',
        destination: {
          git: parseGitUrl('https://github.com/org/repo'),
        },
      };

      jest.spyOn(fs, 'readdir').mockResolvedValueOnce(['newthing']);
      commandExists.mockImplementationOnce(() => () => true);

      const templater = new CookieCutter();
      await templater.run({
        workspacePath: 'tempdir',
        values,
        logStream: stream,
        dockerClient: mockDocker,
      });

      expect(runCommand).toHaveBeenCalledWith({
        command: 'cookiecutter',
        args: expect.arrayContaining([
          '--no-input',
          '-o',
          path.join('tempdir', 'intermediate'),
          path.join('tempdir', 'template'),
          '--verbose',
        ]),
        logStream: stream,
      });
    });
  });

  describe('when nothing was generated', () => {
    it('throws an error', async () => {
      const stream = new PassThrough();

      jest
        .spyOn(fs, 'readdir')
        .mockImplementationOnce(() => Promise.resolve([]));

      const templater = new CookieCutter();
      await expect(
        templater.run({
          workspacePath: 'tempdir',
          values: {
            owner: 'blobby',
            storePath: 'https://github.com/org/repo',
            destination: {
              git: parseGitUrl('https://github.com/org/repo'),
            },
          },
          logStream: stream,
          dockerClient: mockDocker,
        }),
      ).rejects.toThrow(/No data generated by cookiecutter/);
    });
  });
});
