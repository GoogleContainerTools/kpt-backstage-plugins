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

import { KubernetesResource } from '../types/KubernetesResource';

export const removeInternalKptAnnotations = (
  resource: KubernetesResource,
): void => {
  const resourceMetadata = resource.metadata;

  if (resourceMetadata.annotations) {
    const internalAnnotations = Object.keys(
      resourceMetadata.annotations,
    ).filter(annotation => annotation.startsWith('internal.kpt.dev/'));

    internalAnnotations.forEach(
      internalAnnotation =>
        delete resourceMetadata.annotations?.[internalAnnotation],
    );

    if (Object.keys(resourceMetadata.annotations).length === 0) {
      delete resourceMetadata.annotations;
    }
  }
};
