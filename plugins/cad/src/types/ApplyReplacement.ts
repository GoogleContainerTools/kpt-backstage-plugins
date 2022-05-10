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

import { KubernetesKeyValueObject } from './KubernetesResource';

export type ApplyReplacement = {
  kind: string;
  apiVersion: string;
  metadata: ApplyReplacementMetadata;
  replacements: ApplyReplacementReplacement[];
};

export type ApplyReplacementMetadata = {
  name: string;
  labels?: KubernetesKeyValueObject;
  annotations?: KubernetesKeyValueObject;
};

export type ApplyReplacementReplacement = {
  source: ReplacementSource;
  targets: ReplacementTarget[];
};

export type ReplacementSource = ReplacementResourceSelector & {
  fieldPath?: string;
};

export type ReplacementTarget = {
  select: ReplacementResourceSelector;
  fieldPaths: string[];
  options?: ReplacementOptions;
};

export type ReplacementResourceSelector = {
  kind?: string;
  name?: string;
};

export type ReplacementOptions = {
  delimiter?: string;
  index?: number;
};
