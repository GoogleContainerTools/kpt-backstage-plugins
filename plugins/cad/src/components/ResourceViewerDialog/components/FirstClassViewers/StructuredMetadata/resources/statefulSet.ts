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
import { StatefulSet } from '../../../../../../types/StatefulSet';
import { Metadata } from '../StructuredMetadata';
import { getPersistentVolumeClaimStructuredMetadata } from './persistentVolumeClaim';
import { getPodTemplatedStructuredMetadata } from './podTemplate';

export const getStatefulSetStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const statefulSet = resource as StatefulSet;

  const podMetadata: Metadata = getPodTemplatedStructuredMetadata(
    statefulSet.spec.template,
  );

  const volumeClaimMetadata: Metadata = {};

  const volumeClaimTemplates = statefulSet.spec.volumeClaimTemplates ?? [];
  for (const [index, volumeClaim] of volumeClaimTemplates.entries()) {
    const name =
      volumeClaimTemplates.length > 1
        ? `volumeClaim${index + 1}`
        : `volumeClaim`;

    volumeClaimMetadata[name] =
      getPersistentVolumeClaimStructuredMetadata(volumeClaim).volumeClaim;
  }

  return {
    replicas: statefulSet.spec.replicas,
    serviceName: statefulSet.spec.serviceName,
    ...podMetadata,
    ...volumeClaimMetadata,
  };
};
