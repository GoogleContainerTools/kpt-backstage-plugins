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

import { KubeConfig } from '@kubernetes/client-node';
import { ClusterLocatorMethodType } from './config';

export const getKubernetesConfig = (
  clusterLocatorMethodType: ClusterLocatorMethodType,
): KubeConfig => {
  const kubeConfig = new KubeConfig();

  switch (clusterLocatorMethodType) {
    case ClusterLocatorMethodType.IN_CLUSTER:
      kubeConfig.loadFromCluster();
      break;
    case ClusterLocatorMethodType.CURRENT_CONTEXT:
      kubeConfig.loadFromDefault();
      break;
    default:
      throw new Error(
        `Unknown cluster locator method type, ${clusterLocatorMethodType}`,
      );
  }

  return kubeConfig;
};
