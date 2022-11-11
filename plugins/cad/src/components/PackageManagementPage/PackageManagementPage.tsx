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
  Breadcrumbs,
  Button,
  ContentHeader,
  Progress,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { makeStyles, Typography } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { groupBy } from 'lodash';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import { registerRepositoryRouteRef } from '../../routes';
import { showRegisteredFunctionRepositories } from '../../utils/featureFlags';
import {
  ContentSummary,
  getPackageDescriptor,
  PackageContentSummaryOrder,
} from '../../utils/repository';
import {
  getRepositorySummaries,
  populatePackageSummaries,
} from '../../utils/repositorySummary';
import { RepositoriesTable } from './components/RepositoriesTable';

export const useStyles = makeStyles({
  repositoriesTablesSection: {
    '& > *': {
      marginBottom: '24px',
    },
  },
});

export const PackageManagementPage = () => {
  const classes = useStyles();
  const api = useApi(configAsDataApiRef);

  const registerRepository = useRouteRef(registerRepositoryRouteRef);

  const {
    value: allRepositorySummaries,
    loading,
    error,
  } = useAsync(async () => {
    const { items: allRepositories } = await api.listRepositories();
    const repositorySummaries = getRepositorySummaries(allRepositories);

    try {
      const allPackageRevisions = await api.listPackageRevisions();

      populatePackageSummaries(repositorySummaries, allPackageRevisions);
    } catch {
      // Best effort only. An error from the Package Revision API should not prevent
      // the page from rendering.
    }

    return repositorySummaries;
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!allRepositorySummaries) {
    throw new Error('Repository summaries is not defined');
  }

  const repositoriesByContentType = groupBy(
    allRepositorySummaries,
    ({ repository }) => getPackageDescriptor(repository),
  );

  return (
    <div>
      <Breadcrumbs>
        <Typography>Package Management</Typography>
      </Breadcrumbs>

      <ContentHeader title="Package Management">
        <Button
          component={RouterLink}
          to={registerRepository()}
          color="primary"
          variant="contained"
        >
          Register Repository
        </Button>
      </ContentHeader>

      <div className={classes.repositoriesTablesSection}>
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
    </div>
  );
};
