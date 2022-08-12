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
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { makeStyles, Typography } from '@material-ui/core';
import Alert, { Color } from '@material-ui/lab/Alert';
import { cloneDeep } from 'lodash';
import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import { packageRouteRef } from '../../routes';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../types/PackageRevision';
import { PackageRevisionResourcesMap } from '../../types/PackageRevisionResource';
import { Repository } from '../../types/Repository';
import { RepositorySummary } from '../../types/RepositorySummary';
import { RootSync } from '../../types/RootSync';
import {
  findRootSyncForPackage,
  getRootSync,
  getRootSyncSecret,
  getSyncStatus,
  SyncStatus,
  SyncStatusState,
} from '../../utils/configSync';
import { isConfigSyncEnabled } from '../../utils/featureFlags';
import {
  filterPackageRevisions,
  findLatestPublishedRevision,
  findPackageRevision,
  getNextPackageRevisionResource,
  getPackageRevision,
  getPackageRevisionTitle,
  getUpgradePackageRevisionResource,
  getUpstreamPackageRevisionDetails,
  isLatestPublishedRevision,
  sortByPackageNameAndRevisionComparison,
} from '../../utils/packageRevision';
import {
  getPackageResourcesFromResourcesMap,
  getPackageRevisionResources,
  getPackageRevisionResourcesResource,
} from '../../utils/packageRevisionResources';
import {
  getPackageSummaries,
  PackageSummary,
} from '../../utils/packageSummary';
import {
  findRepository,
  getPackageDescriptor,
  isDeploymentRepository,
} from '../../utils/repository';
import {
  getRepositorySummaries,
  getRepositorySummary,
} from '../../utils/repositorySummary';
import { toLowerCase } from '../../utils/string';
import { ConfirmationDialog } from '../Controls';
import { PackageLink, RepositoriesLink, RepositoryLink } from '../Links';
import { AdvancedPackageRevisionOptions } from './components/AdvancedPackageRevisionOptions';
import { DownstreamTabContent } from './components/DownstreamTabContent';
import {
  PackageRevisionOptions,
  RevisionOption,
} from './components/PackageRevisionOptions';
import {
  PackageRevisionsTable,
  RevisionSummary,
} from './components/PackageRevisionsTable';
import { ResourcesTabContent } from './components/ResourcesTabContent';
import { processUpdatedResourcesMap } from './updatedResourcesMap/processUpdatedResourcesMap';

export enum PackageRevisionPageMode {
  EDIT = 'edit',
  VIEW = 'view',
}

type PackageRevisionPageProps = {
  mode: PackageRevisionPageMode;
};

type TabProps = {
  label: string;
  content: JSX.Element;
};

type ConditionalTabProps = TabProps & {
  showTab?: boolean;
};

const useStyles = makeStyles({
  packageRevisionOptions: {
    display: 'inherit',
    '& > *': {
      marginTop: 'auto',
      '&:not(:first-child)': {
        marginLeft: '10px',
      },
    },
  },
  syncStatusBanner: {
    padding: '2px 16px',
  },
  syncErrorBanner: {
    whiteSpace: 'break-spaces',
    marginBottom: '16px',
  },
});

