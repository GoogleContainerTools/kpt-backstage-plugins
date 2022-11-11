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

import {
  StatusError,
  StatusOK,
  StatusPending,
  Table,
  TableColumn,
} from '@backstage/core-components';
import React from 'react';
import { Condition, ConditionStatus } from '../../../types/PackageRevision';
import { toLowerCase } from '../../../utils/string';

type ConditionsTableProps = {
  conditions: Condition[];
};

type ConditionRow = Condition & {
  id: string;
};

const renderStatusColumn = (row: ConditionRow): JSX.Element => {
  const status = (
    <span style={{ fontWeight: 'normal' }}>{toLowerCase(row.status)}</span>
  );

  switch (row.status) {
    case ConditionStatus.TRUE:
      return <StatusOK>{status}</StatusOK>;

    case ConditionStatus.FALSE:
      return <StatusError>{status}</StatusError>;

    default:
      return <StatusPending>{status}</StatusPending>;
  }
};

const getTableColumns = (): TableColumn<ConditionRow>[] => {
  const cellStyle = { lineHeight: '1.5' };

  const columns: TableColumn<ConditionRow>[] = [
    { title: 'Status', render: renderStatusColumn, width: '115px' },
    { title: 'Type', field: 'type', width: 'fit-content', cellStyle },
    { title: 'Reason', field: 'reason', width: 'fit-content', cellStyle },
    { title: 'Message', field: 'message', width: '35vw', cellStyle },
  ];

  return columns;
};

const mapToConditionRow = (condition: Condition): ConditionRow => {
  return {
    id: condition.type,
    ...condition,
  };
};

export const ConditionsTable = ({ conditions }: ConditionsTableProps) => {
  const columns = getTableColumns();
  const data = conditions.map(mapToConditionRow);

  return (
    <Table
      title="Conditions"
      options={{ search: false, paging: false }}
      columns={columns}
      data={data}
    />
  );
};
