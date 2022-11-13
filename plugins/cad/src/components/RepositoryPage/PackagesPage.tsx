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
import { Typography } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import { Repository } from '../../types/Repository';
import { RootSync } from '../../types/RootSync';
import { isConfigSyncEnabled } from '../../utils/featureFlags';
import {
  getPackageSummaries,
  PackageSummary,
  updatePackageSummariesSyncStatus,
} from '../../utils/packageSummary';
import {
  getPackageDescriptor,
  RepositoryContentDetails,
} from '../../utils/repository';
import { getRepositorySummaries } from '../../utils/repositorySummary';
import { LandingPageLink } from '../Links';
import { PackagesTabContent } from './components/PackagesTabContent';

export const PackagesPage = () => {
  const { packageContent } = useParams();
  const api = useApi(configAsDataApiRef);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [packageSummaries, setPackageSummaries] = useState<PackageSummary[]>(
    [],
  );

  const contentDetails = Object.values(RepositoryContentDetails).find(
    thisContentDetails => thisContentDetails.contentLink === packageContent,
  );
  const packageDescriptor = contentDetails?.contentSummary || '';
  const useConfigSync = isConfigSyncEnabled() && !!contentDetails?.isDeployment;

  const { loading, error: packagesError } =
    useAsync(async (): Promise<void> => {
      if (!packageDescriptor) throw new Error('Package discriptor not set');

      const { items: thisAllRepositories } = await api.listRepositories();
      const allRepositorySummaries =
        getRepositorySummaries(thisAllRepositories);

      const contentRepositorySummaries = allRepositorySummaries.filter(
        summary =>
          getPackageDescriptor(summary.repository) === packageDescriptor,
      );

      setRepositories(contentRepositorySummaries.map(r => r.repository));

      const allRepositories = thisAllRepositories;

      const getRootSyncs = async (): Promise<RootSync[]> => {
        if (!useConfigSync) return [];

        const { items: rootSyncs } = await api.listRootSyncs();
        return rootSyncs;
      };

      const [allPackageRevisions, syncs] = await Promise.all([
        api.listPackageRevisions(),
        getRootSyncs(),
      ]);

      const thisPackageSummaries = getPackageSummaries(
        allPackageRevisions,
        contentRepositorySummaries,
        allRepositories,
      );

      if (useConfigSync) {
        const updatedPackageSummaries = updatePackageSummariesSyncStatus(
          thisPackageSummaries,
          syncs,
        );
        setPackageSummaries(updatedPackageSummaries);
      } else {
        setPackageSummaries(thisPackageSummaries);
      }
    }, []);

  useEffect(() => {
    if (useConfigSync && packageSummaries.length > 0) {
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
  }, [api, packageSummaries, useConfigSync]);

  if (!contentDetails) {
    return <Alert severity="error">Unknown package content type</Alert>;
  }

  if (loading) {
    return <Progress />;
  }

  const pluralPackageDescriptor = `${packageDescriptor}s`;

  return (
    <div>
      <Breadcrumbs>
        <LandingPageLink breadcrumb />
        <Typography>{pluralPackageDescriptor}</Typography>
      </Breadcrumbs>

      <ContentHeader title={pluralPackageDescriptor} />

      <Tabs
        tabs={[
          {
            label: pluralPackageDescriptor,
            content: (
              <PackagesTabContent
                packageDescriptor={packageDescriptor}
                repositories={repositories}
                packages={packageSummaries}
                functions={[]}
                packagesError={packagesError}
              />
            ),
          },
        ]}
      />
    </div>
  );
};
