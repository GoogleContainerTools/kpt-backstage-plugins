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

import { KubernetesResource } from '../../../../../../types/KubernetesResource';
import { Metadata } from '../StructuredMetadata';

const getValue = (fieldValue: any): string => {
  if (typeof fieldValue === 'boolean') {
    return fieldValue ? 'true' : 'false';
  }

  return fieldValue;
};

const setMetadata = (
  metadata: Metadata,
  resourceField: any,
  fieldName: string,
): void => {
  if (Array.isArray(resourceField)) {
    const isArrayFieldObject = typeof resourceField[0] === 'object';

    if (isArrayFieldObject) {
      const manyInstances = resourceField.length > 1;

      for (const [idx, oneValue] of resourceField.entries()) {
        const arrayFieldName = `${fieldName}${manyInstances ? idx + 1 : ''}`;
        setMetadata(metadata, oneValue, arrayFieldName);
      }
    } else {
      metadata[fieldName] = resourceField.map(getValue).join(', ');
    }
  } else if (typeof resourceField === 'object') {
    const objFields = Object.keys(resourceField);

    for (const field of objFields) {
      const newFieldName = `${fieldName}.${field}`;
      setMetadata(metadata, resourceField[field], newFieldName);
    }
  } else {
    metadata[fieldName] = getValue(resourceField);
  }
};

const populateMetadata = (
  metadata: Metadata,
  object: any,
  depth: number,
): void => {
  const STANDARD_K8S_FIELDS = ['apiVersion', 'kind', 'metadata'];

  const firstLevelFields = Object.keys(object).filter(
    key => !STANDARD_K8S_FIELDS.includes(key) || depth !== 1,
  );

  for (const fieldName of firstLevelFields) {
    const newMetadata: Metadata = {};

    if (fieldName === 'spec' && depth === 1) {
      populateMetadata(metadata, object.spec, depth + 1);
      continue;
    }

    setMetadata(newMetadata, object[fieldName], fieldName);

    for (const thisKey of Object.keys(newMetadata)) {
      const isPrefix = thisKey.includes('.');
      const thisKeyName = isPrefix
        ? thisKey.slice(0, thisKey.indexOf('.'))
        : thisKey;

      if (!metadata[thisKeyName]) {
        metadata[thisKeyName] = [];
      }

      const fieldKey = thisKey.slice(thisKeyName.length + 1);
      metadata[thisKeyName].push(
        isPrefix
          ? `${fieldKey}: ${newMetadata[thisKey]}`
          : newMetadata[thisKey],
      );
    }
  }
};

export const getDefaultStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const anyResource = resource as unknown as any;

  const metadata: Metadata = {};

  populateMetadata(metadata, anyResource, 1);

  return metadata;
};