export const PackageRevisionPage = ({ mode }: PackageRevisionPageProps) => {
  const { repositoryName, packageName } = useParams();
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(configAsDataApiRef);

  const packageRef = useRouteRef(packageRouteRef);

  const allRepositories = useRef<Repository[]>([]);
  const [repositorySummary, setRepositorySummary] =
    useState<RepositorySummary>();
  const [packageRevision, setPackageRevision] = useState<PackageRevision>();
  const [upstreamPackageRevision, setUpstreamPackageRevision] =
    useState<PackageRevision>();
  const [downstreamPackageSummaries, setDownstreamPackageSummaries] = useState<
    PackageSummary[]
  >([]);

  const [revisionSummaries, setRevisionSummaries] = useState<RevisionSummary[]>(
    [],
  );
  const [resourcesMap, setResourcesMap] = useState<PackageRevisionResourcesMap>(
    {},
  );
  const [rootSync, setRootSync] = useState<RootSync | null>();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>();
  const [userInitiatedApiRequest, setUserInitiatedApiRequest] =
    useState<boolean>(false);

  const [openRestoreDialog, setOpenRestoreDialog] = useState<boolean>(false);
  const [isUpgradeAvailable, setIsUpgradeAvailable] = useState<boolean>(false);

  const latestPublishedUpstream = useRef<PackageRevision>();

  const configSyncEnabled = isConfigSyncEnabled();

  const packageRevisions = useMemo(
    () => revisionSummaries.map(revisionSummary => revisionSummary.revision),
    [revisionSummaries],
  );

  const loadRepositorySummary = async (): Promise<void> => {
    const { items: thisAllRepositories } = await api.listRepositories();
    const repositorySummaries = getRepositorySummaries(thisAllRepositories);
    const thisRepositorySummary = await getRepositorySummary(
      repositorySummaries,
      repositoryName,
    );

    allRepositories.current = thisAllRepositories;
    setRepositorySummary(thisRepositorySummary);
  };

  const loadPackageRevision = async (): Promise<void> => {
    const asyncPackageRevisions = api.listPackageRevisions();
    const asyncAllPackageResources = api.listPackageRevisionResources();

    const [thisPackageRevisions, { items: thisAllPacakgesResources }] =
      await Promise.all([asyncPackageRevisions, asyncAllPackageResources]);

    const thisResources = getPackageRevisionResources(
      thisAllPacakgesResources,
      packageName,
    );

    const thisPackageRevision = getPackageRevision(
      thisPackageRevisions,
      packageName,
    );

    const thisSortedRevisions = filterPackageRevisions(
      thisPackageRevisions,
      thisPackageRevision.spec.packageName,
      thisPackageRevision.spec.repository,
    ).sort(sortByPackageNameAndRevisionComparison);

    const thisRevisionSummaries = thisSortedRevisions.map(revision => {
      const revisionResourcesMap = getPackageRevisionResources(
        thisAllPacakgesResources,
        revision.metadata.name,
      ).spec.resources;

      const resources =
        getPackageResourcesFromResourcesMap(revisionResourcesMap);

      return { revision, resources };
    });

    setRevisionSummaries(thisRevisionSummaries);
    setPackageRevision(thisPackageRevision);
    setResourcesMap(thisResources.spec.resources);

    let upgradeAvailable = false;

    const upstream = getUpstreamPackageRevisionDetails(thisPackageRevision);

    if (upstream) {
      const upstreamRepository = findRepository(allRepositories.current, {
        repositoryUrl: upstream.repositoryUrl,
      });

      if (upstreamRepository) {
        const upstreamRepositoryName = upstreamRepository.metadata.name;

        const thisUpstreamPackage = findPackageRevision(
          thisPackageRevisions,
          upstream.packageName,
          upstream.revision,
          upstreamRepositoryName,
        );

        setUpstreamPackageRevision(thisUpstreamPackage);

        if (thisUpstreamPackage) {
          if (isLatestPublishedRevision(thisPackageRevision)) {
            const allUpstreamRevisions = filterPackageRevisions(
              thisPackageRevisions,
              upstream.packageName,
              upstreamRepositoryName,
            );
            latestPublishedUpstream.current =
              findLatestPublishedRevision(allUpstreamRevisions);

            if (
              upstream.revision !==
              latestPublishedUpstream.current?.spec.revision
            ) {
              upgradeAvailable = true;
            }
          }
        }
      }
    }

    const downstreamPackages = getPackageSummaries(
      thisPackageRevisions,
      getRepositorySummaries(allRepositories.current),
      allRepositories.current,
    ).filter(
      summary =>
        summary.upstreamPackageName === thisPackageRevision.spec.packageName &&
        summary.upstreamRepositoryName === thisPackageRevision.spec.repository,
    );

    setDownstreamPackageSummaries(downstreamPackages);

    setIsUpgradeAvailable(upgradeAvailable);
  };

  const { loading, error } = useAsync(
    async () => Promise.all([loadRepositorySummary(), loadPackageRevision()]),
    [repositoryName, packageName, mode],
  );

  const isLatestPublishedPackageRevision =
    packageRevision && isLatestPublishedRevision(packageRevision);
  const isDeploymentPackage =
    repositorySummary && isDeploymentRepository(repositorySummary.repository);

  useAsync(async () => {
    if (!loading && packageRevision && repositorySummary) {
      if (
        isLatestPublishedPackageRevision &&
        isDeploymentPackage &&
        configSyncEnabled
      ) {
        const { items: allRootSyncs } = await api.listRootSyncs();

        const thisRootSync = findRootSyncForPackage(
          allRootSyncs,
          packageRevision,
          repositorySummary.repository,
        );

        setRootSync(thisRootSync ?? null);
      } else {
        setRootSync(undefined);
      }
    }
  }, [loading, packageRevision, repositorySummary]);

  useEffect(() => {
    if (rootSync) {
      const refreshRootSync = async (): Promise<void> => {
        const latestRootSync = await api.getRootSync(rootSync.metadata.name);
        setRootSync(latestRootSync);
      };

      const refreshSeconds = rootSync.status ? 5 : 1;
      const refreshTimeout = setTimeout(
        () => refreshRootSync(),
        refreshSeconds * 1000,
      );

      return () => {
        clearTimeout(refreshTimeout);
      };
    }

    return undefined;
  }, [api, rootSync]);

  useEffect((): void => {
    if (rootSync && rootSync.status) {
      const thisSyncStatus = getSyncStatus(rootSync.status);
      setSyncStatus(thisSyncStatus);
    } else {
      setSyncStatus(undefined);
    }
  }, [rootSync]);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (!repositorySummary || !packageRevision || !revisionSummaries) {
    return <Alert severity="error">Unexpected undefined value</Alert>;
  }

  const repository = repositorySummary.repository;
  const packageDescriptor = getPackageDescriptor(repository);
  const packageRevisionTitle = getPackageRevisionTitle(packageRevision);

  const rejectProposedPackage = async (): Promise<void> => {
    const targetPackageRevision = cloneDeep(packageRevision);
    targetPackageRevision.spec.lifecycle = PackageRevisionLifecycle.DRAFT;

    await api.replacePackageRevision(targetPackageRevision);

    await loadPackageRevision();
  };

  const moveToProposed = async (): Promise<void> => {
    const targetPackageRevision = cloneDeep(packageRevision);
    targetPackageRevision.spec.lifecycle = PackageRevisionLifecycle.PROPOSED;

    await api.replacePackageRevision(targetPackageRevision);

    await loadPackageRevision();
  };

  const updateRootSyncToLatestPackage = async (
    thisPackageRevision: PackageRevision,
  ): Promise<void> => {
    const { items: allRootSyncs } = await api.listRootSyncs();

    const previousRootSync = findRootSyncForPackage(
      allRootSyncs,
      packageRevision,
      repositorySummary.repository,
      false,
    );

    if (previousRootSync) {
      const newRootSync = getRootSync(
        repository,
        thisPackageRevision,
        previousRootSync.spec.git?.secretRef?.name,
      );

      await api.deleteRootSync(previousRootSync.metadata.name);
      await api.createRootSync(newRootSync);
    }
  };

  const approveProposedPackage = async (): Promise<void> => {
    setUserInitiatedApiRequest(true);

    try {
      const targetRevision = cloneDeep(packageRevision);
      targetRevision.spec.lifecycle = PackageRevisionLifecycle.PUBLISHED;

      await api.approvePackageRevision(targetRevision);

      if (isDeploymentPackage && configSyncEnabled) {
        await updateRootSyncToLatestPackage(targetRevision);
      }

      await loadPackageRevision();
    } finally {
      setUserInitiatedApiRequest(false);
    }
  };

  const createSync = async (): Promise<void> => {
    const repoSecretName =
      repositorySummary.repository.spec.git?.secretRef?.name;

    if (repoSecretName) {
      const baseName = packageRevision.spec.packageName;
      const newSecretName = `${baseName}-sync`;

      const repoSecret = await api.getSecret(repoSecretName);

      const syncSecret = await getRootSyncSecret(newSecretName, repoSecret);
      const createdSyncSecret = await api.createSecret(syncSecret);

      const rootSyncResource = getRootSync(
        repositorySummary.repository,
        packageRevision,
        createdSyncSecret.metadata.name,
      );

      const newRootSync = await api.createRootSync(rootSyncResource);

      setRootSync(newRootSync);
    }
  };

  const createUpgradeRevision = async (): Promise<void> => {
    if (!latestPublishedUpstream.current) {
      throw new Error('The latest published upstream package is not defined');
    }

    const blueprintPackageRevisionName =
      latestPublishedUpstream.current.metadata.name;

    const requestPackageRevision = getUpgradePackageRevisionResource(
      packageRevision,
      blueprintPackageRevisionName,
    );

    const newPackageRevision = await api.createPackageRevision(
      requestPackageRevision,
    );
    const newPackageName = newPackageRevision.metadata.name;

    navigate(packageRef({ repositoryName, packageName: newPackageName }));
  };

  const createNewRevision = async (): Promise<void> => {
    const requestPackageRevision =
      getNextPackageRevisionResource(packageRevision);

    const newPackageRevision = await api.createPackageRevision(
      requestPackageRevision,
    );
    const newPackageName = newPackageRevision.metadata.name;

    navigate(packageRef({ repositoryName, packageName: newPackageName }));
  };

  const createRestoreRevision = async (): Promise<void> => {
    setUserInitiatedApiRequest(true);

    try {
      const latestPublishedRevision = findLatestPublishedRevision(
        packageRevisions,
      ) as PackageRevision;
      const latestRevision = packageRevisions[0];

      if (latestPublishedRevision !== latestRevision) {
        throw new Error(
          'Unable to create a new revision since an unpublished revision already exists for this package.',
        );
      }

      const createNextRevision = async (): Promise<string> => {
        const requestPackageRevision = getNextPackageRevisionResource(
          latestPublishedRevision,
        );

        const newPackageRevision = await api.createPackageRevision(
          requestPackageRevision,
        );

        return newPackageRevision.metadata.name;
      };

      const replaceRevisionsResources = async (
        thisPackageName: string,
      ): Promise<void> => {
        const packageRevisionResources = getPackageRevisionResourcesResource(
          thisPackageName,
          resourcesMap,
        );

        await api.replacePackageRevisionResources(packageRevisionResources);
      };

      const newPackageName = await createNextRevision();
      await replaceRevisionsResources(newPackageName);

      navigate(packageRef({ repositoryName, packageName: newPackageName }));
    } finally {
      setUserInitiatedApiRequest(false);
      setOpenRestoreDialog(false);
    }
  };

  const getPackageLifecycleDescription = (): JSX.Element | null => {
    if (packageRevision.spec.lifecycle !== PackageRevisionLifecycle.PUBLISHED) {
      return (
        <div>
          {packageRevision.spec.lifecycle} {packageDescriptor}
        </div>
      );
    }

    return null;
  };

  const getCurrentSyncStatus = (): JSX.Element | null => {
    if (syncStatus) {
      const getAlertSeverity = (thisSyncStatus: SyncStatus): Color => {
        switch (thisSyncStatus.state) {
          case SyncStatusState.ERROR:
          case SyncStatusState.STALLED:
            return 'error';
          case SyncStatusState.RECONCILING:
          case SyncStatusState.PENDING:
            return 'info';
          case SyncStatusState.SYNCED:
            return 'success';
          default:
            return 'error';
        }
      };

      const statusSeverity = getAlertSeverity(syncStatus);

      return (
        <Alert
          key="sync-status"
          severity={statusSeverity}
          className={classes.syncStatusBanner}
        >
          {syncStatus.state}
        </Alert>
      );
    }

    if (rootSync) {
      return (
        <Alert
          key="sync-status"
          severity="warning"
          className={classes.syncStatusBanner}
        >
          No Status
        </Alert>
      );
    }

    return null;
  };

  const savePackageRevision = async (): Promise<void> => {
    const packageRevisionResources = getPackageRevisionResourcesResource(
      packageName,
      resourcesMap,
    );

    await api.replacePackageRevisionResources(packageRevisionResources);

    navigate(packageRef({ repositoryName, packageName }));
  };

  const handleUpdatedResourcesMap = async (
    latestResources: PackageRevisionResourcesMap,
  ): Promise<void> => {
    const updatedResources = await processUpdatedResourcesMap(
      api,
      resourcesMap,
      latestResources,
    );

    setResourcesMap(updatedResources);
  };

  const executeUserInitiatedApiRequest = async (
    apiRequest: () => Promise<void>,
  ): Promise<void> => {
    setUserInitiatedApiRequest(true);

    try {
      await apiRequest();
    } finally {
      setUserInitiatedApiRequest(false);
    }
  };

  const onRevisionOptionClick = async (
    option: RevisionOption,
  ): Promise<void> => {
    switch (option) {
      case RevisionOption.CREATE_NEW_REVISION:
        await executeUserInitiatedApiRequest(createNewRevision);
        break;

      case RevisionOption.SAVE_REVISION:
        await executeUserInitiatedApiRequest(savePackageRevision);
        break;

      case RevisionOption.PROPOSE_REVISION:
        await executeUserInitiatedApiRequest(moveToProposed);
        break;

      case RevisionOption.REJECT_PROPOSED_REVISION:
        await executeUserInitiatedApiRequest(rejectProposedPackage);
        break;

      case RevisionOption.APPROVE_PROPOSED_REVISION:
        await executeUserInitiatedApiRequest(approveProposedPackage);
        break;

      case RevisionOption.CREATE_UPGRADE_REVISION:
        await executeUserInitiatedApiRequest(createUpgradeRevision);
        break;

      case RevisionOption.RESTORE_REVISION:
        setOpenRestoreDialog(true);
        break;

      case RevisionOption.CREATE_SYNC:
        await executeUserInitiatedApiRequest(createSync);
        break;

      default:
        throw new Error(`Unexpected option, '${option}'`);
    }
  };

  const isViewMode = mode === PackageRevisionPageMode.VIEW;

  const getUpgradeAlertText = (): string => {
    const latestRevision = packageRevisions[0];

    const blueprintName = `${latestPublishedUpstream.current?.spec.packageName} blueprint`;
    const baseUpgradeText = `The ${blueprintName} has been upgraded.`;

    const latestRevisionUpstream =
      getUpstreamPackageRevisionDetails(latestRevision);

    if (latestRevision !== packageRevision) {
      const isLatestRevisionUpgraded =
        latestRevisionUpstream?.revision ===
        latestPublishedUpstream.current?.spec.revision;

      const pendingRevisionName = `${latestRevision.spec.packageName} ${
        latestRevision.spec.revision
      } ${toLowerCase(latestRevision.spec.lifecycle)} revision`;

      if (isLatestRevisionUpgraded) {
        return `${baseUpgradeText} The ${pendingRevisionName} includes changes from the upgraded ${blueprintName}.`;
      }

      return `${baseUpgradeText} The ${pendingRevisionName} does not include changes from the upgraded ${blueprintName}. The revision must be either published or deleted first before changes from the upgraded ${blueprintName} can be pulled in.`;
    }

    return `${baseUpgradeText} Use the 'Upgrade to Latest Blueprint' button to create a revision that pulls in changes from the upgraded blueprint.`;
  };

  const alertMessages = isUpgradeAvailable ? [getUpgradeAlertText()] : [];

  const getDisplayTabs = (tabs: ConditionalTabProps[]): TabProps[] => {
    return tabs.filter(tab => tab.showTab !== false);
  };

  return (
    <div>
      <Breadcrumbs>
        <RepositoriesLink breadcrumb />
        <RepositoryLink repository={repository} breadcrumb />
        {isViewMode && <Typography>{packageRevisionTitle}</Typography>}
        {!isViewMode && (
          <PackageLink packageRevision={packageRevision} breadcrumb />
        )}
        {!isViewMode && <Typography>Edit</Typography>}
      </Breadcrumbs>

      <ContentHeader title={packageRevisionTitle}>
        <div className={classes.packageRevisionOptions}>
          {getPackageLifecycleDescription()}

          {getCurrentSyncStatus()}

          <PackageRevisionOptions
            repositorySummary={repositorySummary}
            mode={mode}
            packageRevision={packageRevision}
            packageRevisions={packageRevisions}
            isUpgradeAvailable={isUpgradeAvailable}
            rootSync={rootSync}
            onClick={onRevisionOptionClick}
            disabled={userInitiatedApiRequest}
          />
        </div>
      </ContentHeader>

      <Fragment>
        {syncStatus?.errors?.map((syncError: string) => (
          <Alert severity="error" className={classes.syncErrorBanner}>
            {syncError}
          </Alert>
        ))}
      </Fragment>

      <ConfirmationDialog
        open={openRestoreDialog}
        onClose={() => setOpenRestoreDialog(false)}
        title="Restore Revision"
        contentText={`Create new revision to restore ${packageRevision.spec.packageName} to revision ${packageRevision.spec.revision}?`}
        actionText="Create Revision"
        onAction={() => executeUserInitiatedApiRequest(createRestoreRevision)}
      />

      <Tabs
        tabs={getDisplayTabs([
          {
            label: 'Resources',
            content: (
              <ResourcesTabContent
                packageName={packageName}
                resourcesMap={resourcesMap}
                packageRevisions={packageRevisions}
                onUpdatedResourcesMap={handleUpdatedResourcesMap}
                mode={mode}
                upstreamPackageRevision={upstreamPackageRevision}
                alertMessages={alertMessages}
              />
            ),
          },
          {
            label: 'Revisions',
            content: (
              <PackageRevisionsTable
                repository={repositorySummary.repository}
                revisions={revisionSummaries ?? []}
              />
            ),
          },
          {
            label: 'Downstream',
            content: (
              <DownstreamTabContent
                packageDescriptor={packageDescriptor}
                downstreamPackages={downstreamPackageSummaries}
              />
            ),
            showTab:
              !isDeploymentPackage || downstreamPackageSummaries.length > 0,
          },
          {
            label: 'Advanced',
            content: (
              <AdvancedPackageRevisionOptions
                repository={repository}
                packageName={packageName}
                rootSync={rootSync}
              />
            ),
          },
        ])}
      />
    </div>
  );
};
