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
  Container,
  ContainerPort,
  EnvFromSource,
  EnvVar,
  PodSpec,
  PodTemplateSpec,
  Probe,
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
  const portDetail = `${port.protocol || 'TCP'} port ${port.containerPort}`;
  const portName = port.name ?? '';

  return `expose: ${portDetail} ${portName ? `as ${portName}` : ''}`;
};

const getVolumeMountDescription = (
  volumeMount: VolumeMount,
  volumeSources: { [volumeName: string]: string },
): string => {
  return `mount: ${volumeMount.mountPath} → ${volumeMount.name} (${ifSet(
    volumeMount.readOnly,
    'readonly ',
  )}${volumeSources[volumeMount.name]})`;
};

const getProbeDescription = (probe: Probe): string => {
  const statements = [];
  if (probe.initialDelaySeconds) {
    statements.push(`${probe.initialDelaySeconds}s initial delay`);
  }
  if (probe.periodSeconds) {
    statements.push(`${probe.periodSeconds}s polling`);
  }
  if (probe.timeoutSeconds) {
    statements.push(`${probe.timeoutSeconds}s timeout`);
  }
  const desc = statements.join(', ');

  if (probe.httpGet)
    return `http get ${probe.httpGet.path}:${probe.httpGet.port} ${desc}`;

  if (probe.exec)
    return `exec ${probe.exec.command?.join(' ') || '(none)'} ${desc}`;

  if (probe.tcpSocket) return `tcp ${probe.tcpSocket.port} ${desc}`;

  return 'unknown';
};

const getContainerImage = (container: Container): string[] => {
  const image = container.image || '';

  const statements: string[] = [
    `image: ${image.split(':')[0]}`,
    `image tag: ${image.split(':')[1] ?? ''}`,
  ];

  if (container.imagePullPolicy) {
    statements.push(`pull policy: ${container.imagePullPolicy}`);
  }

  return statements;
};

const getContainerConfig = (container: Container): string[] => {
  const statements: string[] = [];

  if (container.command) {
    statements.push(`command: ${container.command.join(' ')}`);
  }
  if (container.args) {
    statements.push(`args: ${container.args.join(' ')}`);
  }

  return statements;
};

const getContainerEnv = (container: Container): string[] => {
  const statements: string[] = [];

  (container.env ?? []).forEach(env => {
    statements.push(`env: ${env.name} = ${getEnvVarValue(env)}`);
  });
  (container.envFrom ?? []).forEach(envFrom => {
    statements.push(`env from: ${getEnvFromValue(envFrom)}`);
  });

  return statements;
};

const getContainerPorts = (container: Container): string[] => {
  return (container.ports ?? []).map(getPortDescription);
};

const getContainerVolumeMounts = (
  container: Container,
  volumes: Volume[],
): string[] => {
  const volumeSources: { [volumeName: string]: string } = {};
  (volumes ?? []).forEach(volume => {
    volumeSources[volume.name] = getVolumeSource(volume);
  });

  const statements = (container.volumeMounts ?? []).map(volumeMount =>
    getVolumeMountDescription(volumeMount, volumeSources),
  );

  return statements;
};

const getContainerResources = (container: Container): string[] => {
  const statements: string[] = [];

  if (container.resources) {
    if (container.resources.requests?.cpu || container.resources.limits?.cpu) {
      statements.push(
        `resources: cpu ${container.resources.requests?.cpu || 'not set'}/${
          container.resources.limits?.cpu || 'not set'
        }`,
      );
    }
    if (
      container.resources.requests?.memory ||
      container.resources.limits?.memory
    ) {
      statements.push(
        `resources: memory ${
          container.resources.requests?.memory || 'not set'
        }/${container.resources.limits?.memory || 'not set'}`,
      );
    }
  }

  return statements;
};

const getContainerProbes = (container: Container): string[] => {
  const statements: string[] = [];

  if (container.startupProbe) {
    statements.push(
      `startup probe: ${getProbeDescription(container.startupProbe)}`,
    );
  }
  if (container.readinessProbe) {
    statements.push(
      `readiness probe: ${getProbeDescription(container.readinessProbe)}`,
    );
  }
  if (container.livenessProbe) {
    statements.push(
      `liveness probe: ${getProbeDescription(container.livenessProbe)}`,
    );
  }

  return statements;
};

