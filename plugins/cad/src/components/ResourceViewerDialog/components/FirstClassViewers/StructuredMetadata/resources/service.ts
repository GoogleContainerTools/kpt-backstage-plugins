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
import { Service } from '../../../../../../types/Service';
import { Metadata } from '../StructuredMetadata';

export const getServiceStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const service = resource as Service;

  const customMetadata: Metadata = {
    type: service.spec.type,
    externalTrafficPolicy: service.spec.externalTrafficPolicy,
    sessionAffinity: service.spec.sessionAffinity,
    selector: service.spec.selector,
    clusterIP: service.spec.clusterIP,
  };

  if (service.spec.ports) {
    for (const port of service.spec.ports) {
      const name = port.name || 'Port';

      customMetadata[name] = [
        `${port.protocol ?? 'TCP'} ${port.port} ${
          port.targetPort ? ` to ${port.targetPort}` : undefined
        }`,
      ];
    }
  }

  return customMetadata;
};
