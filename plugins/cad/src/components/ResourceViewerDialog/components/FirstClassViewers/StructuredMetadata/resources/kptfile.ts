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

import { Kptfile, KptfileFunction } from '../../../../../../types/Kptfile';
import { KubernetesResource } from '../../../../../../types/KubernetesResource';
import { getFunctionNameAndTagFromImage } from '../../../../../../utils/function';
import { Metadata } from '../StructuredMetadata';

const getKptFunctionDescription = (fn: KptfileFunction): string => {
  const functionNameAndTag = getFunctionNameAndTagFromImage(fn.image);

  if (fn.configPath) {
    return `${functionNameAndTag}, ${fn.configPath} config`;
  }

  return functionNameAndTag;
};

export const getKptfileStructuredMetadata = (
  resource: KubernetesResource,
): Metadata => {
  const kptFile = resource as Kptfile;

  return {
    description: kptFile.info.description,
    keywords: kptFile.info.keywords,
    upstream: kptFile.upstream?.git
      ? `${kptFile.upstream.git.repo}/${kptFile.upstream.git.directory}@${kptFile.upstream?.git?.ref}`
      : '',
    mutators: kptFile.pipeline?.mutators?.map(getKptFunctionDescription),
    validators: kptFile.pipeline?.validators?.map(getKptFunctionDescription),
  };
};
