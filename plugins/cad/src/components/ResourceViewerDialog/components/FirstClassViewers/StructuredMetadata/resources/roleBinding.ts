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
import {
  RoleBinding,
  RoleBindingSubject,
} from '../../../../../../types/RoleBinding';
import { Metadata } from '../StructuredMetadata';

export const getRoleBindingStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const roleBinding = resource as RoleBinding;

  const getSubjectDescription = (subject: RoleBindingSubject): string =>
    `→ ${subject.kind} ${subject.namespace ? `${subject.namespace}/` : ''}${
      subject.name
    }`;

  return {
    binding: [
      `${roleBinding.roleRef.kind} ${roleBinding.roleRef.name}`,
      ...roleBinding.subjects.map(getSubjectDescription),
    ],
  };
};
