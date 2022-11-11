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

import { Link } from '@backstage/core-components';
import { useRouteRef } from '@backstage/core-plugin-api';
import React from 'react';
import { rootRouteRef } from '../../routes';
import { useLinkStyles } from './styles';

type RepositoriesLinkProps = {
  breadcrumb?: boolean;
};

export const LandingPageLink = ({ breadcrumb }: RepositoriesLinkProps) => {
  const packageManagementRef = useRouteRef(rootRouteRef);

  const classes = useLinkStyles();
  const className = breadcrumb ? classes.breadcrumb : '';

  return (
    <Link className={className} to={packageManagementRef()}>
      Package Management
    </Link>
  );
};
