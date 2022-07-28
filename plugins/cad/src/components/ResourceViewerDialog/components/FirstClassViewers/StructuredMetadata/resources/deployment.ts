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

import { Deployment } from '../../../../../../types/Deployment';
import { KubernetesResource } from '../../../../../../types/KubernetesResource';
import { Metadata } from '../StructuredMetadata';
import { getPodTemplatedStructuredMetadata } from './podTemplate';

export const getDeploymentStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const deployment = resource as Deployment;

  const podMetadata: Metadata = getPodTemplatedStructuredMetadata(
    deployment.spec.template,
  );

  return {
    replicas: deployment.spec.replicas,
    serviceAccountName: deployment.spec.template.spec.serviceAccountName,
    ...podMetadata,
  };
};
