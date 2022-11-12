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

import { InfoCard } from '@backstage/core-components';
import { makeStyles } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React, { Fragment } from 'react';
import { PackageRevisionLifecycle } from '../../../types/PackageRevision';
import { Repository } from '../../../types/Repository';
import { PackageSummary } from '../../../utils/packageSummary';
import { isRepositoryReady } from '../../../utils/repository';
import { toLowerCase } from '../../../utils/string';
import { RepositoryLink } from '../../Links';

type ContentInfoCardProps = {
  contentType: string;
  repositories: Repository[];
  packages: PackageSummary[];
};

export const useStyles = makeStyles({
  summary: {
    marginTop: '8px',
    '& > *:not(:first-child)': {
      marginTop: '8px',
    },
  },
  actions: {
    justifyContent: 'flex-start',
    margin: '12px',
    marginRight: 'auto',
  },
});

const getActions = (
  repositories: Repository[],
  className: string,
): JSX.Element => {
  if (repositories.length === 0) {
    return <Fragment />;
  }

  return (
    <div className={className}>
      <Fragment>Repositories:</Fragment>&nbsp;
      {repositories.map((r, idx) => (
        <Fragment>
          <RepositoryLink repository={r} />
          {idx !== repositories.length - 1 && <Fragment>, </Fragment>}
        </Fragment>
      ))}
    </div>
  );
};

const getPublishedPackages = (packages: PackageSummary[]): PackageSummary[] => {
  return packages.filter(summary => !!summary.latestPublishedRevision);
};

const getProposedPackages = (packages: PackageSummary[]): PackageSummary[] => {
  return packages.filter(
    summary =>
      summary.latestRevision.spec.lifecycle ===
      PackageRevisionLifecycle.PROPOSED,
  );
};

const getDraftPackages = (packages: PackageSummary[]): PackageSummary[] => {
  return packages.filter(
    summary =>
      summary.latestRevision.spec.lifecycle === PackageRevisionLifecycle.DRAFT,
  );
};

const getUpgradePackages = (packages: PackageSummary[]): PackageSummary[] => {
  return packages.filter(summary => summary.isUpgradeAvailable);
};

export const ContentInfoCard = ({
  contentType,
  repositories,
  packages,
}: ContentInfoCardProps) => {
  const classes = useStyles();

  const title = `${contentType}s`;
  const contentTypeLowerCase = toLowerCase(contentType);

  const repositoriesNotReady = repositories.filter(
    repository => !isRepositoryReady(repository),
  );

  const published = getPublishedPackages(packages).length;
  const upgradesAvailable = getUpgradePackages(packages).length;
  const pendingReview = getDraftPackages(packages).length;
  const drafts = getProposedPackages(packages).length;

  const subheader = `${repositories.length} repositories registered`;

  return (
    <InfoCard
      title={title}
      subheader={subheader}
      actions={getActions(repositories, classes.actions)}
    >
      <div className={classes.summary}>
        {repositories.length === 0 && (
          <Alert severity="info">
            no {contentTypeLowerCase} repositories registered
          </Alert>
        )}

        {repositories.length > 0 && (
          <Alert severity="success">
            {published} {contentTypeLowerCase}s published
          </Alert>
        )}

        {repositoriesNotReady.map(repository => (
          <Alert severity="error" key={repository.metadata.name}>
            repository <RepositoryLink repository={repository} /> is not ready
          </Alert>
        ))}

        {upgradesAvailable > 0 && (
          <Alert severity="info">
            {upgradesAvailable} {contentTypeLowerCase}s with upgrades available
          </Alert>
        )}

        {pendingReview > 0 && (
          <Alert severity="info">
            {pendingReview} {contentTypeLowerCase} revisions pending review
          </Alert>
        )}

        {drafts > 0 && <Alert severity="info">{drafts} draft revisions</Alert>}
      </div>
    </InfoCard>
  );
};
