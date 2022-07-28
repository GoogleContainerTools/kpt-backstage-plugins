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

import {
  ContainerPort,
  PodTemplateSpec,
  VolumeMount,
} from '../../../../../../types/Pod';
import { Metadata } from '../StructuredMetadata';

export const getPodTemplatedStructuredMetadata = (
  podTemplate: PodTemplateSpec,
): Metadata => {
  const customMetadata: Metadata = {
    serviceAccountName: podTemplate.spec.serviceAccountName,
    podLabels: podTemplate.metadata.labels,
    podAnnotations: podTemplate.metadata.annotations,
  };

  const getPortDescription = (port: ContainerPort): string =>
    `exposes ${port.protocol || 'TCP'} port ${port.containerPort} ${
      port.name ? `as ${port.name}` : ''
    }`;

  const getVolumeMountDescription = (volumeMount: VolumeMount): string =>
    `${volumeMount.mountPath} → ${volumeMount.name} volume ${
      volumeMount.readOnly ? '(readonly)' : ''
    }`;

  const templateContainers = podTemplate.spec.containers;
  for (const [index, container] of templateContainers.entries()) {
    const name =
      templateContainers.length > 1 ? `container${index + 1}` : 'container';

    const containerDetails: string[] = [
      `name: ${container.name}`,
      `image: ${container.image}`,
      ...(container.ports ?? []).map(getPortDescription),
      ...(container.volumeMounts ?? []).map(getVolumeMountDescription),
    ];

    customMetadata[name] = containerDetails;
  }

  const volumes = podTemplate.spec.volumes ?? [];
  for (const [index, volume] of volumes.entries()) {
    const name = volumes.length > 1 ? `volume${index + 1}` : 'volume';

    const volumeSource = (): string => {
      if (volume.configMap) {
        return `${volume.configMap.name} config map`;
      }
      if (volume.persistentVolumeClaim) {
        return `${volume.persistentVolumeClaim?.claimName} persistent volume claim`;
      }
      return '';
    };

    const volumeDescription = `${volume.name} → ${volumeSource()}`;

    customMetadata[name] = volumeDescription;
  }

  return customMetadata;
};
