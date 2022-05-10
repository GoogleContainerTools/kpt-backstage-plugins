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

import { makeStyles } from '@material-ui/core';
import React, { Fragment } from 'react';
import { RepositorySummary } from '../../../types/RepositorySummary';
import { RepositoryLink } from '../../Links/RepositoryLink';

const useStyles = makeStyles({
  relatedRepository: {
    marginRight: '10px',
    marginTop: 'auto',
  },
});

type RelatedRepositoryContentProps = {
  repositorySummary: RepositorySummary;
};

export const RelatedRepositoryContent = ({
  repositorySummary,
}: RelatedRepositoryContentProps) => {
  const classes = useStyles();

  const renderRelatedRepositoryLinks = (): JSX.Element[] => {
    const links: JSX.Element[] = [];

    if (repositorySummary.downstreamRepositories.length > 0) {
      const numberOfDownstreamRepositories =
        repositorySummary.downstreamRepositories.length;

      const description = `Downstream ${
        numberOfDownstreamRepositories > 1 ? 'Repositories' : 'Repository'
      }`;

      links.push(
        <div key="downstream" className={classes.relatedRepository}>
          {description}:&nbsp;
          {repositorySummary.downstreamRepositories.map(
            (downstreamRepository, index) => (
              <Fragment key={downstreamRepository.metadata.name}>
                <RepositoryLink repository={downstreamRepository} />
                {index !== numberOfDownstreamRepositories - 1 && (
                  <span>, </span>
                )}
              </Fragment>
            ),
          )}
        </div>,
      );
    }

    if (repositorySummary.upstreamRepository) {
      links.push(
        <div key="upstream" className={classes.relatedRepository}>
          Upstream Repository:&nbsp;
          <RepositoryLink repository={repositorySummary.upstreamRepository} />
        </div>,
      );
    }

    return links;
  };

  return <Fragment>{renderRelatedRepositoryLinks()}</Fragment>;
};
