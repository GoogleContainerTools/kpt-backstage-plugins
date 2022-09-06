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

import { Ingress, IngressBackend } from '../../../../../../types/Ingress';
import { KubernetesResource } from '../../../../../../types/KubernetesResource';
import { Metadata } from '../StructuredMetadata';

export const getIngressStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const ingress = resource as Ingress;

  const customMetadata: Metadata = {
    className: ingress.spec.ingressClassName,
  };

  if (ingress.spec.tls) {
    for (const [index, tls] of ingress.spec.tls.entries()) {
      const name = ingress.spec.tls.length > 1 ? `TLS ${index + 1}` : 'TLS';
      customMetadata[name] = [
        `${tls.hosts?.join(', ') ?? '*'}`,
        `Secret Name: ${tls.secretName}`,
      ];
    }
  }

  const getBackendDescription = (backend: IngressBackend): string => {
    if (backend.service) {
      const service = backend.service;
      return `${service.name}:${service.port.name || service.port.number}`;
    }
    if (backend.resource) {
      const backendResource = backend.resource;
      return `${backendResource.name} ${backendResource.kind}`;
    }

    return `no backend`;
  };

  if (ingress.spec.defaultBackend) {
    customMetadata.defaultBackend = getBackendDescription(
      ingress.spec.defaultBackend,
    );
  }

  if (ingress.spec.rules) {
    for (const [index, rule] of ingress.spec.rules.entries()) {
      const name =
        ingress.spec.rules.length > 1
          ? `Ingress Rule ${index + 1}`
          : 'Ingress Rule';
      customMetadata[name] = [
        ...(rule.http?.paths ?? []).map(
          path =>
            `${path.pathType} Match: ${rule.host ?? ''}${
              path.path
            } → ${getBackendDescription(path.backend)}`,
        ),
      ];
    }
  }

  return customMetadata;
};
