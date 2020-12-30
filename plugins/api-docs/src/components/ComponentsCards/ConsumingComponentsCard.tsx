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
  ComponentEntity,
  Entity,
  RELATION_API_CONSUMED_BY,
} from '@backstage/catalog-model';
import { EmptyState, InfoCard, Progress } from '@backstage/core';
import React, { PropsWithChildren } from 'react';
import { MissingConsumesApisEmptyState } from '../EmptyState';
import { useRelatedEntities } from '../useRelatedEntities';
import { ComponentsTable } from './ComponentsTable';

const ComponentsCard = ({
  children,
  variant = 'gridItem',
}: PropsWithChildren<{ variant?: string }>) => {
  return (
    <InfoCard variant={variant} title="Consumers">
      {children}
    </InfoCard>
  );
};

type Props = {
  entity: Entity;
  variant?: string;
};

export const ConsumingComponentsCard = ({
  entity,
  variant = 'gridItem',
}: Props) => {
  const { entities, loading, error } = useRelatedEntities(
    entity,
    RELATION_API_CONSUMED_BY,
  );

  if (loading) {
    return (
      <ComponentsCard variant={variant}>
        <Progress />
      </ComponentsCard>
    );
  }

  if (error) {
    return (
      <ComponentsCard variant={variant}>
        <EmptyState
          missing="info"
          title="No information to display"
          description="There was an error while loading the consumers."
        />
      </ComponentsCard>
    );
  }

  if (!entities || entities.length === 0) {
    return (
      <ComponentsCard variant={variant}>
        <MissingConsumesApisEmptyState />
      </ComponentsCard>
    );
  }

  return (
    <ComponentsTable
      title="Consumers"
      variant={variant}
      entities={entities as (ComponentEntity | undefined)[]}
    />
  );
};
