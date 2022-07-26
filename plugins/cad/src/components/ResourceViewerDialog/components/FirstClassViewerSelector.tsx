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

import React from 'react';
import { getApplyReplacementsStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/applyReplacements';
import { getConfigMapStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/configMap';
import { getKptfileStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/kptfile';
import { getPersistentVolumeClaimStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/persistentVolumeClaim';
import { getResourceQuotaStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/resourceQuota';
import { getRoleStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/role';
import { getRoleBindingStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/roleBinding';
import { getServiceStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/service';
import { getSetLabelsStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/setLabels';
import {
  CustomMetadataFn,
  StructuredMetadata,
} from './FirstClassViewers/StructuredMetadata/StructuredMetadata';

type FirstClassViewerSelectorProps = {
  apiVersion: string;
  kind: string;
  yaml?: string;
  originalYaml?: string;
  showDiff?: boolean;
};

const getCustomMetadataFn = (
  groupVersionKind: string,
): CustomMetadataFn | undefined => {
  switch (groupVersionKind) {
    case 'fn.kpt.dev/v1alpha1/ApplyReplacements':
      return getApplyReplacementsStructuredMetadata;

    case 'fn.kpt.dev/v1alpha1/SetLabels':
      return getSetLabelsStructuredMetadata;

    case 'kpt.dev/v1/Kptfile':
      return getKptfileStructuredMetadata;

    case 'rbac.authorization.k8s.io/v1/ClusterRole':
    case 'rbac.authorization.k8s.io/v1/Role':
      return getRoleStructuredMetadata;

    case 'rbac.authorization.k8s.io/v1/ClusterRoleBinding':
    case 'rbac.authorization.k8s.io/v1/RoleBinding':
      return getRoleBindingStructuredMetadata;

    case 'v1/ConfigMap':
      return getConfigMapStructuredMetadata;

    case 'v1/PersistentVolumeClaim':
      return getPersistentVolumeClaimStructuredMetadata;

    case 'v1/ResourceQuota':
      return getResourceQuotaStructuredMetadata;

    case 'v1/Service':
      return getServiceStructuredMetadata;

    default:
  }

  return undefined;
};

export const FirstClassViewerSelector = ({
  apiVersion,
  kind,
  yaml,
  originalYaml,
  showDiff,
}: FirstClassViewerSelectorProps) => {
  const groupVersionKind = `${apiVersion}/${kind}`;

  const customMetadataFn = getCustomMetadataFn(groupVersionKind);

  return (
    <StructuredMetadata
      yaml={yaml}
      originalYaml={originalYaml}
      getCustomMetadata={customMetadataFn}
      showDiff={showDiff}
    />
  );
};
