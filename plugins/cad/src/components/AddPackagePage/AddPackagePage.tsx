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
import React, { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { configAsDataApiRef } from '../../apis';
import { packageRouteRef } from '../../routes';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../types/PackageRevision';
import { Repository } from '../../types/Repository';
import { RepositorySummary } from '../../types/RepositorySummary';
import {
  canCloneOrDeploy,
  getCloneTask,
  getInitTask,
  getPackageRevisionResource,
} from '../../utils/packageRevision';
import {
  getPackageDescriptor,
  getUpstreamPackageDescriptor,
  isCatalogBlueprintRepository,
  isDeployableBlueprintRepository,
  isDeploymentRepository,
} from '../../utils/repository';
import { getRepositorySummary } from '../../utils/repositorySummary';
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

export const AddPackagePage = ({ action }: AddPackagePageProps) => {
  const api = useApi(configAsDataApiRef);

  const { repositoryName, packageName } = useParams();

  const cloneToDownstreamRepository = action !== AddPackagePageAction.ADD;

  const [targetRepositoryName, setTargetRepositoryName] = useState<string>(
    !cloneToDownstreamRepository ? repositoryName : '',
  );

  const [targetRepository, setTargetRepository] = useState<Repository>();
  const [baseRepository, setBaseRepository] = useState<Repository>();
  const [repositorySummary, setRepositorySummary] =
    useState<RepositorySummary>();
  const [allRepositories, setAllRepositories] = useState<Repository[]>([]);

  const [basePackageName, setBasePackageName] = useState<string>(
    packageName ?? '',
  );
  const [basePackageRevision, setBasePackageRevision] =
    useState<PackageRevision>();

  const [newPackageName, setNewPackageName] = useState<string>('');
  const [newPackageRevision, _] = useState<string>('v1');
  const [kptFileDescription, setKptFileDescription] = useState<string>('');
  const [kptFileKeywords, setKptFileKeywords] = useState<string>('');
  const [kptFileSite, setKptFileSite] = useState<string>('');

  const [selectUpstreamRepositoryItems, setSelectUpstreamRepositoryItems] =
    useState<SelectItem[]>([]);
  const [selectDownstreamRepositoryItems, setSelectDownstreamRepositoryItems] =
    useState<SelectItem[]>([]);

  const [
    targetRepositoryPackageDescriptor,
    setTargetRepositoryPackageDescriptor,
  ] = useState<string>('Package');
  const [
    upstreamRepositoryPackageDescriptor,
    setUpstreamRepositoryPackageDescriptor,
  ] = useState<string>('Package');

  const classes = useStyles();
  const navigate = useNavigate();

  const packageRef = useRouteRef(packageRouteRef);

  const targetRepositoryPackageDescriptorLowercase = toLowerCase(
    targetRepositoryPackageDescriptor,
  );
  const upstreamRepositoryPackageDescriptorLowercase = toLowerCase(
    upstreamRepositoryPackageDescriptor,
  );

  const { loading, error } = useAsync(async (): Promise<void> => {
    const [{ items: thisRepositories }, thisRepositorySummary] =
      await Promise.all([
        api.listRepositories(),
        getRepositorySummary(api, repositoryName),
      ]);

    setAllRepositories(thisRepositories);
    setRepositorySummary(thisRepositorySummary);
  });

  useEffect(() => {
    if (!repositorySummary) return;

    const loadRequired = async () => {
      const setBasePackages = async (): Promise<void> => {
        const allPackages = await api.listPackageRevisions();

        const getUpstreamPackages = (): PackageRevision[] => {
          if (isCatalogBlueprintRepository(repositorySummary.repository))
            return [];

          const upstreamRepositoryFilter = isDeploymentRepository(
            repositorySummary.repository,
          )
            ? isDeployableBlueprintRepository
            : isCatalogBlueprintRepository;

          const upstreamRepositories = allRepositories
            .filter(upstreamRepositoryFilter)
            .map(repostiory => repostiory.metadata.name);

          const upstreamBlueprintPackages = allPackages
            .filter(thisPackage =>
              upstreamRepositories.includes(thisPackage.spec.repository),
            )
            .filter(canCloneOrDeploy);

          return upstreamBlueprintPackages;
        };

        const blueprintPackages = getUpstreamPackages();
        const upstreamBlueprints = sortByLabel(
          blueprintPackages.map(blueprintPackage => ({
            label: `${blueprintPackage.spec.packageName}:${blueprintPackage.spec.revision}`,
            value: blueprintPackage.metadata.name,
          })),
        );

        upstreamBlueprints.unshift({ label: 'none', value: 'none' });

        setSelectUpstreamRepositoryItems(upstreamBlueprints);

        if (upstreamBlueprints.length === 1) {
          setBasePackageName(upstreamBlueprints[0].value as string);
        }
      };

      const setDownstreamRepositories = (): void => {
        if (allRepositories && allRepositories.length > 0) {
          const isCatalogBlueprint = isCatalogBlueprintRepository(
            repositorySummary.repository,
          );

          const downstreamRepositoryFilter = isCatalogBlueprint
            ? isDeployableBlueprintRepository
            : isDeploymentRepository;

          const downstreamRepositories = allRepositories.filter(
            downstreamRepositoryFilter,
          );

          const deploymentRepositorySelectItems: SelectItem[] = sortByLabel(
            downstreamRepositories.map(repository => ({
              label: repository.metadata.name,
              value: repository.metadata.name,
            })),
          );

          setSelectDownstreamRepositoryItems(deploymentRepositorySelectItems);

          if (downstreamRepositories.length > 0) {
            setTargetRepositoryPackageDescriptor(
              getPackageDescriptor(downstreamRepositories[0]),
            );

            if (deploymentRepositorySelectItems.length === 1) {
              setTargetRepositoryName(
                deploymentRepositorySelectItems[0].value as string,
              );
            }
          }
        }
      };

      if (cloneToDownstreamRepository) {
        setBaseRepository(repositorySummary.repository);

        setDownstreamRepositories();
      } else {
        setTargetRepository(repositorySummary.repository);

        await setBasePackages();
      }
    };

    loadRequired();
  }, [
    api,
    allRepositories,
    repositorySummary,
    packageName,
    cloneToDownstreamRepository,
  ]);

  const getNewPackageRevisionResource = (): PackageRevision => {
    const baseTask =
      basePackageName !== 'none'
        ? getCloneTask(basePackageName)
        : getInitTask(kptFileDescription, kptFileKeywords, kptFileSite);

    const tasks = [baseTask];

    const resource: PackageRevision = getPackageRevisionResource(
      targetRepository?.metadata.name || '',
      newPackageName,
      newPackageRevision,
      PackageRevisionLifecycle.DRAFT,
      tasks,
    );

    return resource;
  };

  useEffect(() => {
    if (targetRepositoryName && repositorySummary) {
      const findRepository = (): Repository | undefined => {
        if (cloneToDownstreamRepository) {
          const thisRepository = allRepositories.find(
            repository => repository.metadata.name === targetRepositoryName,
          );
          return thisRepository;
        }

        return repositorySummary.repository;
      };

      const thisRepository = findRepository();

      if (thisRepository) {
        setTargetRepository(thisRepository);
        setTargetRepositoryPackageDescriptor(
          getPackageDescriptor(thisRepository),
        );
        setUpstreamRepositoryPackageDescriptor(
          getUpstreamPackageDescriptor(thisRepository),
        );
      }
    }
  }, [
    allRepositories,
    targetRepositoryName,
    repositorySummary,
    cloneToDownstreamRepository,
  ]);

  useEffect(() => {
    if (!basePackageName || basePackageName === 'none') return;

    const getBasePackageRevision = async (): Promise<void> => {
      const packageRevision = await api.getPackageRevision(basePackageName);

      setBasePackageRevision(packageRevision);
    };

    getBasePackageRevision();
  }, [api, basePackageName]);

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
      {cloneToDownstreamRepository ? (
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
            {cloneToDownstreamRepository && (
              <Select
                label={`${targetRepositoryPackageDescriptor} Repository`}
                onChange={value => setTargetRepositoryName(value)}
                selected={targetRepositoryName}
                items={selectDownstreamRepositoryItems}
                helperText={`The ${targetRepositoryPackageDescriptorLowercase} repository the package will be created in.`}
              />
            )}
            {!cloneToDownstreamRepository && (
              <Select
                label={upstreamRepositoryPackageDescriptor}
                onChange={value => setBasePackageName(value)}
                selected={basePackageName}
                items={selectUpstreamRepositoryItems}
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

        {basePackageName === 'none' && (
          <SimpleStepperStep title="Kptfile">
            <div className={classes.stepContent}>
              <TextField
                label="Description"
                variant="outlined"
                value={kptFileDescription}
                onChange={e => setKptFileDescription(e.target.value)}
                fullWidth
                helperText={`The short description of this ${targetRepositoryPackageDescriptorLowercase}.`}
              />

              <TextField
                label="Keywords"
                variant="outlined"
                value={kptFileKeywords}
                onChange={e => setKptFileKeywords(e.target.value)}
                fullWidth
                helperText="Optional. Comma separated list of keywords."
              />

              <TextField
                label="Site"
                variant="outlined"
                value={kptFileSite}
                onChange={e => setKptFileSite(e.target.value)}
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
              in the {targetRepositoryName} repository?
            </Typography>
          </div>
        </SimpleStepperStep>
      </SimpleStepper>
    </div>
  );
};
