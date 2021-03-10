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

import {
  Button,
  CodeSnippet,
  Content,
  Header,
  ItemCardGrid,
  ItemCardHeader,
  Page,
  Progress,
  useApi,
  WarningPanel,
} from '@backstage/core';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Card, CardActions, CardContent, CardMedia } from '@material-ui/core';
import React from 'react';
import { generatePath } from 'react-router-dom';
import { useAsync } from 'react-use';
import { rootDocsRouteRef } from '../../plugin';

export const TechDocsHome = () => {
  const catalogApi = useApi(catalogApiRef);

  const { value, loading, error } = useAsync(async () => {
    const response = await catalogApi.getEntities();
    return response.items.filter(entity => {
      return !!entity.metadata.annotations?.['backstage.io/techdocs-ref'];
    });
  });

  if (loading) {
    return (
      <Page themeId="documentation">
        <Header
          title="Documentation"
          subtitle="Documentation available in Backstage"
        />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  if (error) {
    return (
      <Page themeId="documentation">
        <Header
          title="Documentation"
          subtitle="Documentation available in Backstage"
        />
        <Content>
          <WarningPanel
            severity="error"
            title="Could not load available documentation."
          >
            <CodeSnippet language="text" text={error.toString()} />
          </WarningPanel>
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="documentation">
      <Header
        title="Documentation"
        subtitle="Documentation available in Backstage"
      />
      <Content>
        <ItemCardGrid data-testid="docs-explore">
          {!value?.length
            ? null
            : value.map((entity, index: number) => (
                <Card key={index}>
                  <CardMedia>
                    <ItemCardHeader title={entity.metadata.name} />
                  </CardMedia>
                  <CardContent>{entity.metadata.description}</CardContent>
                  <CardActions>
                    <Button
                      to={generatePath(rootDocsRouteRef.path, {
                        namespace: entity.metadata.namespace ?? 'default',
                        kind: entity.kind,
                        name: entity.metadata.name,
                      })}
                      color="primary"
                    >
                      Read Docs
                    </Button>
                  </CardActions>
                </Card>
              ))}
        </ItemCardGrid>
      </Content>
    </Page>
  );
};
