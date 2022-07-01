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

import { cloneDeep } from 'lodash';
import {
  PackageRevision,
  PackageRevisionLifecycle,
  PackageRevisionTask,
} from '../types/PackageRevision';

const getRevisionNumber = (
  revision: string,
  defaultNumber: number = NaN,
): number => {
  if (revision && revision.startsWith('v')) {
    const revisionNumber = parseInt(revision.substring(1), 10);

    if (Number.isInteger(revisionNumber)) {
      return revisionNumber;
    }
  }

  return defaultNumber;
};

const getNextRevision = (revision: string): string => {
  const revisionNumber = getRevisionNumber(revision, 0);

  return `v${revisionNumber + 1}`;
};

type UpstreamPackageRevisionDetails = {
  packageName: string;
  revision: string;
};

export const getPackageRevisionTitle = (
  packageRevision: PackageRevision,
): string => {
  const { packageName, revision } = packageRevision.spec;

  return `${packageName} ${revision}`;
};

export const getUpstreamPackageRevisionDetails = (
  packageRevision: PackageRevision,
): UpstreamPackageRevisionDetails | undefined => {
  if (packageRevision.status?.upstreamLock?.git?.ref) {
    const [packageName, revision] =
      packageRevision.status.upstreamLock.git.ref.split('/');

    return { packageName, revision };
  }

  return undefined;
};

export const isLatestPublishedRevision = (
  packageRevision: PackageRevision,
): boolean => {
  return (
    packageRevision.spec.lifecycle === PackageRevisionLifecycle.PUBLISHED &&
    !!packageRevision.metadata.labels?.['kpt.dev/latest-revision']
  );
};

export const findLatestPublishedRevision = (
  packageRevisions: PackageRevision[],
): PackageRevision | undefined => {
  const latestPublishedRevision = packageRevisions.find(
    isLatestPublishedRevision,
  );

  return latestPublishedRevision;
};

export const findPackageRevision = (
  packageRevisions: PackageRevision[],
  packageName: string,
  revision: string,
): PackageRevision | undefined => {
  return packageRevisions.find(
    packageRevision =>
      packageRevision.spec.packageName === packageName &&
      packageRevision.spec.revision === revision,
  );
};

export const filterPackageRevisions = (
  packageRevisions: PackageRevision[],
  packageName: string,
): PackageRevision[] => {
  return packageRevisions.filter(
    packageRevision =>
      packageRevision.spec.packageName === packageName &&
      Number.isFinite(getRevisionNumber(packageRevision.spec.revision)),
  );
};

export const getPackageRevision = (
  packageRevisions: PackageRevision[],
  fullPackageName: string,
): PackageRevision => {
  const packageRevision = packageRevisions.find(
    thisPackageRevision =>
      thisPackageRevision.metadata.name === fullPackageName,
  );

  if (!packageRevision) {
    throw new Error(`Package revision ${name} does not exist`);
  }

  return packageRevision;
};

export const canCloneOrDeploy = (packageRevision: PackageRevision): boolean => {
  return isLatestPublishedRevision(packageRevision);
};

export const isNotAPublishedRevision = (
  packageRevision: PackageRevision,
): boolean => {
  return packageRevision.spec.lifecycle !== PackageRevisionLifecycle.PUBLISHED;
};

export const getInitTask = (
  description: string,
  keywords: string,
  site: string,
): PackageRevisionTask => {
  const initTask: PackageRevisionTask = {
    type: 'init',
    init: {
      description: description ?? '',
      keywords: keywords
        ? keywords.split(',').map(keyword => keyword.trim())
        : undefined,
      site: site || undefined,
    },
  };

  return initTask;
};

export const getCloneTask = (fullPackageName: string): PackageRevisionTask => {
  const cloneTask: PackageRevisionTask = {
    type: 'clone',
    clone: {
      upstreamRef: {
        upstreamRef: {
          name: fullPackageName,
        },
      },
    },
  };

  return cloneTask;
};

export const getPackageRevisionResource = (
  repositoryName: string,
  packageName: string,
  revision: string,
  lifecycle: PackageRevisionLifecycle,
  tasks: PackageRevisionTask[],
): PackageRevision => {
  const resource: PackageRevision = {
    apiVersion: 'porch.kpt.dev/v1alpha1',
    kind: 'PackageRevision',
    metadata: {
      name: '', // Porch will populate
      namespace: 'default',
    },
    spec: {
      packageName: packageName,
      revision: revision,
      repository: repositoryName,
      lifecycle: lifecycle,
      tasks: tasks,
    },
  };

  return resource;
};

export const getNextPackageRevisionResource = (
  currentRevision: PackageRevision,
): PackageRevision => {
  const { repository, packageName, revision, tasks } = currentRevision.spec;
  const nextRevision = getNextRevision(revision);

  const resource = getPackageRevisionResource(
    repository,
    packageName,
    nextRevision,
    PackageRevisionLifecycle.DRAFT,
    cloneDeep(tasks),
  );

  return resource;
};

export const getUpgradePackageRevisionResource = (
  currentRevision: PackageRevision,
  upgradePackageRevisionName: string,
): PackageRevision => {
  const { repository, packageName, revision, tasks } = currentRevision.spec;
  const nextRevision = getNextRevision(revision);

  const [firstTask, ...remainderTasks] = tasks;

  if (firstTask.type !== 'clone') {
    throw new Error(
      `First task of a package revision to be upgraded must be of type 'clone'`,
    );
  }

  const newTasks = [
    getCloneTask(upgradePackageRevisionName),
    ...remainderTasks,
  ];

  const resource = getPackageRevisionResource(
    repository,
    packageName,
    nextRevision,
    PackageRevisionLifecycle.DRAFT,
    newTasks,
  );

  return resource;
};

export const sortByPackageNameAndRevisionComparison = (
  packageRevision1: PackageRevision,
  packageRevision2: PackageRevision,
): number => {
  const packageSpec1 = packageRevision1.spec;
  const packageSpec2 = packageRevision2.spec;

  if (packageSpec1.packageName === packageSpec2.packageName) {
    return (
      getRevisionNumber(packageSpec2.revision, -1) -
      getRevisionNumber(packageSpec1.revision, -1)
    );
  }

  return packageSpec1.packageName > packageSpec2.packageName ? 1 : -1;
};
