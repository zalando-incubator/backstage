import fetch from 'node-fetch';
import { Logger } from 'winston';
import { Entity, LocationSpec } from '@backstage/catalog-model';
import { CatalogProcessor, CatalogProcessorEmit } from './types';
import * as result from './results';

export class KioReader implements CatalogProcessor {
  token: string;
  logger: Logger;
  public constructor(token: string, logger: Logger) {
    this.token = token;
    this.logger = logger;
  }

  async readLocation(
    location: LocationSpec,
    optional: boolean,
    emit: CatalogProcessorEmit,
  ): Promise<boolean> {
    if (location.type !== 'kio/app') {
      return false;
    } else {
      this.logger.info(`reading ${location.target} via kio reader`);
      const url = location.target;
      const response = await fetch(url, {headers: 
                               {"Authorization" : `Bearer ${this.token}`}});
      if(response.ok) {
        const data = await response.buffer();
        emit(result.data(location, data));
      } else if (response.status === 404) {

        if (!optional) {
          emit(result.notFoundError(location, "Not Found"));
        }

      } else {
        emit(result.generalError(location, await response.json()));
      }
      return true;
    } 
  }

  async parseData(
    data: Buffer,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<boolean> {
    if(location.type !== 'kio/app') {
       return false;
    }
    try {
        const payload = JSON.parse(data.toString());
        const entity: Entity = {kind: 'component',
                                apiVersion: 'component',
                                metadata: {name: payload['name']},
                                spec: payload};
        /*
        payload['kind'] = 'component';
        payload['apiVersion'] = 'alphav1';
        payload['metadata'] = {};
        payload['metadata']['name'] = payload['name'];
        */
        emit(result.entity(location, entity));
    } catch (e) {
     this.logger.error(e);
     emit(result.generalError(location, "error processing kio entry"));
    }
    return true;
  }

}

