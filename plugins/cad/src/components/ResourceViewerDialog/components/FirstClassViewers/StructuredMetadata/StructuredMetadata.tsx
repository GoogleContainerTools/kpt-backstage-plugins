/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { StructuredMetadataTable } from '@backstage/core-components';
import { load } from 'js-yaml';
import React from 'react';
import { KubernetesResource } from '../../../../../types/KubernetesResource';

export type Metadata = {
  [key: string]: any;
};

type StructuredMetadataProps = {
  yaml: string;
  getCustomMetadata?: (resource: KubernetesResource) => Metadata;
};

export const StructuredMetadata = ({
  yaml,
  getCustomMetadata,
}: StructuredMetadataProps) => {
  const resource = load(yaml) as KubernetesResource;

  const baseMetadata = {
    name: resource.metadata.name,
    namespace: resource.metadata.namespace,
    kind: resource.kind,
    labels: resource.metadata.labels,
    annotations: resource.metadata.annotations,
  };

  const customMetadata = getCustomMetadata ? getCustomMetadata(resource) : {};

  const completeMetadata: Metadata = {
    ...baseMetadata,
    ...customMetadata,
  };

  Object.keys(completeMetadata).forEach(key => {
    if (completeMetadata[key] === undefined || completeMetadata[key] === '') {
      delete completeMetadata[key];
    }
    if (
      !Array.isArray(completeMetadata[key]) &&
      typeof completeMetadata[key] === 'object'
    ) {
      completeMetadata[key] = Object.entries(completeMetadata[key]).map(
        ([thisKey, value]) => `${thisKey} = ${value}`,
      );
    }
  });

  return <StructuredMetadataTable metadata={completeMetadata} />;
};
