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
import { errorApiRef, useApi } from '@backstage/core-plugin-api';
import { Button, Divider, Menu, MenuItem } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import { startCase } from 'lodash';
import React, { Fragment, useRef, useState } from 'react';
import {
  KubernetesKeyValueObject,
  KubernetesResource,
} from '../../../types/KubernetesResource';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import {
  addResourceToResourcesMap,
  diffPackageResources,
  getPackageResourcesFromResourcesMap,
  PackageResource,
  removeResourceFromResourcesMap,
  ResourceDiffStatus,
  updateResourceInResourcesMap,
} from '../../../utils/packageRevisionResources';
import { dumpYaml } from '../../../utils/yaml';
import { IconButton } from '../../Controls';
import { ResourceEditorDialog } from '../../ResourceEditorDialog';
import { ResourceViewerDialog } from '../../ResourceViewerDialog';

export enum ResourcesTableMode {
  VIEW = 'view',
  EDIT = 'edit',
}

enum Dialog {
  VIEWER = 'viewer',
  DIFF_VIEWER = 'diff-viewer',
  EDITOR = 'editor',
  NONE = 'none',
}

type PackageRevisionResourcesTableProps = {
  resourcesMap: PackageRevisionResourcesMap;
  baseResourcesMap?: PackageRevisionResourcesMap;
  mode: ResourcesTableMode;
  onUpdatedResourcesMap?: (resourcesMap: PackageRevisionResourcesMap) => void;
};

type ResourceRow = PackageResource & {
  diffSummary: string;
  isDeleted: boolean;
  originalResource?: PackageResource;
  currentResource?: PackageResource;
};

type KubernetesGKV = {
  apiVersion: string;
  kind: string;
  namespaceScoped?: boolean;
  k8LocalConfig?: boolean;
  defaultName?: string;
};

type DialogResource = {
  yaml: string;
  filename?: string;
  resourceIndex?: number;
};

