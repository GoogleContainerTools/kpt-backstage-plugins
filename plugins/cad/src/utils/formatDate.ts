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

import moment from 'moment';

const DATE_FORMAT = `MMMM D, YYYY`;
const DATE_TIME_FORMAT = `MMMM D, YYYY h:mm A`;

export const formatCreationTimestamp = (
  timestamp?: string,
  includeTime: boolean = false,
): string => {
  if (!timestamp) return '';

  const timeFormat = includeTime ? DATE_TIME_FORMAT : DATE_FORMAT;

  return moment(timestamp).format(timeFormat);
};
