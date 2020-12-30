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

import { DiscoveryApi } from '@backstage/core';
import fetch from 'cross-fetch';
import { FindingSummary, Metrics, SonarQubeApi } from './SonarQubeApi';
import { ComponentWrapper, MeasuresWrapper } from './types';

export class SonarQubeClient implements SonarQubeApi {
  discoveryApi: DiscoveryApi;
  baseUrl: string;

  constructor({
    discoveryApi,
    baseUrl = 'https://sonarcloud.io/',
  }: {
    discoveryApi: DiscoveryApi;
    baseUrl?: string;
  }) {
    this.discoveryApi = discoveryApi;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  }

  private async callApi<T>(path: string): Promise<T | undefined> {
    const apiUrl = `${await this.discoveryApi.getBaseUrl('proxy')}/sonarqube`;
    const response = await fetch(`${apiUrl}/${path}`);
    if (response.status === 200) {
      return (await response.json()) as T;
    }
    return undefined;
  }

  async getFindingSummary(
    componentKey?: string,
  ): Promise<FindingSummary | undefined> {
    if (!componentKey) {
      return undefined;
    }

    const component = await this.callApi<ComponentWrapper>(
      `components/show?component=${componentKey}`,
    );
    if (!component) {
      return undefined;
    }

    const metrics: Metrics = {
      alert_status: undefined,
      bugs: undefined,
      reliability_rating: undefined,
      vulnerabilities: undefined,
      security_rating: undefined,
      code_smells: undefined,
      sqale_rating: undefined,
      coverage: undefined,
      duplicated_lines_density: undefined,
    };

    const measures = await this.callApi<MeasuresWrapper>(
      `measures/search?projectKeys=${componentKey}&metricKeys=${Object.keys(
        metrics,
      ).join(',')}`,
    );
    if (!measures) {
      return undefined;
    }

    measures.measures
      .filter(m => m.component === componentKey)
      .forEach(m => {
        metrics[m.metric] = m.value;
      });

    return {
      lastAnalysis: component.component.analysisDate,
      metrics,
      projectUrl: `${this.baseUrl}dashboard?id=${componentKey}`,
      getIssuesUrl: identifier =>
        `${
          this.baseUrl
        }project/issues?id=${componentKey}&types=${identifier.toUpperCase()}&resolved=false`,
      getComponentMeasuresUrl: (identifier: string) =>
        `${
          this.baseUrl
        }component_measures?id=${componentKey}&metric=${identifier.toLowerCase()}&resolved=false&view=list`,
    };
  }
}
