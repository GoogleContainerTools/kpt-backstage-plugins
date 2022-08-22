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
import { getAPIServiceStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/apiService';
import { getApplyReplacementsStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/applyReplacements';
import { getClusterIssuerStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/clusterIssuer';
import { getConfigMapStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/configMap';
import { getCustomResourceDefinitionStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/customResourceDefinition';
import { getDefaultStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/default';
import { getDeploymentStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/deployment';
import { getIngressStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/ingress';
import { getIngressClassStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/ingressClass';
import { getJobStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/job';
import { getKptfileStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/kptfile';
import { getPersistentVolumeClaimStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/persistentVolumeClaim';
import { getResourceQuotaStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/resourceQuota';
import { getRoleStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/role';
import { getRoleBindingStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/roleBinding';
import { getSecretStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/secret';
import { getServiceStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/service';
import { getSetLabelsStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/setLabels';
import { getStarlarkRunStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/starlarkRun';
import { getStatefulSetStructuredMetadata } from './FirstClassViewers/StructuredMetadata/resources/statefulSet';
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
    case 'apiextensions.k8s.io/v1/CustomResourceDefinition':
      return getCustomResourceDefinitionStructuredMetadata;

    case 'apiregistration.k8s.io/v1/APIService':
      return getAPIServiceStructuredMetadata;

    case 'apps/v1/Deployment':
      return getDeploymentStructuredMetadata;

    case 'apps/v1/StatefulSet':
      return getStatefulSetStructuredMetadata;

    case 'batch/v1/Job':
      return getJobStructuredMetadata;

    case 'cert-manager.io/v1/ClusterIssuer':
      return getClusterIssuerStructuredMetadata;

    case 'fn.kpt.dev/v1alpha1/ApplyReplacements':
      return getApplyReplacementsStructuredMetadata;

    case 'fn.kpt.dev/v1alpha1/SetLabels':
      return getSetLabelsStructuredMetadata;

    case 'fn.kpt.dev/v1alpha1/StarlarkRun':
      return getStarlarkRunStructuredMetadata;

    case 'kpt.dev/v1/Kptfile':
      return getKptfileStructuredMetadata;

    case 'networking.k8s.io/v1/Ingress':
      return getIngressStructuredMetadata;

    case 'networking.k8s.io/v1/IngressClass':
      return getIngressClassStructuredMetadata;

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

    case 'v1/Secret':
      return getSecretStructuredMetadata;

    case 'v1/Service':
      return getServiceStructuredMetadata;

    default:
      return getDefaultStructuredMetadata;
  }
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
