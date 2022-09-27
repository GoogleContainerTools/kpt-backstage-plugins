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
import React, { Fragment, useEffect, useRef, useState } from 'react';
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
  canCloneRevision,
  getCloneTask,
  getInitTask,
  getPackageRevision,
  getPackageRevisionResource,
} from '../../utils/packageRevision';
import {
  ContentSummary,
  getPackageDescriptor,
  getRepository,
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
  packageRevision: PackageRevision,
): PackageRevisionSelectItem => ({
  label: packageRevision.spec.packageName,
  value: packageRevision.metadata.name,
  packageRevision: packageRevision,
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

  const [addPackageAction, setAddPackageAction] = useState<string>('');
  const [addPackageSelectItems, setAddPackageSelectItems] = useState<
    SelectItem[]
  >([]);

  const allRepositories = useRef<Repository[]>([]);
  const allClonablePackageRevisions = useRef<PackageRevision[]>([]);

  const [targetRepository, setTargetRepository] = useState<Repository>();
  const [sourcePackageRevision, setSourcePackageRevision] =
    useState<PackageRevision>();
  const [sourceRepository, setSourceRepository] = useState<Repository>();

  const [kptfileState, setKptfileState] = useState<KptfileState>({
    description: '',
    keywords: '',
    site: '',
  });

  const [isCreatingPackage, setIsCreatingPackage] = useState<boolean>(false);

  const [
    sourcePackageRevisionSelectItems,
    setSourcePackageRevisionSelectItems,
  ] = useState<PackageRevisionSelectItem[]>([]);
  const [targetRepositorySelectItems, setTargetRepositorySelectItems] =
    useState<RepositorySelectItem[]>([]);
  const [sourceRepositorySelectItems, setSourceRepositorySelectItems] =
    useState<RepositorySelectItem[]>([]);

  const targetRepositoryPackageDescriptor = targetRepository
    ? getPackageDescriptor(targetRepository)
    : 'Package';
  const sourceRepositoryPackageDescriptor = sourceRepository
    ? getPackageDescriptor(sourceRepository)
    : 'Package';

  const packageRef = useRouteRef(packageRouteRef);

  const targetRepositoryPackageDescriptorLowercase = toLowerCase(
    targetRepositoryPackageDescriptor,
  );
  const sourceRepositoryPackageDescriptorLowercase = toLowerCase(
    sourceRepositoryPackageDescriptor,
  );

  const { loading, error } = useAsync(async (): Promise<void> => {
    const [{ items: thisAllRepositories }, allPackages] = await Promise.all([
      api.listRepositories(),
      api.listPackageRevisions(),
    ]);

    allRepositories.current = thisAllRepositories;
    allClonablePackageRevisions.current = allPackages.filter(canCloneRevision);

    const thisRepository = getRepository(thisAllRepositories, repositoryName);
    const packageDescriptor = getPackageDescriptor(
      thisRepository,
    ) as ContentSummary;

    if (isAddPackageAction) {
      setTargetRepository(thisRepository);
      const packageDescriptorLowerCase = toLowerCase(packageDescriptor);

      const actionSelectItems: SelectItem[] = [
        {
          label: `Create a new ${packageDescriptorLowerCase} from scratch`,
          value: 'none',
        },
      ];

      for (const contentType of Object.keys(RepositoryContentDetails)) {
        const cloneTo = RepositoryContentDetails[contentType].cloneTo;
        const contentTypeLowerCase = toLowerCase(contentType);

        if (cloneTo.includes(packageDescriptor)) {
          actionSelectItems.push({
            label: `Create a new ${packageDescriptorLowerCase} by cloning a ${contentTypeLowerCase}`,
            value: contentType,
          });
        }
      }

      setAddPackageSelectItems(actionSelectItems);
      setAddPackageAction((actionSelectItems?.[0].value as string) ?? '');
    }

    if (isCloneNamedPackageAction) {
      const thisPackageRevision = getPackageRevision(allPackages, packageName);

      for (const contentType of RepositoryContentDetails[packageDescriptor]
        .cloneTo) {
        addPackageSelectItems.push({
          label: `Create a new ${toLowerCase(contentType)} by cloning the ${
            thisPackageRevision.spec.packageName
          } ${toLowerCase(packageDescriptor)}`,
          value: contentType,
        });
      }

      setSourceRepository(thisRepository);
      setSourcePackageRevision(thisPackageRevision);
      setAddPackageSelectItems(addPackageSelectItems);
      setAddPackageAction((addPackageSelectItems?.[0].value as string) ?? '');
    }
  }, [api, packageName]);

  useEffect(() => {
    const repositoryFilter = (repository: Repository): boolean =>
      getPackageDescriptor(repository) === addPackageAction;

    const filteredRepositories =
      allRepositories.current.filter(repositoryFilter);

    const repositorySelectItems: RepositorySelectItem[] = sortByLabel(
      filteredRepositories.map(mapRepositoryToSelectItem),
    );

    if (isAddPackageAction) {
      setSourceRepositorySelectItems(repositorySelectItems);
      setSourceRepository(repositorySelectItems[0]?.repository);
      setSourcePackageRevision(undefined);
    }

    if (isCloneNamedPackageAction) {
      setTargetRepositorySelectItems(repositorySelectItems);
      setTargetRepository(repositorySelectItems[0]?.repository);
    }
  }, [addPackageAction, isAddPackageAction, isCloneNamedPackageAction]);

  useEffect(() => {
    if (sourceRepository && isAddPackageAction) {
      const repositoryClonablePackages =
        allClonablePackageRevisions.current.filter(
          packageRevision =>
            packageRevision.spec.repository === sourceRepository.metadata.name,
        );

      const allowPackageRevisions = sortByLabel<PackageRevisionSelectItem>(
        repositoryClonablePackages.map(mapPackageRevisionToSelectItem),
      );

      setSourcePackageRevision(undefined);
      setSourcePackageRevisionSelectItems(allowPackageRevisions);
    }
  }, [sourceRepository, isAddPackageAction, isCloneNamedPackageAction]);

  const getNewPackageRevisionResource = (): PackageRevision => {
    if (!targetRepository) {
      throw new Error('Target repository is not defined');
    }

    const baseTask = sourcePackageRevision
      ? getCloneTask(sourcePackageRevision.metadata.name)
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

    setIsCreatingPackage(true);

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

  if (loading || isCreatingPackage) {
    return <Progress />;
  } else if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  return (
    <div>
      {isCloneNamedPackageAction && (
        <Fragment>
          <Breadcrumbs>
            <RepositoriesLink breadcrumb />
            <RepositoryLink
              repository={sourceRepository as Repository}
              breadcrumb
            />
            <PackageLink
              packageRevision={sourcePackageRevision as PackageRevision}
              breadcrumb
            />
            <Typography>clone</Typography>
          </Breadcrumbs>

          <ContentHeader
            title={`Clone ${getDisplayPackageName(sourcePackageRevision)}`}
          />
        </Fragment>
      )}

      {isAddPackageAction && (
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
        <SimpleStepperStep title="Action">
          <div className={classes.stepContent}>
            {isCloneNamedPackageAction && (
              <Fragment>
                <Select
                  label="Action"
                  onChange={value => setAddPackageAction(value)}
                  selected={addPackageAction}
                  items={addPackageSelectItems}
                  helperText={`The action to be taken with the ${sourcePackageRevision?.spec.packageName} ${sourceRepositoryPackageDescriptorLowercase}.`}
                />

                <Select
                  label={`Destination ${targetRepositoryPackageDescriptor} Repository`}
                  onChange={selectedRepositoryName =>
                    setTargetRepository(
                      targetRepositorySelectItems.find(
                        r => r.value === selectedRepositoryName,
                      )?.repository,
                    )
                  }
                  selected={targetRepository?.metadata.name ?? ''}
                  items={targetRepositorySelectItems}
                  helperText={`The repository to create the new ${targetRepositoryPackageDescriptorLowercase} in.`}
                />
              </Fragment>
            )}

            {isAddPackageAction && (
              <Fragment>
                <Select
                  label="Action"
                  onChange={value => setAddPackageAction(value)}
                  selected={addPackageAction}
                  items={addPackageSelectItems}
                  helperText={`The action to be taken in creating the new ${targetRepositoryPackageDescriptorLowercase}.`}
                />

                {addPackageAction !== 'none' && (
                  <Fragment>
                    <Select
                      label={`Source ${sourceRepositoryPackageDescriptor} Repository`}
                      onChange={selectedRepositoryName =>
                        setSourceRepository(
                          sourceRepositorySelectItems.find(
                            r => r.value === selectedRepositoryName,
                          )?.repository,
                        )
                      }
                      selected={sourceRepository?.metadata.name ?? ''}
                      items={sourceRepositorySelectItems}
                      helperText={`The repository that contains the ${sourceRepositoryPackageDescriptorLowercase} you want to clone.`}
                    />

                    <Select
                      label={`${sourceRepositoryPackageDescriptor} to Clone`}
                      onChange={value =>
                        setSourcePackageRevision(
                          sourcePackageRevisionSelectItems.find(
                            p => p.value === value,
                          )?.packageRevision,
                        )
                      }
                      selected={sourcePackageRevision?.metadata.name ?? ''}
                      items={sourcePackageRevisionSelectItems}
                      helperText={`The ${sourceRepositoryPackageDescriptorLowercase} to clone.`}
                    />
                  </Fragment>
                )}
              </Fragment>
            )}
          </div>
        </SimpleStepperStep>

        <SimpleStepperStep title="Metadata">
          <div className={classes.stepContent}>
            <TextField
              label="Name"
              variant="outlined"
              value={newPackageName}
              name="name"
              onChange={e => setNewPackageName(e.target.value)}
              fullWidth
              helperText={`The name of the ${targetRepositoryPackageDescriptorLowercase} to create.`}
            />

            {!sourcePackageRevision && (
              <Fragment>
                <TextField
                  label="Description"
                  variant="outlined"
                  value={kptfileState.description}
                  onChange={e =>
                    setKptfileState(s => ({
                      ...s,
                      description: e.target.value,
                    }))
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
                  helperText={`Optional. The URL for the ${targetRepositoryPackageDescriptorLowercase}'s web page.`}
                />
              </Fragment>
            )}
          </div>
        </SimpleStepperStep>

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
