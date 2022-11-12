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
  ContentHeader,
  Progress,
  Tabs,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { makeStyles, Typography } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import {
  getRepositorySummaries,
  populatePackageSummaries,
} from '../../utils/repositorySummary';
import { DashboardTabContent } from './components/DashboardTabContent';
import { RepositoriesTabContent } from './components/RepositoriesTabContent';

export const useStyles = makeStyles({
  repositoriesTablesSection: {
    '& > *': {
      marginBottom: '24px',
    },
  },
});

export const PackageManagementPage = () => {
  const api = useApi(configAsDataApiRef);

  const {
    value: allSummaries,
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

  if (!allSummaries) {
    throw new Error('Repository summaries is not defined');
  }

  return (
    <div>
      <Breadcrumbs>
        <Typography>Package Management</Typography>
      </Breadcrumbs>

      <ContentHeader title="Package Management" />

      <Tabs
        tabs={[
          {
            label: 'Dashboard',
            content: <DashboardTabContent summaries={allSummaries} />,
          },
          {
            label: 'Repositories',
            content: <RepositoriesTabContent summaries={allSummaries} />,
          },
        ]}
      />
    </div>
  );
};
