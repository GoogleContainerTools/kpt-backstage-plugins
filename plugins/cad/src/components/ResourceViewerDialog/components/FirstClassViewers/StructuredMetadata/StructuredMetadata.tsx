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
import { makeStyles } from '@material-ui/core';
import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import { diffArrays } from 'diff';
import React, { Fragment } from 'react';
import { KubernetesResource } from '../../../../../types/KubernetesResource';
import { loadYaml } from '../../../../../utils/yaml';

export type Metadata = {
  [key: string]: any;
};

export type CustomMetadataFn = (resource: KubernetesResource) => Metadata;

type StructuredMetadataProps = {
  yaml?: string;
  originalYaml?: string;
  getCustomMetadata?: CustomMetadataFn;
  showDiff?: boolean;
};

const useStyles = makeStyles({
  added: {
    color: 'green',
    '& > span:first-child': {
      width: '10px',
      display: 'inline-block',
    },
  },
  removed: {
    color: 'red',
    '& > span:first-child': {
      width: '10px',
      display: 'inline-block',
    },
  },
});

const normalizeMetadata = (metadata: Metadata): void => {
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
  yaml?: string,
  getCustomMetadata?: (resource: KubernetesResource) => Metadata,
): Metadata => {
  if (!yaml) return {};

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

export const getDiffMetadata = (
  classes: ClassNameMap,
  currentMetadata: Metadata,
  originalMetadata: Metadata,
): Metadata => {
  const diffMetadata: Metadata = {};

  const getAddedSpan = (value: any): JSX.Element => (
    <span className={classes.added}>
      <span>+</span>
      {value}
    </span>
  );

  const getRemovedSpan = (value: any): JSX.Element => (
    <span className={classes.removed}>
      <span>-</span>
      {value}
    </span>
  );

  Object.keys(currentMetadata).forEach(key => {
    const isArray = Array.isArray(currentMetadata[key]);

    if (isArray) {
      const currentValue = currentMetadata[key];
      const originalValue = originalMetadata[key];

      const differences = diffArrays(originalValue ?? [], currentValue);
      const spans: JSX.Element[] = [];

      for (const diff of differences) {
        for (const value of diff.value) {
          if (diff.added) {
            spans.push(getAddedSpan(value));
          } else if (diff.removed) {
            spans.push(getRemovedSpan(value));
          } else {
            spans.push(<Fragment>{value as any}</Fragment>);
          }
        }
      }

      diffMetadata[key] = spans;
    } else {
      const currentValue = currentMetadata[key];
      const originalValue = originalMetadata[key];

      if (originalValue === undefined) {
        diffMetadata[key] = getAddedSpan(currentValue);
      } else if (originalValue !== currentValue) {
        diffMetadata[key] = (
          <span>
            {getRemovedSpan(originalValue)}
            <div style={{ height: '8px' }} />
            {getAddedSpan(currentValue)}
          </span>
        );
      } else {
        diffMetadata[key] = currentValue;
      }
    }
  });

  Object.keys(originalMetadata).forEach(key => {
    if (!originalMetadata[key] || diffMetadata[key]) return;

    const isArray = Array.isArray(originalMetadata[key]);

    if (isArray) {
      const arrayValue = originalMetadata[key];

      const spans: JSX.Element[] = [];

      for (const value of arrayValue) {
        spans.push(getRemovedSpan(value));
      }

      diffMetadata[key] = spans;
    } else {
      const value = originalMetadata[key];

      diffMetadata[key] = <span>{getRemovedSpan(value)}</span>;
    }
  });

  return diffMetadata;
};

export const StructuredMetadata = ({
  yaml,
  originalYaml,
  getCustomMetadata,
  showDiff,
}: StructuredMetadataProps) => {
  const classes = useStyles();

  if (!showDiff) {
    const metadata = getMetadataForResource(
      yaml || originalYaml,
      getCustomMetadata,
    );
    return <StructuredMetadataTable metadata={metadata} />;
  }

  const currentMetadata = getMetadataForResource(yaml, getCustomMetadata);
  const originalMetadata = getMetadataForResource(
    originalYaml,
    getCustomMetadata,
  );

  const diffMetadata = getDiffMetadata(
    classes,
    currentMetadata,
    originalMetadata,
  );

  return <StructuredMetadataTable metadata={diffMetadata} />;
};
