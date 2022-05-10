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
import { Button, Divider, IconButton, Menu, MenuItem } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import { dump, load } from 'js-yaml';
import { kebabCase, startCase } from 'lodash';
import React, { Fragment, useState } from 'react';
import {
  KubernetesKeyValueObject,
  KubernetesResource,
} from '../../../types/KubernetesResource';
import { PackageRevisionResourcesMap } from '../../../types/PackageRevisionResource';
import {
  getPackageResourcesFromResourcesMap,
  PackageResource,
} from '../../../utils/packageRevisionResources';
import {
  createMultiResourceYaml,
  getResourcesFromMultiResourceYaml,
} from '../../../utils/yaml';
import { ResourceEditorDialog } from '../../ResourceEditorDialog';
import { ResourceViewerDialog } from '../../ResourceViewerDialog';

export enum ResourcesTableMode {
  VIEW = 'view',
  EDIT = 'edit',
}

type PackageRevisionResourcesTableProps = {
  resourcesMap: PackageRevisionResourcesMap;
  mode: ResourcesTableMode;
  onUpdatedResourcesMap?: (resourcesMap: PackageRevisionResourcesMap) => void;
};

type ResourceRow = PackageResource;

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
  mode,
  onUpdatedResourcesMap,
}: PackageRevisionResourcesTableProps) => {
  const [isDialogOpen, setIsOpenDialog] = useState<boolean>(false);
  const [selectedDialogResource, setSelectedDialogResource] = useState<
    DialogResource | undefined
  >(undefined);
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

  const openDialog = () => {
    setIsOpenDialog(true);
  };

  const closeDialog = () => {
    setIsOpenDialog(false);
  };

  const yamlFileEntries = Object.entries(resourcesMap).filter(
    file => file[0].endsWith('.yaml') || file[0] === 'Kptfile',
  );

  const getResourcesForFile = (filename: string): string[] => {
    const yamlFile = yamlFileEntries.find(yaml => yaml[0] === filename);

    return yamlFile ? getResourcesFromMultiResourceYaml(yamlFile[1]) : [];
  };

  const deleteResource = (filename: string, resourceIndex: number): void => {
    if (!onUpdatedResourcesMap) {
      throw new Error('onUpdatedResourcesMap is not defined');
    }

    const latestResourcesMap = { ...resourcesMap };
    const resourcesInFile = getResourcesForFile(filename);

    if (resourceIndex === 0 && resourcesInFile.length === 1) {
      delete latestResourcesMap[filename];
    } else {
      resourcesInFile.splice(resourceIndex, 1);
      latestResourcesMap[filename] = createMultiResourceYaml(resourcesInFile);
    }

    onUpdatedResourcesMap(latestResourcesMap);
  };

  const rowOptions = (resourceRow: ResourceRow): JSX.Element[] => {
    const options: JSX.Element[] = [];

    if (mode === ResourcesTableMode.EDIT) {
      if (resourceRow.filename !== 'Kptfile') {
        options.push(
          <IconButton
            key="delete"
            size="small"
            title="Delete"
            onClick={event => {
              event.stopPropagation();
              deleteResource(resourceRow.filename, resourceRow.resourceIndex);
            }}
          >
            <DeleteIcon />
          </IconButton>,
        );
      }
    }

    return options;
  };

  const columns: TableColumn<ResourceRow>[] = [
    { title: 'Kind', field: 'kind' },
    { title: 'Name', field: 'name' },
    { title: 'Namespace', field: 'namespace' },
    { title: '', render: resourceRow => <div>{rowOptions(resourceRow)}</div> },
  ];

  const allResources = getPackageResourcesFromResourcesMap(
    resourcesMap,
  ) as ResourceRow[];

  allResources.sort((resource1, resource2) => {
    const resourceScore = (resource: ResourceRow): number => {
      if (resource.kind === 'Kptfile') return 1000;
      if (resource.kind === 'Namespace') return 100;

      return 0;
    };

    const resourceQualifiedName = (resource: ResourceRow): string =>
      (resource.namespace || ' ') + resource.kind + resource.name;

    if (resourceScore(resource1) === resourceScore(resource2)) {
      return resourceQualifiedName(resource1) > resourceQualifiedName(resource2)
        ? 1
        : -1;
    }

    return resourceScore(resource1) < resourceScore(resource2) ? 1 : -1;
  });

  const saveUpdatedYaml = (yaml: string): void => {
    if (!onUpdatedResourcesMap) {
      throw new Error('onUpdatedResourcesMap is not defined');
    }

    if (!selectedDialogResource) {
      throw new Error('selectedDialogResource is not defined');
    }

    const isExistingResource: boolean = !!selectedDialogResource.filename;

    if (isExistingResource) {
      const filename = selectedDialogResource.filename as string;

      const fileResourcesYaml = getResourcesForFile(filename);
      fileResourcesYaml[selectedDialogResource.resourceIndex ?? 0] = yaml;

      const fullYaml = createMultiResourceYaml(fileResourcesYaml);

      const latestResourcesMap = {
        ...resourcesMap,
        [filename]: fullYaml,
      };

      onUpdatedResourcesMap(latestResourcesMap);
    } else {
      const resourceYaml = load(yaml) as KubernetesResource;
      const resourceKind = resourceYaml.kind;

      const filename = `${kebabCase(resourceKind)}.yaml`;

      const fileResourcesYaml = getResourcesForFile(filename);
      fileResourcesYaml.push(yaml);

      const fullYaml = createMultiResourceYaml(fileResourcesYaml);

      const latestResourcesMap = {
        ...resourcesMap,
        [filename]: fullYaml,
      };

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

    const yaml = dump(resourceJson);

    const thisSelectedResource = { yaml };

    setSelectedDialogResource(thisSelectedResource);
    setIsOpenDialog(true);
  };

  const onAddResourceMenuItemClick = (gvk?: KubernetesGKV): void => {
    onAddResourceMenuClose();
    addResource(gvk);
  };

  const renderAddResourceButtonGroup = (): JSX.Element => {
    if (mode === ResourcesTableMode.EDIT) {
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
      {mode === ResourcesTableMode.EDIT ? (
        <ResourceEditorDialog
          open={isDialogOpen}
          onClose={closeDialog}
          yaml={selectedDialogResource?.yaml ?? ''}
          onSaveYaml={saveUpdatedYaml}
          packageResources={allResources}
        />
      ) : (
        <ResourceViewerDialog
          open={isDialogOpen}
          onClose={closeDialog}
          yaml={selectedDialogResource?.yaml ?? ''}
        />
      )}

      <Table<ResourceRow>
        title="Resources"
        options={{ search: false, paging: false }}
        columns={columns}
        data={allResources}
        onRowClick={(_, resource) => {
          if (resource) {
            setSelectedDialogResource(resource);
            openDialog();
          }
        }}
      />

      {renderAddResourceButtonGroup()}
    </Fragment>
  );
};
