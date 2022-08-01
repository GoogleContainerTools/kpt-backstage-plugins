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
  Tabs,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { Typography } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import { registerRepositoryRouteRef } from '../../routes';
import { RepositoryContent } from '../../types/Repository';
import { RepositorySummary } from '../../types/RepositorySummary';
import { showRegisteredFunctionRepositories } from '../../utils/featureFlags';
import {
  isCatalogBlueprintRepository,
  isDeployableBlueprintRepository,
  isDeploymentRepository,
  isFunctionRepository,
} from '../../utils/repository';
import {
  fitlerRepositorySummary,
  listRepositorySummaries,
  populatePackageSummaries,
} from '../../utils/repositorySummary';
import { RepositoriesTable } from './components/RepositoriesTable';

interface TabProps {
  content: any;
  label: string;
}

const createRepositoriesTable = (
  descriptor: string,
  repositories: RepositorySummary[],
  content: RepositoryContent,
): JSX.Element => (
  <RepositoriesTable
    title={`${descriptor}s Repository`}
    packageDescriptor={descriptor}
    repositories={repositories}
    repositoryContent={content}
  />
);

const getDeploymentsTab = (
  allRepositorySummaries: RepositorySummary[],
): TabProps => ({
  label: 'Deployments',
  content: createRepositoriesTable(
    'Deployment',
    fitlerRepositorySummary(allRepositorySummaries, isDeploymentRepository),
    RepositoryContent.PACKAGE,
  ),
});

const getBlueprintsTab = (
  allRepositorySummaries: RepositorySummary[],
): TabProps => ({
  label: 'Blueprints',
  content: createRepositoriesTable(
    'Blueprint',
    fitlerRepositorySummary(
      allRepositorySummaries,
      isDeployableBlueprintRepository,
    ),
    RepositoryContent.PACKAGE,
  ),
});

const getAbstractBlueprintsTab = (
  allRepositorySummaries: RepositorySummary[],
): TabProps => ({
  label: 'Catalog Blueprints',
  content: createRepositoriesTable(
    'Catalog Blueprint',
    fitlerRepositorySummary(
      allRepositorySummaries,
      isCatalogBlueprintRepository,
    ),
    RepositoryContent.PACKAGE,
  ),
});

const getFunctionsTab = (
  allRepositorySummaries: RepositorySummary[],
): TabProps => ({
  label: 'Functions',
  content: createRepositoriesTable(
    'Function',
    fitlerRepositorySummary(allRepositorySummaries, isFunctionRepository),
    RepositoryContent.FUNCTION,
  ),
});

const getRepositoryTabs = (
  allRepositories: RepositorySummary[],
): TabProps[] => {
  const tabs: TabProps[] = [
    getDeploymentsTab(allRepositories),
    getBlueprintsTab(allRepositories),
    getAbstractBlueprintsTab(allRepositories),
  ];

  if (showRegisteredFunctionRepositories()) {
    tabs.push(getFunctionsTab(allRepositories));
  }

  return tabs;
};

export const RepositoryListPage = () => {
  const api = useApi(configAsDataApiRef);

  const registerRepository = useRouteRef(registerRepositoryRouteRef);

  const {
    value: allRepositorySummaries,
    loading,
    error,
  } = useAsync(async () => {
    const repositorySummaries = await listRepositorySummaries(api);

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

  const repositoryTabs = getRepositoryTabs(allRepositorySummaries);

  return (
    <div>
      <Breadcrumbs>
        <Typography>Repositories</Typography>
      </Breadcrumbs>

      <ContentHeader title="Repositories">
        <Button
          component={RouterLink}
          to={registerRepository()}
          color="primary"
          variant="contained"
        >
          Register Repository
        </Button>
      </ContentHeader>

      <Tabs tabs={repositoryTabs} />
    </div>
  );
};
