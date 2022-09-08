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

type DeleteField = { _isDeleted?: boolean };

export type Deletable<T> = T & DeleteField;

export const isActiveElement = <T extends DeleteField>(element: T): boolean =>
  !element._isDeleted;

export const getActiveElements = <T extends DeleteField>(list: T[]): T[] =>
  list.filter(isActiveElement);

export const undefinedIfEmpty = <T>(list: T[]): T[] | undefined =>
  list.length > 0 ? list : undefined;

export const updateList = <T>(
  list: T[],
  newValue: T | undefined,
  idx: number,
): T[] => {
  list[idx] = newValue || { ...list[idx], _isDeleted: true };
  return list;
};
