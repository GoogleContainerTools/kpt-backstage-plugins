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
import { dump } from 'js-yaml';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { ConfigAsDataApi, configAsDataApiRef } from '../../apis';
import { packageRouteRef } from '../../routes';
import { ConfigMap } from '../../types/ConfigMap';
import { Kptfile } from '../../types/Kptfile';
import { KubernetesResource } from '../../types/KubernetesResource';
import {
  PackageRevision,
  PackageRevisionLifecycle,
} from '../../types/PackageRevision';
import { PackageRevisionResourcesMap } from '../../types/PackageRevisionResource';
import { Repository } from '../../types/Repository';
import {
  findKptfileFunction,
  getLatestFunction,
  GroupFunctionsByName,
  groupFunctionsByName,
} from '../../utils/function';
import {
  canCloneRevision,
  getCloneTask,
  getInitTask,
  getPackageRevision,
  getPackageRevisionResource,
} from '../../utils/packageRevision';
import {
  getPackageResourcesFromResourcesMap,
  getPackageRevisionResourcesResource,
  getRootKptfile,
  PackageResource,
  updateResourceInResourcesMap,
  updateResourcesMap,
} from '../../utils/packageRevisionResources';
import {
  ContentSummary,
  getPackageDescriptor,
  getRepository,
  RepositoryContentDetails,
} from '../../utils/repository';
import { sortByLabel } from '../../utils/selectItem';
import { emptyIfUndefined, toLowerCase } from '../../utils/string';
import { dumpYaml, loadYaml } from '../../utils/yaml';
import { Checkbox, Select } from '../Controls';
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

type AddPackageSelectItem = SelectItem & {
  preferred: boolean;
  message?: string;
};

type PackageRevisionSelectItem = SelectItem & {
  packageRevision?: PackageRevision;
};

type RepositorySelectItem = SelectItem & {
  repository?: Repository;
};

type KptfileState = {
  name: string;
  description: string;
  keywords: string;
  site: string;
};

