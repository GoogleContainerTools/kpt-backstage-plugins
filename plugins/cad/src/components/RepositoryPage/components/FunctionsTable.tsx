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

import { Table, TableColumn } from '@backstage/core-components';
import React from 'react';
import { Function } from '../../../types/Function';
import { formatCreationTimestamp } from '../../../utils/formatDate';
import { groupFunctionsByName } from '../../../utils/function';

type FunctionsTableProps = {
  title: string;
  functions: Function[];
  showLatestVersionOnly: boolean;
};

type FunctionRow = {
  id: string;
  name: string;
  functionName: string;
  version: string;
  created: string;
};

const getTableColumns = (
  showLatestVersionOnly: boolean,
): TableColumn<FunctionRow>[] => {
  const columns: TableColumn<FunctionRow>[] = [
    { title: 'Name', field: 'functionName' },
    {
      title: showLatestVersionOnly ? 'Latest Version' : 'Version',
      field: 'version',
    },
    { title: 'Created', field: 'created' },
  ];

  return columns;
};

const getFunctionsList = (
  functions: Function[],
  showLatestVersionOnly: boolean,
): Function[] => {
  if (!showLatestVersionOnly) return functions;

  const functionsByName = groupFunctionsByName(functions);
  return Object.values(functionsByName)
    .map(fn => fn[0])
    .flat();
};

const mapToFunctionRow = (oneFunction: Function): FunctionRow => {
  const [_repositoryName, functionName, version] =
    oneFunction.metadata.name.split(':');

  return {
    id: oneFunction.metadata.name,
    name: oneFunction.metadata.name,
    functionName: functionName,
    version: version,
    created: formatCreationTimestamp(oneFunction.metadata.creationTimestamp),
  };
};

const compareFunctionRows = (
  functionRow1: FunctionRow,
  functionRow2: FunctionRow,
): number => {
  if (functionRow1.functionName === functionRow2.functionName) {
    return functionRow1.version > functionRow2.version ? -1 : 1;
  }

  return functionRow1.functionName > functionRow2.functionName ? 1 : -1;
};

export const FunctionsTable = ({
  title,
  functions,
  showLatestVersionOnly,
}: FunctionsTableProps) => {
  const columns = getTableColumns(showLatestVersionOnly);

  const functionsList = getFunctionsList(functions, showLatestVersionOnly);

  const data = functionsList.map(mapToFunctionRow).sort(compareFunctionRows);

  return (
    <Table
      title={title}
      options={{ search: false, paging: false }}
      columns={columns}
      data={data}
    />
  );
};
