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

import { Kptfile, KptfileFunction } from '../../../types/Kptfile';
import { PackageResource } from '../../../utils/packageRevisionResources';

type Pipeline = 'mutator' | 'validator';

export const findKptfileFunctionConfig = (
  resources: PackageResource[],
  fn: KptfileFunction,
): PackageResource | undefined => {
  return resources.find(resource => resource.filename === fn.configPath);
};

export const isFunctionConfigDeletable = (
  resource: PackageResource,
): boolean => {
  return (
    resource.isLocalConfigResource &&
    resource.filename !== 'package-context.yaml'
  );
};

export const removeKptfileFunction = (
  kptfile: Kptfile,
  pipeline: Pipeline,
  fn: KptfileFunction,
): void => {
  const kptPipeline = kptfile.pipeline;

  if (pipeline === 'mutator' && kptPipeline.mutators) {
    kptPipeline.mutators = kptPipeline.mutators.filter(
      mutatorFn => mutatorFn !== fn,
    );
  }

  if (pipeline === 'validator' && kptPipeline.validators) {
    kptPipeline.validators = kptPipeline.validators.filter(
      validatorFn => validatorFn !== fn,
    );
  }
};
