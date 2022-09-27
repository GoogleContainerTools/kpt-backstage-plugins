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
  EnvFromSource,
  EnvVar,
  PodTemplateSpec,
  Volume,
  VolumeMount,
} from '../../../../../../types/Pod';
import { Metadata } from '../StructuredMetadata';

const ifSet = (condition: any, value: string): string => {
  return !!condition ? value : '';
};

const getVolumeSource = (volume: Volume): string => {
  if (volume.configMap) {
    return `${volume.configMap.name} config map`;
  }
  if (volume.persistentVolumeClaim) {
    return `${volume.persistentVolumeClaim?.claimName} persistent volume claim`;
  }
  if (volume.emptyDir) {
    return 'empty directory';
  }
  if (volume.secret) {
    return `${volume.secret.secretName} secret`;
  }
  return '';
};

const getEnvVarValue = (env: EnvVar): string => {
  const fieldRef = env.valueFrom?.fieldRef;
  const configMapKeyRef = env.valueFrom?.configMapKeyRef;
  const resourceFieldRef = env.valueFrom?.resourceFieldRef;
  const secretKeyRef = env.valueFrom?.secretKeyRef;

  if (configMapKeyRef) {
    const prefix = ifSet(configMapKeyRef.optional, 'optional ');
    return `${prefix}${configMapKeyRef.name} config map, ${configMapKeyRef.key} key`;
  }
  if (fieldRef) {
    return `${fieldRef.fieldPath} field path`;
  }
  if (resourceFieldRef) {
    return `${resourceFieldRef.resource} resource field ${ifSet(
      resourceFieldRef.divisor,
      `in ${resourceFieldRef.divisor}`,
    )}`;
  }
  if (secretKeyRef) {
    const prefix = ifSet(secretKeyRef.optional, 'optional ');
    return `${prefix}${secretKeyRef.name} secret, ${secretKeyRef.key} key`;
  }

  return env.value ?? '';
};

const getEnvFromValue = (envFrom: EnvFromSource): string => {
  const configMapRef = envFrom.configMapRef;
  const secretRef = envFrom.secretRef;

  if (configMapRef) {
    const prefix = ifSet(configMapRef.optional, 'optional ');
    return `${prefix}${configMapRef.name} config map`;
  }
  if (secretRef) {
    const prefix = ifSet(secretRef.optional, 'optional ');
    return `$${prefix}${secretRef.name} secret`;
  }

  return '';
};

const getPortDescription = (port: ContainerPort): string => {
  return `exposes ${port.protocol || 'TCP'} port ${port.containerPort} ${
    port.name ? `as ${port.name}` : ''
  }`;
};

const getVolumeMountDescription = (
  volumeMount: VolumeMount,
  volumeSources: { [volumeName: string]: string },
): string => {
  return `${volumeMount.mountPath} → ${volumeMount.name} (${ifSet(
    volumeMount.readOnly,
    'readonly ',
  )}${volumeSources[volumeMount.name]})`;
};

export const getPodTemplatedStructuredMetadata = (
  podTemplate: PodTemplateSpec,
): Metadata => {
  const customMetadata: Metadata = {
    serviceAccountName: podTemplate.spec.serviceAccountName,
    podLabels: podTemplate.metadata.labels,
    podAnnotations: podTemplate.metadata.annotations,
  };

  const volumeSources: { [volumeName: string]: string } = {};
  (podTemplate.spec.volumes ?? []).forEach(volume => {
    volumeSources[volume.name] = getVolumeSource(volume);
  });

  const templateContainers = podTemplate.spec.containers;
  for (const [index, container] of templateContainers.entries()) {
    const name =
      templateContainers.length > 1 ? `container${index + 1}` : 'container';

    const image = container.image ?? '';

    const containerConfiguration: string[] = [];
    if (container.command) {
      containerConfiguration.push(`command: ${container.command.join(' ')}`);
    }
    if (container.args) {
      containerConfiguration.push(`args: ${container.args.join(' ')}`);
    }
    (container.env ?? []).forEach(env => {
      containerConfiguration.push(
        `env var: ${env.name} = ${getEnvVarValue(env)}`,
      );
    });
    (container.envFrom ?? []).forEach(envFrom => {
      containerConfiguration.push(`env from ${getEnvFromValue(envFrom)}`);
    });

    const containerDetails: string[] = [
      `name: ${container.name}`,
      `image: ${image.split(':')[0]}`,
      `image tag: ${image.split(':')[1] ?? ''}`,
      ...containerConfiguration,
      ...(container.ports ?? []).map(getPortDescription),
      ...(container.volumeMounts ?? []).map(volumeMount =>
        getVolumeMountDescription(volumeMount, volumeSources),
      ),
    ];

    customMetadata[name] = containerDetails;
  }

  return customMetadata;
};
