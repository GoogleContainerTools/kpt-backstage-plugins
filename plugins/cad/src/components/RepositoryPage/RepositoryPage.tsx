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
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import { addPackageRouteRef } from '../../routes';
import { Function } from '../../types/Function';
import { Repository } from '../../types/Repository';
import { RepositorySummary } from '../../types/RepositorySummary';
import { RootSync } from '../../types/RootSync';
import { isConfigSyncEnabled } from '../../utils/featureFlags';
import {
  getPackageSummaries,
  PackageSummary,
  updatePackageSummariesSyncStatus,
} from '../../utils/packageSummary';
import {
  getPackageDescriptor,
  getRepositoryTitle,
  isDeploymentRepository,
  isFunctionRepository,
  isPackageRepository,
} from '../../utils/repository';
import {
  getRepositorySummaries,
  getRepositorySummary,
} from '../../utils/repositorySummary';
import { RepositoriesLink } from '../Links';
import { PackagesTable } from '../PackagesTable';
import { AdvancedRepositoryOptions } from './components/AdvancedRepositoryOptions';
import { FunctionsTable } from './components/FunctionsTable';

export const RepositoryPage = () => {
  const { repositoryName } = useParams();
  const api = useApi(configAsDataApiRef);

  const addPackageRef = useRouteRef(addPackageRouteRef);

  const allRepositories = useRef<Repository[]>([]);
  const [repositorySummary, setRepositorySummary] =
    useState<RepositorySummary>();
  const [packageSummaries, setPackageSummaries] = useState<PackageSummary[]>(
    [],
  );
  const [functions, setFunctions] = useState<Function[]>([]);

  const configSyncEnabled = isConfigSyncEnabled();

  const { loading: repositoryLoading, error: repositoryError } =
    useAsync(async (): Promise<void> => {
      const { items: thisAllRepositories } = await api.listRepositories();
      const repositorySummaries = getRepositorySummaries(thisAllRepositories);

      const thisRepositorySummary = await getRepositorySummary(
        repositorySummaries,
        repositoryName,
      );

      allRepositories.current = thisAllRepositories;
      setRepositorySummary(thisRepositorySummary);
    }, [repositoryName]);

  const { loading: packagesLoading, error: packagesError } =
    useAsync(async (): Promise<void> => {
      if (repositorySummary) {
        const thisRepository = repositorySummary.repository;
        if (isFunctionRepository(thisRepository)) {
          const thisFunctions = await api.listFunctions(repositoryName);
          setFunctions(thisFunctions);
        }

        if (isPackageRepository(thisRepository)) {
          const getRootSyncs = async (): Promise<RootSync[]> => {
            if (!configSyncEnabled || !isDeploymentRepository(thisRepository))
              return [];

            const { items: rootSyncs } = await api.listRootSyncs();
            return rootSyncs;
          };

          const [allPackageRevisions, syncs] = await Promise.all([
            api.listPackageRevisions(),
            getRootSyncs(),
          ]);

          const thisPackageSummaries = getPackageSummaries(
            allPackageRevisions,
            [repositorySummary],
            allRepositories.current,
          );

          if (isDeploymentRepository(thisRepository)) {
            const updatedPackageSummaries = updatePackageSummariesSyncStatus(
              thisPackageSummaries,
              syncs,
            );
            setPackageSummaries(updatedPackageSummaries);
          } else {
            setPackageSummaries(thisPackageSummaries);
          }
        }
      }
    }, [repositorySummary]);

  useEffect(() => {
    if (
      repositorySummary &&
      configSyncEnabled &&
      isDeploymentRepository(repositorySummary.repository) &&
      packageSummaries.length > 0
    ) {
      const refreshRootSync = async (): Promise<void> => {
        const { items: syncs } = await api.listRootSyncs();

        setPackageSummaries(thisPackageSummaries =>
          updatePackageSummariesSyncStatus(thisPackageSummaries, syncs),
        );
      };

      const refreshSeconds = 10;
      const refreshTimeout = setTimeout(
        () => refreshRootSync(),
        refreshSeconds * 1000,
      );

      return () => {
        clearTimeout(refreshTimeout);
      };
    }

    return undefined;
  }, [api, repositorySummary, packageSummaries, configSyncEnabled]);

  if (repositoryLoading || packagesLoading) {
    return <Progress />;
  } else if (repositoryError) {
    return <Alert severity="error">{repositoryError.message}</Alert>;
  }

  if (!repositorySummary) {
    return <Alert severity="error">Repository not found</Alert>;
  }

  const thisRepository = repositorySummary.repository;
  const repoTitle = getRepositoryTitle(thisRepository);

  const packageDescriptor = getPackageDescriptor(thisRepository);

  const renderTable = (): JSX.Element => {
    if (packagesError) {
      return <Alert severity="error">{packagesError.message}</Alert>;
    }

    if (isPackageRepository(repositorySummary.repository)) {
      const showSyncStatusColumn = isDeploymentRepository(
        repositorySummary.repository,
      );

      return (
        <PackagesTable
          title={`${packageDescriptor}s`}
          packages={packageSummaries}
          showSyncStatusColumn={showSyncStatusColumn}
        />
      );
    }

    if (isFunctionRepository(repositorySummary.repository)) {
      return (
        <FunctionsTable
          title={`${packageDescriptor}s`}
          functions={functions}
          showLatestVersionOnly
        />
      );
    }

    throw new Error('Cannot determine the table to render');
  };

  return (
    <div>
      <Breadcrumbs>
        <RepositoriesLink breadcrumb />
        <Typography>{repoTitle}</Typography>
      </Breadcrumbs>

      <ContentHeader title={repoTitle}>
        <Button
          to={addPackageRef({ repositoryName: repositoryName })}
          color="primary"
          variant="contained"
        >
          Add {packageDescriptor}
        </Button>
      </ContentHeader>

      <Tabs
        tabs={[
          {
            label: `${packageDescriptor}s`,
            content: renderTable(),
          },
          {
            label: 'Advanced',
            content: (
              <AdvancedRepositoryOptions
                repositorySummary={repositorySummary}
              />
            ),
          },
        ]}
      />
    </div>
  );
};
