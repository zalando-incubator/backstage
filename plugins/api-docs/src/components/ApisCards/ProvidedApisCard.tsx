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
  ApiEntity,
  Entity,
  RELATION_PROVIDES_API,
} from '@backstage/catalog-model';
import { EmptyState, InfoCard, Progress } from '@backstage/core';
import React, { PropsWithChildren } from 'react';
import { ApisTable } from './ApisTable';
import { MissingProvidesApisEmptyState } from '../EmptyState';
import { useRelatedEntities } from '../useRelatedEntities';

const ApisCard = ({
  children,
  variant = 'gridItem',
}: PropsWithChildren<{ variant?: string }>) => {
  return (
    <InfoCard variant={variant} title="Provided APIs">
      {children}
    </InfoCard>
  );
};

type Props = {
  entity: Entity;
  variant?: string;
};

export const ProvidedApisCard = ({ entity, variant = 'gridItem' }: Props) => {
  const { entities, loading, error } = useRelatedEntities(
    entity,
    RELATION_PROVIDES_API,
  );

  if (loading) {
    return (
      <ApisCard variant={variant}>
        <Progress />
      </ApisCard>
    );
  }

  if (error) {
    return (
      <ApisCard variant={variant}>
        <EmptyState
          missing="info"
          title="No information to display"
          description="There was an error while loading the provided APIs."
        />
      </ApisCard>
    );
  }

  if (!entities || entities.length === 0) {
    return (
      <ApisCard variant={variant}>
        <MissingProvidesApisEmptyState />
      </ApisCard>
    );
  }

  return (
    <ApisTable
      title="Provided APIs"
      variant={variant}
      entities={entities as (ApiEntity | undefined)[]}
    />
  );
};