type ValidateResourcesState = {
  setKubeval: boolean;
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

const getPackageResources = async (
  api: ConfigAsDataApi,
  packageName: string,
): Promise<[PackageResource[], PackageRevisionResourcesMap]> => {
  const packageResourcesResponse = await api.getPackageRevisionResources(
    packageName,
  );
  const resourcesMap = packageResourcesResponse.spec.resources;
  const resources = getPackageResourcesFromResourcesMap(resourcesMap);

  return [resources, resourcesMap];
};

const createResource = (
  apiVersion: string,
  kind: string,
  name: string,
  localConfig: boolean = true,
): KubernetesResource => {
  const resource: KubernetesResource = {
    apiVersion: apiVersion,
    kind: kind,
    metadata: {
      name: name,
    },
  };

  if (localConfig) {
    resource.metadata.annotations = {
      'config.kubernetes.io/local-config': 'true',
    };
  }

  return resource;
};

const addPackageResource = (
  packageResources: PackageResource[],
  resource: KubernetesResource,
  filename: string,
): PackageResource => {
  const packageResource: PackageResource = {
    filename: filename,
    yaml: dumpYaml(resource),
  } as PackageResource;

  packageResources.push(packageResource);

  return packageResource;
};

export const AddPackagePage = ({ action }: AddPackagePageProps) => {
  const api = useApi(configAsDataApiRef);
  const classes = useStyles();
  const navigate = useNavigate();

  const { repositoryName, packageName } = useParams();

  const isAddPackageAction = action === AddPackagePageAction.ADD;
  const isCloneNamedPackageAction = !isAddPackageAction;

  const newPackageRevision = 'v1';

  const [addPackageAction, setAddPackageAction] =
    useState<AddPackageSelectItem>();
  const [addPackageSelectItems, setAddPackageSelectItems] = useState<
    AddPackageSelectItem[]
  >([]);

  const allRepositories = useRef<Repository[]>([]);
  const allClonablePackageRevisions = useRef<PackageRevision[]>([]);

  const [targetRepository, setTargetRepository] = useState<Repository>();
  const [sourcePackageRevision, setSourcePackageRevision] =
    useState<PackageRevision>();
  const [sourceRepository, setSourceRepository] = useState<Repository>();

  const [kptfileState, setKptfileState] = useState<KptfileState>({
    name: '',
    description: '',
    keywords: '',
    site: '',
  });

  const [validateResourcesState, setValidateResourcesState] =
    useState<ValidateResourcesState>({
      setKubeval: true,
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

    const actionSelectItems: AddPackageSelectItem[] = [];

    if (isAddPackageAction) {
      setTargetRepository(thisRepository);
      const packageDescriptorLowerCase = toLowerCase(packageDescriptor);

      actionSelectItems.push({
        label: `Create a new ${packageDescriptorLowerCase} from scratch`,
        value: 'none',
        preferred: true,
      });

      for (const contentType of Object.keys(RepositoryContentDetails)) {
        const cloneTo = RepositoryContentDetails[contentType].cloneTo;
        const contentTypeLowerCase = toLowerCase(contentType);

        const cloneToDetails = cloneTo.find(
          clone => clone.content === packageDescriptor,
        );

        if (cloneToDetails) {
          actionSelectItems.push({
            label: `Create a new ${packageDescriptorLowerCase} by cloning a ${contentTypeLowerCase}`,
            value: contentType,
            preferred: cloneToDetails.preferred,
            message: cloneToDetails.message,
          });
        }
      }
    }

    if (isCloneNamedPackageAction) {
      const thisPackageRevision = getPackageRevision(allPackages, packageName);

      for (const contentType of RepositoryContentDetails[packageDescriptor]
        .cloneTo) {
        actionSelectItems.push({
          label: `Create a new ${toLowerCase(
            contentType.content,
          )} by cloning the ${
            thisPackageRevision.spec.packageName
          } ${toLowerCase(packageDescriptor)}`,
          value: contentType.content,
          preferred: contentType.preferred,
          message: contentType.message,
        });
      }

      setSourceRepository(thisRepository);
      setSourcePackageRevision(thisPackageRevision);
    }

    setAddPackageSelectItems(actionSelectItems);
    setAddPackageAction(actionSelectItems.find(item => item.preferred));
  }, [api, packageName]);

  useEffect(() => {
    const repositoryFilter = (repository: Repository): boolean =>
      getPackageDescriptor(repository) === addPackageAction?.value;

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

  useEffect(() => {
    if (sourcePackageRevision) {
      const updateKptfileState = async (thisPackageName: string) => {
        const [resources] = await getPackageResources(api, thisPackageName);

        const kptfileResource = getRootKptfile(resources);

        const thisKptfile: Kptfile = loadYaml(kptfileResource.yaml);
        setKptfileState({
          name: emptyIfUndefined(thisKptfile.metadata?.name),
          description: emptyIfUndefined(thisKptfile.info?.description),
          keywords: emptyIfUndefined(thisKptfile.info?.keywords?.join(', ')),
          site: emptyIfUndefined(thisKptfile.info?.site),
        });

        const kubevalValidatorFn = findKptfileFunction(
          thisKptfile.pipeline?.validators || [],
          'kubeval',
        );

        setValidateResourcesState({
          setKubeval: !!kubevalValidatorFn,
        });
      };

      updateKptfileState(sourcePackageRevision.metadata.name);
    } else {
      setKptfileState({
        name: '',
        description: '',
        keywords: '',
        site: '',
      });

      setValidateResourcesState({
        setKubeval: true,
      });
    }
  }, [api, sourcePackageRevision]);

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
      kptfileState.name,
      newPackageRevision,
      PackageRevisionLifecycle.DRAFT,
      tasks,
    );

    return resource;
  };

  const getDisplayPackageName = (thisPackage?: PackageRevision): string => {
    return thisPackage?.spec.packageName || packageName;
  };

  const applyValidateResourcesState = async (
    resourcesMap: PackageRevisionResourcesMap,
    kptFunctions: GroupFunctionsByName,
  ): Promise<PackageRevisionResourcesMap> => {
    const resources = getPackageResourcesFromResourcesMap(resourcesMap);

    const kptfileResource = getRootKptfile(resources);
    const kptfileYaml = loadYaml(kptfileResource.yaml) as Kptfile;
    kptfileYaml.pipeline = kptfileYaml.pipeline || {};
    kptfileYaml.pipeline.validators = kptfileYaml.pipeline.validators || [];
    const validators = kptfileYaml.pipeline.validators;

    const newPackageResources: PackageResource[] = [];
    const updatedPackageResources: PackageResource[] = [];
    const deletedPackgeResources: PackageResource[] = [];

    const kubevalValidatorFn = findKptfileFunction(validators, 'kubeval');

    if (validateResourcesState.setKubeval) {
      if (!kubevalValidatorFn) {
        const kubevalFn = getLatestFunction(kptFunctions, 'kubeval');

        const kubevalConfigResource: ConfigMap = {
          ...createResource('v1', 'ConfigMap', 'kubeval-config'),
          data: {
            ignore_missing_schemas: 'true',
          },
        };

        const kubevalConfigPackageResource = addPackageResource(
          newPackageResources,
          kubevalConfigResource,
          'kubeval-config.yaml',
        );

        validators.push({
          image: kubevalFn.spec.image,
          configPath: kubevalConfigPackageResource.filename,
        });

        kptfileResource.yaml = dump(kptfileYaml);
        updatedPackageResources.push(kptfileResource);
      }
    } else {
      if (kubevalValidatorFn) {
        kptfileYaml.pipeline.validators = validators.filter(
          fn => fn !== kubevalValidatorFn,
        );

        kptfileResource.yaml = dump(kptfileYaml);
        updatedPackageResources.push(kptfileResource);

        if (kubevalValidatorFn.configPath) {
          const referenceResource = resources.find(
            resource =>
              resource.filename === kubevalValidatorFn.configPath &&
              !!resource.isLocalConfigResource,
          );
          if (referenceResource) {
            deletedPackgeResources.push(referenceResource);
          }
        }
      }
    }

    return updateResourcesMap(
      resourcesMap,
      newPackageResources,
      updatedPackageResources,
      deletedPackgeResources,
    );
  };

  const updateKptfileInfo = (
    resourcesMap: PackageRevisionResourcesMap,
  ): PackageRevisionResourcesMap => {
    const isClonePackageAction = !!sourcePackageRevision;

    if (!isClonePackageAction) {
      return resourcesMap;
    }

    const resources = getPackageResourcesFromResourcesMap(resourcesMap);

    const kptfileResource = getRootKptfile(resources);

    const thisKptfile: Kptfile = loadYaml(kptfileResource.yaml);

    thisKptfile.info.description = kptfileState.description;
    thisKptfile.info.keywords = kptfileState.keywords.trim()
      ? kptfileState.keywords.split(',').map(keyword => keyword.trim())
      : undefined;
    thisKptfile.info.site = kptfileState.site || undefined;

    const updatedKptfileYaml = dumpYaml(thisKptfile);

    const updatedResourceMap = updateResourceInResourcesMap(
      resourcesMap,
      kptfileResource,
      updatedKptfileYaml,
    );

    return updatedResourceMap;
  };

  const updatePackageResources = async (
    newPackageName: string,
  ): Promise<void> => {
    const allKptFunctions = await api.listCatalogFunctions();
    const kptFunctions = groupFunctionsByName(allKptFunctions);

    const [_, resourcesMap] = await getPackageResources(api, newPackageName);

    let updatedResourcesMap = await applyValidateResourcesState(
      resourcesMap,
      kptFunctions,
    );

    updatedResourcesMap = updateKptfileInfo(updatedResourcesMap);

    if (updatedResourcesMap !== resourcesMap) {
      const packageRevisionResources = getPackageRevisionResourcesResource(
        newPackageName,
        updatedResourcesMap,
      );

      await api.replacePackageRevisionResources(packageRevisionResources);
    }
  };

  const createPackage = async (): Promise<void> => {
    const resourceJson = getNewPackageRevisionResource();

    setIsCreatingPackage(true);

    const newPackageRevisionResource = await api.createPackageRevision(
      resourceJson,
    );
    const newPackageRevisionName = newPackageRevisionResource.metadata.name;

    await updatePackageResources(newPackageRevisionName);

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
                  onChange={value =>
                    setAddPackageAction(
                      addPackageSelectItems.find(
                        packageAction => packageAction.value === value,
                      ),
                    )
                  }
                  selected={emptyIfUndefined(addPackageAction?.value as string)}
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
                  selected={emptyIfUndefined(targetRepository?.metadata.name)}
                  items={targetRepositorySelectItems}
                  helperText={`The repository to create the new ${targetRepositoryPackageDescriptorLowercase} in.`}
                />

                {!!addPackageAction?.message && (
                  <Alert severity="info" icon={false}>
                    {addPackageAction.message}
                  </Alert>
                )}
              </Fragment>
            )}

            {isAddPackageAction && (
              <Fragment>
                <Select
                  label="Action"
                  onChange={value =>
                    setAddPackageAction(
                      addPackageSelectItems.find(
                        packageAction => packageAction.value === value,
                      ),
                    )
                  }
                  selected={emptyIfUndefined(addPackageAction?.value as string)}
                  items={addPackageSelectItems}
                  helperText={`The action to be taken in creating the new ${targetRepositoryPackageDescriptorLowercase}.`}
                />

                {addPackageAction?.value !== 'none' && (
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
                      selected={emptyIfUndefined(
                        sourceRepository?.metadata.name,
                      )}
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
                      selected={emptyIfUndefined(
                        sourcePackageRevision?.metadata.name,
                      )}
                      items={sourcePackageRevisionSelectItems}
                      helperText={`The ${sourceRepositoryPackageDescriptorLowercase} to clone.`}
                    />
                  </Fragment>
                )}

                {!!addPackageAction?.message && (
                  <Alert severity="info" icon={false}>
                    {addPackageAction.message}
                  </Alert>
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
              value={kptfileState.name}
              name="name"
              onChange={e =>
                setKptfileState(s => ({
                  ...s,
                  name: e.target.value,
                }))
              }
              fullWidth
              helperText={`The name of the ${targetRepositoryPackageDescriptorLowercase} to create.`}
            />

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
          </div>
        </SimpleStepperStep>

        <SimpleStepperStep title="Validate Resources">
          <div className={classes.stepContent}>
            <Checkbox
              label="Validate resources for any OpenAPI schema errors"
              checked={validateResourcesState.setKubeval}
              onChange={isChecked =>
                setValidateResourcesState(s => ({
                  ...s,
                  setKubeval: isChecked,
                }))
              }
              helperText="This validates each resource ensuring it is syntactically correct against its schema. These errors will cause a resource not to deploy to a cluster correctly otherwise. Validation is limited to kubernetes built-in types and GCP CRDs."
            />
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
                {kptfileState.name} {targetRepositoryPackageDescriptorLowercase}
              </strong>{' '}
              in the {targetRepository?.metadata.name} repository?
            </Typography>
          </div>
        </SimpleStepperStep>
      </SimpleStepper>
    </div>
  );
};