const getContainerSecurity = (container: Container): string[] => {
  const statements: string[] = [];

  const security = container.securityContext;

  if (security) {
    if (security.privileged) {
      statements.push('security: privileged');
    }
    if (security.allowPrivilegeEscalation) {
      statements.push(`security: allow privilege escalation`);
    }
    if (security.readOnlyRootFilesystem) {
      statements.push(`security: readonly root filesystem`);
    }
    if (security.runAsNonRoot) {
      statements.push('security: run as non-root user');
    }
    if (security.runAsUser) {
      statements.push(`security: run as user ${security.runAsUser}`);
    }
    if (security.runAsGroup) {
      statements.push(`security: run as group ${security.runAsGroup}`);
    }
    if (security.capabilities?.add) {
      statements.push(
        `security capabilities: add ${security.capabilities.add.join(', ')}`,
      );
    }
    if (security.capabilities?.drop) {
      statements.push(
        `security capabilities: drop ${security.capabilities.drop.join(', ')}`,
      );
    }
  }

  return statements;
};

const getPodSecurity = (pod: PodSpec): string[] => {
  const statements: string[] = [];

  const security = pod.securityContext;

  if (security) {
    if (security.runAsNonRoot) {
      statements.push('security: run as non-root user');
    }
    if (security.runAsUser) {
      statements.push(`security: run as user ${security.runAsUser}`);
    }
    if (security.runAsGroup) {
      statements.push(`security: run as group ${security.runAsGroup}`);
    }
    if (security.fsGroup) {
      statements.push(`security: use file system group ${security.fsGroup}`);
    }
  }

  return statements;
};

const getPodDetails = (pod: PodSpec): string[] => {
  const podServiceAccount = pod.serviceAccountName
    ? [`service account: ${pod.serviceAccountName}`]
    : [];
  const podTerminationGracePeriod = pod.terminationGracePeriodSeconds
    ? [`termination grace period: ${pod.terminationGracePeriodSeconds}s`]
    : [];

  const podSecurity = getPodSecurity(pod);

  const populatedDetails = [
    podServiceAccount,
    podTerminationGracePeriod,
    podSecurity,
  ].filter(details => details.length > 0);

  const podDetails: string[] = [];

  for (const details of populatedDetails) {
    if (podDetails.length > 0) {
      podDetails.push('');
    }

    podDetails.push(...details);
  }

  return podDetails;
};

const getContainerDetails = (
  container: Container,
  podVolumes: Volume[],
): string[] => {
  const containerName = `container: ${container.name}`;
  const containerImage = getContainerImage(container);
  const containerConfig = getContainerConfig(container);
  const containerEnv = getContainerEnv(container);
  const containerPorts = getContainerPorts(container);
  const containerVolumes = getContainerVolumeMounts(container, podVolumes);
  const containerProbes = getContainerProbes(container);
  const containerResources = getContainerResources(container);
  const containerSecurity = getContainerSecurity(container);

  const populatedDetails = [
    containerImage,
    containerConfig,
    containerEnv,
    containerPorts,
    containerVolumes,
    containerProbes,
    containerResources,
    containerSecurity,
  ].filter(details => details.length > 0);

  const containerDetails = [containerName];

  for (const details of populatedDetails) {
    containerDetails.push('', ...details);
  }

  return containerDetails;
};

export const getPodTemplatedStructuredMetadata = (
  podTemplate: PodTemplateSpec,
): Metadata => {
  const podDetails = getPodDetails(podTemplate.spec);

  const customMetadata: Metadata = {
    pod: podDetails.length > 0 ? podDetails : undefined,
    podLabels: podTemplate.metadata.labels,
    podAnnotations: podTemplate.metadata.annotations,
  };

  const podContainers = podTemplate.spec.containers;
  const podVolumes = podTemplate.spec.volumes ?? [];

  for (const [index, container] of podContainers.entries()) {
    const name =
      podContainers.length > 1 ? `container${index + 1}` : 'container';

    const containerDetails = getContainerDetails(container, podVolumes);

    customMetadata[name] = containerDetails;
  }

  return customMetadata;
};
