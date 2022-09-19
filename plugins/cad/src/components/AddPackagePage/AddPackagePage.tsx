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
  SelectItem,
  SimpleStepper,
  SimpleStepperStep,
} from '@backstage/core-components';
import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import { makeStyles, TextField, Typography } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { startCase } from 'lodash';
import React, { Fragment, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import { packageRouteRef } from '../../routes';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../types/PackageRevision';
import { Repository } from '../../types/Repository';
import {
  canCloneOrDeploy,
  getCloneTask,
  getInitTask,
  getPackageRevision,
  getPackageRevisionResource,
} from '../../utils/packageRevision';
import {
  ContentSummary,
  getPackageDescriptor,
  getRepository,
  getUpstreamPackageDescriptor,
  RepositoryContentDetails,
} from '../../utils/repository';
import { sortByLabel } from '../../utils/selectItem';
import { toLowerCase } from '../../utils/string';
import { Select } from '../Controls/Select';
import { PackageLink, RepositoriesLink, RepositoryLink } from '../Links';

const useStyles = makeStyles(() => ({
  stepContent: {
    maxWidth: '600px',
    '& > *': {
      marginTop: '16px',
    },
  },
}));

export enum AddPackagePageAction {
  ADD = 'add',
  CLONE = 'clone',
  DEPLOY = 'deploy',
}

type AddPackagePageProps = {
  action: AddPackagePageAction;
};

type PackageRevisionSelectItem = SelectItem & {
  packageRevision?: PackageRevision;
};

type RepositorySelectItem = SelectItem & {
  repository?: Repository;
};

type KptfileState = {
  description: string;
  keywords: string;
  site: string;
};

const mapPackageRevisionToSelectItem = (
  pacakgeRevision: PackageRevision,
): PackageRevisionSelectItem => ({
  label: `${pacakgeRevision.spec.packageName}:${pacakgeRevision.spec.revision}`,
  value: pacakgeRevision.metadata.name,
  packageRevision: pacakgeRevision,
});

const mapRepositoryToSelectItem = (
  repository: Repository,
): RepositorySelectItem => ({
  label: repository.metadata.name,
  value: repository.metadata.name,
  repository: repository,
});

export const AddPackagePage = ({ action }: AddPackagePageProps) => {
  const api = useApi(configAsDataApiRef);
  const classes = useStyles();
  const navigate = useNavigate();

  const { repositoryName, packageName } = useParams();

  const isAddPackageAction = action === AddPackagePageAction.ADD;
  const isCloneNamedPackageAction = !isAddPackageAction;

  const [newPackageName, setNewPackageName] = useState<string>('');
  const newPackageRevision = 'v1';

  const [targetRepository, setTargetRepository] = useState<Repository>();
  const [basePackageRevision, setBasePackageRevision] =
    useState<PackageRevision>();
  const [baseRepository, setBaseRepository] = useState<Repository>();

  const [kptfileState, setKptfileState] = useState<KptfileState>({
    description: '',
    keywords: '',
    site: '',
  });

  const [basePackageRevisionSelectItems, setBasePackageRevisionSelectItems] =
    useState<PackageRevisionSelectItem[]>([{ label: 'none', value: 'none' }]);
  const [targetRepositorySelectItems, setTargetRepositorySelectItems] =
    useState<RepositorySelectItem[]>([]);

  const targetRepositoryPackageDescriptor = targetRepository
    ? getPackageDescriptor(targetRepository)
    : 'Package';
  const upstreamRepositoryPackageDescriptor = targetRepository
    ? getUpstreamPackageDescriptor(targetRepository)
    : 'Package';

  const packageRef = useRouteRef(packageRouteRef);

  const targetRepositoryPackageDescriptorLowercase = toLowerCase(
    targetRepositoryPackageDescriptor,
  );
  const upstreamRepositoryPackageDescriptorLowercase = toLowerCase(
    upstreamRepositoryPackageDescriptor,
  );

  const { loading, error } = useAsync(async (): Promise<void> => {
    const [{ items: allRepositories }, allPackages] = await Promise.all([
      api.listRepositories(),
      api.listPackageRevisions(),
    ]);

    const thisRepository = getRepository(allRepositories, repositoryName);
    const packageDescriptor = getPackageDescriptor(
      thisRepository,
    ) as ContentSummary;

    if (isAddPackageAction) {
      setTargetRepository(thisRepository);

      const getAllowableClonablePackages = (): PackageRevision[] => {
        const repositoryFilter = (repository: Repository): boolean =>
          RepositoryContentDetails[packageDescriptor].cloneFrom.includes(
            getPackageDescriptor(repository) as ContentSummary,
          );

        const allowRepositories = allRepositories
          .filter(repositoryFilter)
          .map(repository => repository.metadata.name);

        const clonablePackages = allPackages
          .filter(thisPackage =>
            allowRepositories.includes(thisPackage.spec.repository),
          )
          .filter(canCloneOrDeploy);

        return clonablePackages;
      };

      const blueprintPackages = getAllowableClonablePackages();
      const allowPackageRevisions = sortByLabel<PackageRevisionSelectItem>(
        blueprintPackages.map(mapPackageRevisionToSelectItem),
      );

      allowPackageRevisions.unshift({ label: 'none', value: 'none' });

      setBasePackageRevisionSelectItems(allowPackageRevisions);
    }

    if (isCloneNamedPackageAction) {
      setBaseRepository(thisRepository);
      setBasePackageRevision(getPackageRevision(allPackages, packageName));

      const repositoryFilter = (repository: Repository): boolean =>
        RepositoryContentDetails[packageDescriptor].cloneTo.includes(
          getPackageDescriptor(repository) as ContentSummary,
        );

      const allowTargetRepositories = allRepositories.filter(repositoryFilter);

      const repositorySelectItems: RepositorySelectItem[] = sortByLabel(
        allowTargetRepositories.map(mapRepositoryToSelectItem),
      );

      setTargetRepositorySelectItems(repositorySelectItems);

      if (repositorySelectItems.length === 1) {
        setTargetRepository(repositorySelectItems[0].repository);
      }
    }
  }, [api, packageName]);

  const getNewPackageRevisionResource = (): PackageRevision => {
    if (!targetRepository) {
      throw new Error('Target repository is not defined');
    }

    const baseTask = basePackageRevision
      ? getCloneTask(basePackageRevision.metadata.name)
      : getInitTask(
          kptfileState.description,
          kptfileState.keywords,
          kptfileState.site,
        );

    const tasks = [baseTask];

    const resource: PackageRevision = getPackageRevisionResource(
      targetRepository.metadata.name,
      newPackageName,
      newPackageRevision,
      PackageRevisionLifecycle.DRAFT,
      tasks,
    );

    return resource;
  };

  const getDisplayPackageName = (thisPackage?: PackageRevision): string => {
    return thisPackage?.spec.packageName || packageName;
  };

  const createPackage = async (): Promise<void> => {
    const resourceJson = getNewPackageRevisionResource();

    const newPackageRevisionResource = await api.createPackageRevision(
      resourceJson,
    );
    const newPackageRevisionName = newPackageRevisionResource.metadata.name;

    navigate(
      packageRef({
        repositoryName: resourceJson.spec.repository,
        packageName: newPackageRevisionName,
      }),
    );
  };

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  return (
    <div>
      {isCloneNamedPackageAction ? (
        <Fragment>
          <Breadcrumbs>
            <RepositoriesLink breadcrumb />
            <RepositoryLink
              repository={baseRepository as Repository}
              breadcrumb
            />
            <PackageLink
              packageRevision={basePackageRevision as PackageRevision}
              breadcrumb
            />
            <Typography>{action}</Typography>
          </Breadcrumbs>

          <ContentHeader
            title={`${startCase(action)} ${getDisplayPackageName(
              basePackageRevision,
            )}`}
          />
        </Fragment>
      ) : (
        <Fragment>
          <Breadcrumbs>
            <RepositoriesLink breadcrumb />
            <RepositoryLink
              repository={targetRepository as Repository}
              breadcrumb
            />
            <Typography>add</Typography>
          </Breadcrumbs>

          <ContentHeader title={`Add ${targetRepositoryPackageDescriptor}`} />
        </Fragment>
      )}

      <SimpleStepper>
        <SimpleStepperStep
          title={`${targetRepositoryPackageDescriptor} Metadata`}
        >
          <div className={classes.stepContent}>
            {isCloneNamedPackageAction && (
              <Select
                label={`${targetRepositoryPackageDescriptor} Repository`}
                onChange={selectedRepositoryName =>
                  setTargetRepository(
                    targetRepositorySelectItems.find(
                      r => r.value === selectedRepositoryName,
                    )?.repository,
                  )
                }
                selected={targetRepository?.metadata.name ?? ''}
                items={targetRepositorySelectItems}
                helperText={`The ${targetRepositoryPackageDescriptorLowercase} repository the package will be created in.`}
              />
            )}
            {!isCloneNamedPackageAction && (
              <Select
                label={upstreamRepositoryPackageDescriptor}
                onChange={value =>
                  setBasePackageRevision(
                    basePackageRevisionSelectItems.find(p => p.value === value)
                      ?.packageRevision,
                  )
                }
                selected={basePackageRevision?.metadata.name ?? 'none'}
                items={basePackageRevisionSelectItems}
                helperText={`The ${upstreamRepositoryPackageDescriptorLowercase} the ${targetRepositoryPackageDescriptorLowercase} will be based off of.`}
              />
            )}
            <TextField
              label="Name"
              variant="outlined"
              value={newPackageName}
              name="name"
              onChange={e => setNewPackageName(e.target.value)}
              fullWidth
              helperText={`The name of the ${targetRepositoryPackageDescriptorLowercase} to create.`}
            />
          </div>
        </SimpleStepperStep>

        {!basePackageRevision && (
          <SimpleStepperStep title="Kptfile">
            <div className={classes.stepContent}>
              <TextField
                label="Description"
                variant="outlined"
                value={kptfileState.description}
                onChange={e =>
                  setKptfileState(s => ({ ...s, description: e.target.value }))
                }
                fullWidth
                helperText={`The short description of this ${targetRepositoryPackageDescriptorLowercase}.`}
              />

              <TextField
                label="Keywords"
                variant="outlined"
                value={kptfileState.keywords}
                onChange={e =>
                  setKptfileState(s => ({ ...s, keywords: e.target.value }))
                }
                fullWidth
                helperText="Optional. Comma separated list of keywords."
              />

              <TextField
                label="Site"
                variant="outlined"
                value={kptfileState.site}
                onChange={e =>
                  setKptfileState(s => ({ ...s, site: e.target.value }))
                }
                fullWidth
                helperText={`Optional. The URL for the ${targetRepositoryPackageDescriptor?.toLocaleLowerCase(
                  'en-US',
                )}'s web page.`}
              />
            </div>
          </SimpleStepperStep>
        )}

        <SimpleStepperStep
          title="Confirm"
          actions={{
            nextText: `Create ${targetRepositoryPackageDescriptor}`,
            onNext: createPackage,
          }}
        >
          <div>
            <Typography>
              Confirm creation of the{' '}
              <strong>
                {newPackageName} {targetRepositoryPackageDescriptorLowercase}
              </strong>{' '}
              in the {targetRepository?.metadata.name} repository?
            </Typography>
          </div>
        </SimpleStepperStep>
      </SimpleStepper>
    </div>
  );
};
