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
import React from 'react';
import { KubernetesResource } from '../../../../../types/KubernetesResource';
import { loadYaml } from '../../../../../utils/yaml';

export type Metadata = {
  [key: string]: any;
};

export type CustomMetadataFn = (resource: KubernetesResource) => Metadata;

type StructuredMetadataProps = {
  yaml: string;
  getCustomMetadata?: CustomMetadataFn;
};

const normalizeMetadata = (metadata: Metadata) => {
  Object.keys(metadata).forEach(key => {
    if (metadata[key] === undefined || metadata[key] === '') {
      delete metadata[key];
    }

    const isObject =
      !Array.isArray(metadata[key]) && typeof metadata[key] === 'object';
    if (isObject) {
      metadata[key] = Object.entries(metadata[key]).map(
        ([thisKey, value]) => `${thisKey} = ${value}`,
      );
    }
  });
};

const getMetadataForResource = (
  yaml: string,
  getCustomMetadata?: (resource: KubernetesResource) => Metadata,
): Metadata => {
  const resource = loadYaml(yaml) as KubernetesResource;

  const baseMetadata = {
    name: resource.metadata.name,
    namespace: resource.metadata.namespace,
    kind: resource.kind,
    labels: resource.metadata.labels,
    annotations: resource.metadata.annotations,
  };

  const customMetadata = getCustomMetadata ? getCustomMetadata(resource) : {};

  const metadata: Metadata = {
    ...baseMetadata,
    ...customMetadata,
  };

  normalizeMetadata(metadata);

  return metadata;
};

export const StructuredMetadata = ({
  yaml,
  getCustomMetadata,
}: StructuredMetadataProps) => {
  const metadata = getMetadataForResource(yaml, getCustomMetadata);

  return <StructuredMetadataTable metadata={metadata} />;
};
