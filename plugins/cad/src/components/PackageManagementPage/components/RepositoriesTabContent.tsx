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

import { LinkButton } from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import { makeStyles } from '@material-ui/core';
import { groupBy } from 'lodash';
import React from 'react';
import { registerRepositoryRouteRef } from '../../../routes';
import { RepositorySummary } from '../../../types/RepositorySummary';
import { showRegisteredFunctionRepositories } from '../../../utils/featureFlags';
import {
  ContentSummary,
  getPackageDescriptor,
  PackageContentSummaryOrder,
} from '../../../utils/repository';
import { RepositoriesTable } from './RepositoriesTable';

type RepositoriesTabContentProps = {
  summaries: RepositorySummary[];
};

export const useStyles = makeStyles({
  repositoriesTablesList: {
    '& > *': {
      marginBottom: '24px',
    },
  },
});

const getDescriptor = (summary: RepositorySummary): string =>
  getPackageDescriptor(summary.repository);

export const RepositoriesTabContent = ({
  summaries,
}: RepositoriesTabContentProps) => {
  const classes = useStyles();
  const registerRepositoryRef = useRouteRef(registerRepositoryRouteRef);

  const repositoriesByContentType = groupBy(summaries, getDescriptor);

  return (
    <div className={classes.repositoriesTablesList}>
      <div style={{ textAlign: 'right' }}>
        <LinkButton
          to={registerRepositoryRef()}
          color="primary"
          variant="contained"
        >
          Register Repository
        </LinkButton>
      </div>

      {PackageContentSummaryOrder.map(contentType => (
        <RepositoriesTable
          key={contentType}
          title={`${contentType} Repositories`}
          contentType={contentType}
          repositories={repositoriesByContentType[contentType] ?? []}
        />
      ))}

      {showRegisteredFunctionRepositories() && (
        <RepositoriesTable
          title="Function Repositories"
          contentType={ContentSummary.FUNCTION}
          repositories={
            repositoriesByContentType[ContentSummary.FUNCTION] ?? []
          }
        />
      )}
    </div>
  );
};