export const PackageRevisionResourcesTable = ({
  resourcesMap,
  baseResourcesMap,
  mode,
  onUpdatedResourcesMap,
}: PackageRevisionResourcesTableProps) => {
  const [openDialog, setOpenDialog] = useState<Dialog>(Dialog.NONE);
  const selectedDialogResource = useRef<DialogResource>();
  const selectedDialogOriginalResource = useRef<DialogResource>();

  const [addResourceAnchorEl, setAddResourceAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const addResourceMenuOpen = Boolean(addResourceAnchorEl);

  const addResourcesGVKs: KubernetesGKV[] = [
    {
      apiVersion: 'fn.kpt.dev/v1alpha1',
      kind: 'ApplyReplacements',
      k8LocalConfig: true,
    },
    {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      namespaceScoped: true,
    },
    {
      apiVersion: 'v1',
      kind: 'Namespace',
      defaultName: 'example',
    },
    {
      apiVersion: 'v1',
      kind: 'ResourceQuota',
      namespaceScoped: true,
    },
    {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      namespaceScoped: true,
    },
    {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'Role',
      namespaceScoped: true,
    },
    {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'RoleBinding',
      namespaceScoped: true,
    },
  ].sort((gvk1, gvk2) => (gvk1.kind > gvk2.kind ? 1 : -1));

  const errorApi = useApi(errorApiRef);
  const isEditMode = mode === ResourcesTableMode.EDIT;

  const openResourceDialog = (
    dialog: Dialog,
    resource?: DialogResource,
    originalResource?: DialogResource,
  ): void => {
    selectedDialogResource.current = resource;
    selectedDialogOriginalResource.current = originalResource;

    setOpenDialog(dialog);
  };

  const closeDialog = (): void => {
    setOpenDialog(Dialog.NONE);
  };

  const deleteResource = (resource: ResourceRow): void => {
    if (!onUpdatedResourcesMap) {
      throw new Error('onUpdatedResourcesMap is not defined');
    }

    const latestResourcesMap = removeResourceFromResourcesMap(
      resourcesMap,
      resource,
    );

    onUpdatedResourcesMap(latestResourcesMap);
  };

  const renderRowOptions = (resourceRow: ResourceRow): JSX.Element[] => {
    const options: JSX.Element[] = [];

    if (isEditMode && !resourceRow.isDeleted) {
      if (resourceRow.filename !== 'Kptfile') {
        options.push(
          <IconButton
            key="delete"
            title="Delete"
            inTable
            stopPropagation
            onClick={() => deleteResource(resourceRow)}
          >
            <DeleteIcon />
          </IconButton>,
        );
      }
    }

    return options;
  };

  const renderDiffColumn = (row: ResourceRow): JSX.Element | null => {
    if (row.diffSummary) {
      return (
        <Button
          variant="outlined"
          style={{
            position: 'absolute',
            transform: 'translateY(-50%)',
          }}
          onClick={e => {
            e.stopPropagation();
            openResourceDialog(
              Dialog.DIFF_VIEWER,
              row.currentResource,
              row.originalResource,
            );
          }}
        >
          {row.diffSummary}
        </Button>
      );
    }

    return null;
  };

  const columns: TableColumn<ResourceRow>[] = [
    { title: 'Component', field: 'component' },
    { title: 'Kind', field: 'kind' },
    { title: 'Name', field: 'name' },
    { title: 'Namespace', field: 'namespace' },
    {},
    { render: resourceRow => <div>{renderRowOptions(resourceRow)}</div> },
  ];

  if (baseResourcesMap) {
    columns[4] = { title: 'Diff', render: renderDiffColumn };
  }

  const packageResources = getPackageResourcesFromResourcesMap(
    resourcesMap,
  ) as ResourceRow[];

  const allResources: ResourceRow[] = packageResources.map(r => ({
    ...r,
    currentResource: r,
  }));

  allResources.sort((resource1, resource2) => {
    const resourceScore = (resource: ResourceRow): number => {
      if (resource.kind === 'Kptfile') return 1000;
      if (resource.kind === 'Namespace') return 100;

      return 0;
    };

    const resourceComponent = (resource: ResourceRow): string => {
      if (resource.component === 'base') return '';

      return resource.component;
    };

    const resourceQualifiedName = (resource: ResourceRow): string =>
      (resource.namespace || ' ') + resource.kind + resource.name;

    if (resourceComponent(resource1) !== resourceComponent(resource2)) {
      return resourceComponent(resource1) > resourceComponent(resource2)
        ? 1
        : -1;
    }

    if (resourceScore(resource1) === resourceScore(resource2)) {
      return resourceQualifiedName(resource1) > resourceQualifiedName(resource2)
        ? 1
        : -1;
    }

    return resourceScore(resource1) < resourceScore(resource2) ? 1 : -1;
  });

  if (baseResourcesMap) {
    const baseResources = (
      baseResourcesMap
        ? getPackageResourcesFromResourcesMap(baseResourcesMap)
        : []
    ) as ResourceRow[];

    const resourcesDiff = diffPackageResources(baseResources, allResources);

    for (const resourceDiff of resourcesDiff) {
      if (resourceDiff.diffStatus === ResourceDiffStatus.REMOVED) {
        allResources.push({
          ...resourceDiff.originalResource,
          diffSummary: 'Removed',
          isDeleted: true,
          yaml: '',
          originalResource: resourceDiff.originalResource,
        });
      }

      const diffResource =
        resourceDiff.currentResource ?? resourceDiff.originalResource;
      const thisResource = allResources.find(
        resource => resource.id === diffResource.id,
      );

      if (!thisResource) {
        throw new Error(
          'Resource exists within diff, however the resource is not found in allResources',
        );
      }

      thisResource.originalResource = resourceDiff.originalResource;

      switch (resourceDiff.diffStatus) {
        case ResourceDiffStatus.ADDED:
          thisResource.diffSummary = 'Added';
          break;

        case ResourceDiffStatus.REMOVED:
          thisResource.diffSummary = 'Removed';
          break;

        case ResourceDiffStatus.UPDATED:
          thisResource.diffSummary = `Diff (+${resourceDiff.linesAdded}, -${resourceDiff.linesRemoved})`;
          break;
        case ResourceDiffStatus.UNCHANGED:
          break;

        default:
          throw new Error('Unknown diff status');
      }
    }
  }

  const saveUpdatedYaml = (yaml: string): void => {
    if (!onUpdatedResourcesMap) {
      throw new Error('onUpdatedResourcesMap is not defined');
    }

    if (!selectedDialogResource.current) {
      throw new Error('selectedDialogResource is not defined');
    }

    const isExistingResource: boolean =
      !!selectedDialogResource.current.filename;

    if (isExistingResource) {
      const originalResource = selectedDialogResource.current as ResourceRow;

      const latestResourcesMap = updateResourceInResourcesMap(
        resourcesMap,
        originalResource,
        yaml,
      );

      onUpdatedResourcesMap(latestResourcesMap);
    } else {
      const latestResourcesMap = addResourceToResourcesMap(resourcesMap, yaml);

      onUpdatedResourcesMap(latestResourcesMap);
    }
  };

  const generateNewResource = (
    resourceGVK: KubernetesGKV,
  ): KubernetesResource => {
    const { apiVersion, kind, namespaceScoped, k8LocalConfig, defaultName } =
      resourceGVK;

    const getNamespace = (): string | undefined =>
      allResources.find(r => r.kind === 'Namespace')?.name;

    const name = defaultName || 'default';
    const namespace = namespaceScoped ? getNamespace() : undefined;
    let annotations: KubernetesKeyValueObject | undefined;

    if (k8LocalConfig) {
      annotations = annotations ?? {};
      annotations['config.kubernetes.io/local-config'] = 'true';
    }

    const newResource: KubernetesResource = {
      apiVersion,
      kind,
      metadata: {
        name,
        namespace,
        annotations,
      },
    };

    return newResource;
  };

  const onAddResourceMenuOpenClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    setAddResourceAnchorEl(event.currentTarget);
  };

  const onAddResourceMenuClose = (): void => {
    setAddResourceAnchorEl(null);
  };

  const addResource = (resourceGVK?: KubernetesGKV): void => {
    const resourceJson = resourceGVK
      ? generateNewResource(resourceGVK)
      : generateNewResource({ apiVersion: '', kind: '' });

    const yaml = dumpYaml(resourceJson);

    const thisSelectedResource = { yaml };

    openResourceDialog(Dialog.EDITOR, thisSelectedResource);
  };

  const onAddResourceMenuItemClick = (gvk?: KubernetesGKV): void => {
    onAddResourceMenuClose();
    addResource(gvk);
  };

  const renderAddResourceButtonGroup = (): JSX.Element => {
    if (isEditMode) {
      return (
        <div style={{ marginTop: '16px' }}>
          <Button
            id="basic-button"
            onClick={onAddResourceMenuOpenClick}
            startIcon={<AddIcon />}
            variant="outlined"
          >
            Add Resource
          </Button>
          <Menu
            id="basic-menu"
            anchorEl={addResourceAnchorEl}
            open={addResourceMenuOpen}
            onClose={onAddResourceMenuClose}
          >
            {addResourcesGVKs.map(gvk => (
              <MenuItem
                key={gvk.kind}
                onClick={() => onAddResourceMenuItemClick(gvk)}
              >
                Add {startCase(gvk.kind)}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem onClick={() => onAddResourceMenuItemClick(undefined)}>
              Add Blank Resource
            </MenuItem>
          </Menu>
        </div>
      );
    }
    return <div />;
  };

  return (
    <Fragment>
      <ResourceEditorDialog
        open={openDialog === Dialog.EDITOR}
        onClose={closeDialog}
        yaml={selectedDialogResource.current?.yaml ?? ''}
        onSaveYaml={saveUpdatedYaml}
        packageResources={packageResources}
      />

      <ResourceViewerDialog
        open={openDialog === Dialog.VIEWER}
        onClose={closeDialog}
        yaml={selectedDialogResource.current?.yaml}
        originalYaml={selectedDialogOriginalResource.current?.yaml}
      />

      <ResourceViewerDialog
        open={openDialog === Dialog.DIFF_VIEWER}
        onClose={closeDialog}
        yaml={selectedDialogResource.current?.yaml}
        originalYaml={selectedDialogOriginalResource.current?.yaml}
        showDiff
      />

      <Table<ResourceRow>
        title="Resources"
        options={{ search: false, paging: false }}
        columns={columns}
        data={allResources}
        onRowClick={(_, row) => {
          if (row) {
            if (isEditMode && row.isDeleted) {
              errorApi.post(new Error('Deleted resources cannot be updated.'));
              return;
            }

            const dialog = isEditMode ? Dialog.EDITOR : Dialog.VIEWER;
            openResourceDialog(
              dialog,
              row.currentResource,
              row.originalResource,
            );
          }
        }}
      />

      {renderAddResourceButtonGroup()}
    </Fragment>
  );
};
