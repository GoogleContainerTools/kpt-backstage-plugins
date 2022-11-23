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
import { useRouteRef } from '@backstage/core-plugin-api';
import { makeStyles } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React, { Fragment } from 'react';
import { packagesRouteRef } from '../../../routes';
import { Repository } from '../../../types/Repository';
import {
  filterPackageSummaries,
  PackageSummary,
} from '../../../utils/packageSummary';
import {
  isRepositoryReady,
  RepositoryContentDetails,
} from '../../../utils/repository';
import { toLowerCase } from '../../../utils/string';
import { RegisterRepositoryLink, RepositoryLink } from '../../Links';

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
  const anyRepositoriesRegistered = repositories.length > 0;

  return (
    <div className={className}>
      {!anyRepositoriesRegistered && <RegisterRepositoryLink />}

      {anyRepositoriesRegistered && (
        <Fragment>
          <Fragment>Repositories:</Fragment>&nbsp;
          {repositories.map((r, idx) => (
            <Fragment key={r.metadata.name}>
              <RepositoryLink repository={r} />
              {idx !== repositories.length - 1 && <Fragment>, </Fragment>}
            </Fragment>
          ))}
        </Fragment>
      )}
    </div>
  );
};

export const ContentInfoCard = ({
  contentType,
  repositories,
  packages,
}: ContentInfoCardProps) => {
  const classes = useStyles();
  const packagesRef = useRouteRef(packagesRouteRef);

  const title = `${contentType}s`;
  const contentTypeLowerCase = toLowerCase(contentType);

  const repositoriesNotReady = repositories.filter(
    repository => !isRepositoryReady(repository),
  );

  const published = filterPackageSummaries(packages, { isPublished: true });
  const upgradesAvailable = filterPackageSummaries(packages, {
    isUpgradeAvailable: true,
  });
  const pendingReview = filterPackageSummaries(packages, { isProposed: true });
  const drafts = filterPackageSummaries(packages, { isDraft: true });

  const subheader = `${repositories.length} repositories registered`;

  return (
    <InfoCard
      title={title}
      subheader={subheader}
      actions={getActions(repositories, classes.actions)}
      deepLink={{
        link: packagesRef({
          packageContent: RepositoryContentDetails[contentType].contentLink,
        }),
        title: `${contentType}s`,
      }}
    >
      <div className={classes.summary}>
        {repositories.length === 0 && (
          <Alert severity="info">
            no {contentTypeLowerCase} repositories registered
          </Alert>
        )}

        {repositories.length > 0 && (
          <Alert severity="success">
            {published.length} {contentTypeLowerCase}s published
          </Alert>
        )}

        {repositoriesNotReady.map(repository => (
          <Alert severity="error" key={repository.metadata.name}>
            repository <RepositoryLink repository={repository} /> is not ready
          </Alert>
        ))}

        {upgradesAvailable.length > 0 && (
          <Alert severity="info">
            {upgradesAvailable.length} {contentTypeLowerCase}s with upgrades
            available
          </Alert>
        )}

        {pendingReview.length > 0 && (
          <Alert severity="info">
            {pendingReview.length} {contentTypeLowerCase} revisions pending
            review
          </Alert>
        )}

        {drafts.length > 0 && (
          <Alert severity="info">{drafts.length} draft revisions</Alert>
        )}
      </div>
    </InfoCard>
  );
};
