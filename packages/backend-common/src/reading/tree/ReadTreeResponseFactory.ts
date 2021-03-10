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

import os from 'os';
import { Readable } from 'stream';
import { Config } from '@backstage/config';
import { ReadTreeResponse } from '../types';
import { TarArchiveResponse } from './TarArchiveResponse';
import { ZipArchiveResponse } from './ZipArchiveResponse';

type FromArchiveOptions = {
  // A binary stream of a tar archive.
  stream: Readable;
  // If unset, the files at the root of the tree will be read.
  // subpath must not contain the name of the top level directory.
  subpath?: string;
  // etag of the blob
  etag: string;
  // Filter passed on from the ReadTreeOptions
  filter?: (path: string) => boolean;
};

export class ReadTreeResponseFactory {
  static create(options: { config: Config }): ReadTreeResponseFactory {
    return new ReadTreeResponseFactory(
      options.config.getOptionalString('backend.workingDirectory') ??
        os.tmpdir(),
    );
  }

  constructor(private readonly workDir: string) {}

  async fromTarArchive(options: FromArchiveOptions): Promise<ReadTreeResponse> {
    return new TarArchiveResponse(
      options.stream,
      options.subpath ?? '',
      this.workDir,
      options.etag,
      options.filter,
    );
  }

  async fromZipArchive(options: FromArchiveOptions): Promise<ReadTreeResponse> {
    return new ZipArchiveResponse(
      options.stream,
      options.subpath ?? '',
      this.workDir,
      options.etag,
      options.filter,
    );
  }
}
