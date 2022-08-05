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
import { Role } from '../../../../../../types/Role';
import { Metadata } from '../StructuredMetadata';

export const getRoleStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const role = resource as Role;

  const customMetadata: Metadata = {};

  for (const [index, rule] of role.rules.entries()) {
    const name =
      role.rules.length > 1 ? `permissions${index + 1}` : 'permissions';

    const mapAsterix =
      (description: string) =>
      (value: string): string =>
        value === '*' ? description : value;

    const groups = (rule.apiGroups ?? ['*'])
      .map(mapAsterix('all groups'))
      .map(apiGroup => apiGroup || 'core');
    const resources = (rule.resources ?? ['*']).map(
      mapAsterix('all resources'),
    );
    const verbs = (rule.verbs ?? ['*']).map(mapAsterix('all verbs'));

    const groupsList = groups.join(', ');
    const resourcesList = resources.join(', ');
    const verbsList = verbs.join(', ');
    const resoureNamesList =
      (rule.resourceNames ?? []).length > 0
        ? `- ${rule.resourceNames?.join(', ')}`
        : ``;

    customMetadata[name] = [
      `${groupsList} ${resourcesList} ${resoureNamesList}`,
      `→ ${verbsList}`,
    ];
  }

  return customMetadata;
};
