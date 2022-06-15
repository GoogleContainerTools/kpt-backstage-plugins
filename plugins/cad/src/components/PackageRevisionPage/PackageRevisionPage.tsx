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
  SelectItem,
  Tabs,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import {
  Button as MaterialButton,
  makeStyles,
  Typography,
} from '@material-ui/core';
import Alert, { Color } from '@material-ui/lab/Alert';
import { cloneDeep } from 'lodash';
import React, { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import {
  deployPackageRouteRef,
  editPackageRouteRef,
  packageRouteRef,
} from '../../routes';
import { Kptfile } from '../../types/Kptfile';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../types/PackageRevision';
import { PackageRevisionResourcesMap } from '../../types/PackageRevisionResource';
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
import {
  canCloneOrDeploy,
  filterPackageRevisions,
  findLatestPublishedRevision,
  getEditTask,
  getNextRevision,
  getPackageRevision,
  getPackageRevisionTitle,
  isLatestPublishedRevision,
  sortByPackageNameAndRevisionComparison,
} from '../../utils/packageRevision';
import {
  getPackageResourcesFromResourcesMap,
  getPackageRevisionResources,
  getPackageRevisionResourcesResource,
} from '../../utils/packageRevisionResources';
import {
  getPackageDescriptor,
  isDeploymentRepository,
} from '../../utils/repository';
import { getRepositorySummary } from '../../utils/repositorySummary';
import { loadYaml } from '../../utils/yaml';
import { ConfirmationDialog, Select } from '../Controls';
import { PackageLink, RepositoriesLink, RepositoryLink } from '../Links';
import { AdvancedPackageRevisionOptions } from './components/AdvancedPackageRevisionOptions';
import {
  PackageRevisionResourcesTable,
  ResourcesTableMode,
} from './components/PackageRevisionResourcesTable';
import {
  PackageRevisionsTable,
  RevisionSummary,
} from './components/PackageRevisionsTable';

export enum PackageRevisionPageMode {
  EDIT = 'edit',
  VIEW = 'view',
}

type PackageRevisionPageProps = {
  mode: PackageRevisionPageMode;
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
  const deployPackageRef = useRouteRef(deployPackageRouteRef);
  const editPackageRef = useRouteRef(editPackageRouteRef);

  const [repositorySummary, setRepositorySummary] =
    useState<RepositorySummary>();
  const [packageRevision, setPackageRevision] = useState<PackageRevision>();
  const [revisionSummaries, setRevisionSummaries] =
    useState<RevisionSummary[]>();
  const [resourcesMap, setResourcesMap] = useState<PackageRevisionResourcesMap>(
    {},
  );
  const [rootSync, setRootSync] = useState<RootSync | null>();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>();
  const [userInitiatedApiRequest, setUserInitiatedApiRequest] =
    useState<boolean>(false);

  const [baseResourcesMap, setBaseResourcesMap] =
    useState<PackageRevisionResourcesMap>();
  const [selectDiffItems, setSelectDiffItems] = useState<SelectItem[]>([]);
  const [diffSelection, setDiffSelection] = useState<string>('none');

  const [openRestoreDialog, setOpenRestoreDialog] = useState<boolean>(false);

  const loadRepositorySummary = async (): Promise<void> => {
    const thisRepositorySummary = await getRepositorySummary(
      api,
      repositoryName,
    );
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

    const diffItems: SelectItem[] = [
      { label: 'Hide comparison', value: 'none' },
    ];

    if (
      thisSortedRevisions.indexOf(thisPackageRevision) !==
      thisSortedRevisions.length - 1
    ) {
      const basePackageRevision =
        thisSortedRevisions[
          thisSortedRevisions.indexOf(thisPackageRevision) + 1
        ];

      if (basePackageRevision) {
        diffItems.push({
          label: `Previous Revision (${basePackageRevision.spec.revision})`,
          value: basePackageRevision.metadata.name,
        });
      }
    }

    const kptfileResource = getPackageResourcesFromResourcesMap(
      thisResources.spec.resources,
    ).find(r => r.kind === 'Kptfile');

    if (kptfileResource) {
      const kptfile = loadYaml(kptfileResource.yaml) as Kptfile;

      if (kptfile.upstream?.git?.ref) {
        const [upstreamPackageName, upstreamPackageRevision] =
          kptfile.upstream.git.ref.split('/');

        const upstreamPackage = thisPackageRevisions.find(
          r =>
            r.spec.packageName === upstreamPackageName &&
            r.spec.revision === upstreamPackageRevision,
        );

        if (upstreamPackage) {
          diffItems.push({
            label: `Upstream (${getPackageRevisionTitle(upstreamPackage)})`,
            value: upstreamPackage.metadata.name,
          });
        }
      }
    }

    setSelectDiffItems(diffItems);
  };

  const { loading, error } = useAsync(
    async () => Promise.all([loadRepositorySummary(), loadPackageRevision()]),
    [repositoryName, packageName, mode],
  );

  useEffect(() => setDiffSelection('none'), [repositoryName, packageName]);

  useEffect(() => {
    if (!diffSelection || diffSelection === 'none') {
      setBaseResourcesMap(undefined);
    } else {
      const setUpstream = async (): Promise<void> => {
        const upstreamResources = await api.getPackageRevisionResources(
          diffSelection,
        );
        setBaseResourcesMap(upstreamResources.spec.resources);
      };

      setUpstream();
    }
  }, [api, diffSelection]);

  const isLatestPublishedPackageRevision =
    packageRevision && isLatestPublishedRevision(packageRevision);
  const isDeploymentPackage =
    repositorySummary && isDeploymentRepository(repositorySummary.repository);

  useAsync(async () => {
    if (!loading && packageRevision && repositorySummary) {
      if (isLatestPublishedPackageRevision && isDeploymentPackage) {
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
  const packageRevisions = revisionSummaries.map(
    revisionSummary => revisionSummary.revision,
  );

  const rejectProposedPackage = async (): Promise<void> => {
    setUserInitiatedApiRequest(true);

    try {
      const targetPackageRevision = cloneDeep(packageRevision);
      targetPackageRevision.spec.lifecycle = PackageRevisionLifecycle.DRAFT;

      await api.replacePackageRevision(targetPackageRevision);

      await loadPackageRevision();
    } finally {
      setUserInitiatedApiRequest(false);
    }
  };

  const moveToProposed = async (): Promise<void> => {
    setUserInitiatedApiRequest(true);

    try {
      const targetPackageRevision = cloneDeep(packageRevision);
      targetPackageRevision.spec.lifecycle = PackageRevisionLifecycle.PROPOSED;

      await api.replacePackageRevision(targetPackageRevision);

      await loadPackageRevision();
    } finally {
      setUserInitiatedApiRequest(false);
    }
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

      if (isDeploymentPackage) {
        await updateRootSyncToLatestPackage(targetRevision);
      }

      await loadPackageRevision();
    } finally {
      setUserInitiatedApiRequest(false);
    }
  };

  const createSync = async (): Promise<void> => {
    setUserInitiatedApiRequest(true);

    try {
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
    } finally {
      setUserInitiatedApiRequest(false);
    }
  };

  const createNewRevision = async (): Promise<void> => {
    setUserInitiatedApiRequest(true);

    try {
      const requestPackageRevision = cloneDeep(packageRevision);
      requestPackageRevision.spec.revision = getNextRevision(
        packageRevision.spec.revision,
      );
      requestPackageRevision.spec.tasks = [
        getEditTask(packageRevision.metadata.name),
      ];
      requestPackageRevision.spec.lifecycle = PackageRevisionLifecycle.DRAFT;

      const newPackageRevision = await api.createPackageRevision(
        requestPackageRevision,
      );
      const newPackageName = newPackageRevision.metadata.name;

      navigate(packageRef({ repositoryName, packageName: newPackageName }));
    } finally {
      setUserInitiatedApiRequest(false);
    }
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
        const requestPackageRevision = cloneDeep(latestPublishedRevision);

        requestPackageRevision.spec.revision = getNextRevision(
          latestPublishedRevision.spec.revision,
        );
        requestPackageRevision.spec.tasks = [
          getEditTask(latestPublishedRevision.metadata.name),
        ];
        requestPackageRevision.spec.lifecycle = PackageRevisionLifecycle.DRAFT;

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

  const getCurrentSyncStatus = (): JSX.Element => {
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

    return <Fragment key="sync-status" />;
  };

  const savePackageRevision = async (): Promise<void> => {
    setUserInitiatedApiRequest(true);

    try {
      const packageRevisionResources = getPackageRevisionResourcesResource(
        packageName,
        resourcesMap,
      );

      await api.replacePackageRevisionResources(packageRevisionResources);

      navigate(packageRef({ repositoryName, packageName }));
    } finally {
      setUserInitiatedApiRequest(false);
    }
  };

  const renderOptions = (): JSX.Element[] => {
    const options: JSX.Element[] = [];

    if (mode === PackageRevisionPageMode.EDIT) {
      options.push(
        <Button
          key="edit-package"
          to={packageRef({ repositoryName, packageName })}
          variant="outlined"
          disabled={userInitiatedApiRequest}
        >
          Cancel
        </Button>,
      );

      options.push(
        <MaterialButton
          key="save-package"
          onClick={savePackageRevision}
          variant="contained"
          color="primary"
          disabled={userInitiatedApiRequest}
        >
          Save
        </MaterialButton>,
      );
    }

    if (mode === PackageRevisionPageMode.VIEW) {
      const isDraft =
        packageRevision.spec.lifecycle === PackageRevisionLifecycle.DRAFT;
      const isProposed =
        packageRevision.spec.lifecycle === PackageRevisionLifecycle.PROPOSED;
      const isPublished =
        packageRevision.spec.lifecycle === PackageRevisionLifecycle.PUBLISHED;

      if (isDraft || isProposed) {
        options.push(
          <div key="package-lifecycle">
            {packageRevision.spec.lifecycle} {packageDescriptor}
          </div>,
        );
      }

      if (isDraft) {
        options.push(
          <Button
            key="edit-package"
            to={editPackageRef({ repositoryName, packageName })}
            color="primary"
            variant="outlined"
            disabled={userInitiatedApiRequest}
          >
            Edit
          </Button>,
        );

        options.push(
          <MaterialButton
            key="propose-package"
            color="primary"
            variant="contained"
            onClick={moveToProposed}
            disabled={userInitiatedApiRequest}
          >
            Propose
          </MaterialButton>,
        );
      }

      if (isProposed) {
        options.push(
          <MaterialButton
            key="reject-proposed-package"
            color="primary"
            variant="outlined"
            onClick={rejectProposedPackage}
            disabled={userInitiatedApiRequest}
          >
            Reject
          </MaterialButton>,
        );

        options.push(
          <MaterialButton
            key="approve-proposed-package"
            color="primary"
            variant="contained"
            onClick={approveProposedPackage}
            disabled={userInitiatedApiRequest}
          >
            Approve
          </MaterialButton>,
        );
      }

      if (isPublished) {
        if (!packageRevisions || packageRevisions.length === 0) {
          throw new Error('No package revisions');
        }

        const latestRevision = packageRevisions[0];
        const latestPublishedRevision =
          findLatestPublishedRevision(packageRevisions);

        if (isLatestPublishedPackageRevision) {
          if (latestRevision === latestPublishedRevision) {
            options.push(
              <MaterialButton
                key="create-new-revision"
                variant="outlined"
                color="primary"
                onClick={createNewRevision}
                disabled={userInitiatedApiRequest}
              >
                Create New Revision
              </MaterialButton>,
            );
          } else {
            options.push(
              <Button
                key="view-latest-revision"
                to={packageRef({
                  repositoryName,
                  packageName: latestRevision.metadata.name,
                })}
                color="primary"
                variant="outlined"
              >
                View {latestRevision.spec.lifecycle} Revision
              </Button>,
            );
          }
        } else if (latestPublishedRevision) {
          options.push(
            <MaterialButton
              key="restore-revision"
              onClick={() => setOpenRestoreDialog(true)}
              color="primary"
              variant="outlined"
            >
              Restore Revision
            </MaterialButton>,
          );

          options.push(
            <Button
              key="view-latest-published-revision"
              to={packageRef({
                repositoryName,
                packageName: latestPublishedRevision.metadata.name,
              })}
              color="primary"
              variant="outlined"
            >
              View Latest Published Revision
            </Button>,
          );
        }

        if (
          isDeploymentPackage &&
          isLatestPublishedPackageRevision &&
          rootSync !== undefined
        ) {
          if (rootSync) {
            options.push(getCurrentSyncStatus());
          } else {
            options.push(
              <MaterialButton
                key="create-sync"
                color="primary"
                variant="contained"
                onClick={createSync}
                disabled={userInitiatedApiRequest}
              >
                Create Sync
              </MaterialButton>,
            );
          }
        }
      }

      if (
        repositorySummary.downstreamRepositories.length > 0 &&
        canCloneOrDeploy(packageRevision)
      ) {
        options.push(
          <Button
            key="deploy-package"
            to={deployPackageRef({ repositoryName, packageName })}
            color="primary"
            variant="contained"
            disabled={userInitiatedApiRequest}
          >
            Deploy
          </Button>,
        );
      }
    }

    return options;
  };

  const resourcesTableMode =
    mode === PackageRevisionPageMode.EDIT
      ? ResourcesTableMode.EDIT
      : ResourcesTableMode.VIEW;

  const handleUpdatedResourcesMap = (
    latestResources: PackageRevisionResourcesMap,
  ): void => {
    setResourcesMap(latestResources);
  };

  const isViewMode = mode === PackageRevisionPageMode.VIEW;

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
        <div className={classes.packageRevisionOptions}>{renderOptions()}</div>
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
        onAction={createRestoreRevision}
      />

      <Tabs
        tabs={[
          {
            label: 'Resources',
            content: (
              <Fragment>
                <PackageRevisionResourcesTable
                  resourcesMap={resourcesMap}
                  baseResourcesMap={baseResourcesMap}
                  mode={resourcesTableMode}
                  onUpdatedResourcesMap={handleUpdatedResourcesMap}
                />
                <br />
                <Select
                  label="Compare Revision"
                  onChange={value => setDiffSelection(value)}
                  selected={diffSelection}
                  items={selectDiffItems}
                  helperText="Compare revision to a previous revision or upstream blueprint."
                />
              </Fragment>
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
            label: 'Advanced',
            content: (
              <AdvancedPackageRevisionOptions
                repository={repository}
                packageName={packageName}
                rootSync={rootSync}
              />
            ),
          },
        ]}
      />
    </div>
  );
};
