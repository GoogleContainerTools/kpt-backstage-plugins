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
import SettingsIcon from '@material-ui/icons/Settings';
import { cloneDeep, startCase } from 'lodash';
import React, { Fragment, useRef, useState } from 'react';
import {
  KubernetesKeyValueObject,
  KubernetesResource,
} from '../../../types/KubernetesResource';
import { PackageResource } from '../../../utils/packageRevisionResources';
import { dumpYaml } from '../../../utils/yaml';
import { IconButton } from '../../Controls';
import { ResourceEditorDialog } from '../../ResourceEditorDialog';
import { ResourceViewerDialog } from '../../ResourceViewerDialog';
import { ResourceRow } from './PackageResourcesList';

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
  title: string;
  allResources: ResourceRow[];
  component: string;
  mode: ResourcesTableMode;
  showDiff: boolean;
  onUpdatedResource: (
    originalResource?: PackageResource,
    resource?: PackageResource,
  ) => void;
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
  title,
  allResources,
  component,
  mode,
  showDiff,
  onUpdatedResource,
}: PackageRevisionResourcesTableProps) => {
  const [openDialog, setOpenDialog] = useState<Dialog>(Dialog.NONE);
  const selectedDialogResource = useRef<DialogResource>();
  const selectedDialogOriginalResource = useRef<DialogResource>();

  const [addResourceAnchorEl, setAddResourceAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const addResourceMenuOpen = Boolean(addResourceAnchorEl);

  const resources = allResources.filter(
    resource => resource.component === component,
  );

  const addResourcesGVKs: KubernetesGKV[] = [
    {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      namespaceScoped: true,
    },
    {
      apiVersion: 'apps/v1',
      kind: 'StatefulSet',
      namespaceScoped: true,
    },
    {
      apiVersion: 'fn.kpt.dev/v1alpha1',
      kind: 'ApplyReplacements',
      k8LocalConfig: true,
    },
    {
      apiVersion: 'fn.kpt.dev/v1alpha1',
      kind: 'SetLabels',
      k8LocalConfig: true,
    },
    {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      namespaceScoped: true,
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
      kind: 'Service',
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
    if (resource.currentResource) {
      onUpdatedResource(resource.currentResource, undefined);
    }
  };

  const renderLocalConfigColumn = (
    resourceRow: ResourceRow,
  ): JSX.Element | null => {
    if (resourceRow.isLocalConfigResource) {
      return (
        <Fragment>
          <IconButton title="Local config" inTable>
            <SettingsIcon />
          </IconButton>
        </Fragment>
      );
    }

    return null;
  };

  const renderOptionsColumn = (resourceRow: ResourceRow): JSX.Element[] => {
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
    { render: renderLocalConfigColumn, width: 'min-content' },
    { title: 'Kind', field: 'kind' },
    { title: 'Name', field: 'name' },
    { title: 'Namespace', field: 'namespace' },
    { title: 'Diff', render: renderDiffColumn },
    { render: resourceRow => <div>{renderOptionsColumn(resourceRow)}</div> },
  ];

  if (!showDiff) {
    const diffColumn = columns.find(column => column.title === 'Diff');

    if (!diffColumn) {
      throw new Error('Diff column not found');
    }

    columns[columns.indexOf(diffColumn)] = {};
  }

  const saveUpdatedYaml = (yaml: string): void => {
    if (!selectedDialogResource.current) {
      throw new Error('selectedDialogResource is not defined');
    }

    const isExistingResource: boolean =
      !!selectedDialogResource.current.filename;

    if (isExistingResource) {
      const originalResource =
        selectedDialogResource.current as any as PackageResource;
      const updatedResource = cloneDeep(originalResource);
      updatedResource.yaml = yaml;

      onUpdatedResource(originalResource, updatedResource);
    } else {
      const newResource = { component, yaml } as any as PackageResource;
      onUpdatedResource(undefined, newResource);
    }
  };

  const generateNewResource = (
    resourceGVK: KubernetesGKV,
  ): KubernetesResource => {
    const { apiVersion, kind, namespaceScoped, k8LocalConfig, defaultName } =
      resourceGVK;

    const getNamespace = (): string | undefined =>
      resources.find(r => r.kind === 'Namespace')?.name ||
      resources.find(r => r.namespace)?.namespace;

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

    const thisSelectedResource = { component, yaml };

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

  const packageResources = resources
    .map(resource => resource.currentResource)
    .filter(resource => !!resource) as PackageResource[];

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
        title={title}
        options={{ search: false, paging: false }}
        columns={columns}
        data={resources}
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
