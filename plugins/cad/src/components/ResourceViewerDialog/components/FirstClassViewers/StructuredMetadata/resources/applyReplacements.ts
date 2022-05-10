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
import { Metadata } from '../StructuredMetadata';

export const getApplyReplacementsStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const applyReplacements = resource as any;

  const customMetadata: Metadata = {};

  for (const [index, replacement] of applyReplacements.replacements.entries()) {
    const name =
      applyReplacements.replacements.length > 1
        ? `Replacement ${index + 1}`
        : 'Replacement';

    const targetDetails = replacement.targets.map(
      (target: any) =>
        `Target: ${target.select.kind} ${
          target.select.name
        } ${target.fieldPaths.join(', ')}`,
    );

    customMetadata[name] = [
      `Source: ${replacement.source.kind} ${replacement.source.name} ${replacement.source.fieldPath}`,
      ...targetDetails,
    ];
  }

  return customMetadata;
};
