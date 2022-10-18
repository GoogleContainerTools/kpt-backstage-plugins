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

import React, { useEffect, useRef } from 'react';
import { PackageResource } from '../../../utils/packageRevisionResources';
import { ApplyReplacementsEditor } from './FirstClassEditors/ApplyReplacementsEditor';
import { ConfigMapEditor } from './FirstClassEditors/ConfigMapEditor';
import { DeploymentEditor } from './FirstClassEditors/DeploymentEditor';
import { IngressEditor } from './FirstClassEditors/IngressEditor';
import { KptfileEditor } from './FirstClassEditors/KptfileEditor';
import { NamespaceEditor } from './FirstClassEditors/NamespaceEditor';
import { ResourceQuotaEditor } from './FirstClassEditors/ResourceQuotaEditor';
import { RoleBindingEditor } from './FirstClassEditors/RoleBindingEditor';
import { RoleEditor } from './FirstClassEditors/RoleEditor';
import { ServiceAccountEditor } from './FirstClassEditors/ServiceAccountEditor';
import { ServiceEditor } from './FirstClassEditors/ServiceEditor';
import { SetLabelsEditor } from './FirstClassEditors/SetLabelsEditor';

type OnUpdatedYamlFn = (yaml: string) => void;
type OnNoNamedEditorFn = () => void;

type FirstClassEditorSelectorProps = {
  apiVersion: string;
  kind: string;
  yaml: string;
  onUpdatedYaml: OnUpdatedYamlFn;
  onNoNamedEditor: OnNoNamedEditorFn;
  packageResources: PackageResource[];
};

export const FirstClassEditorSelector = ({
  apiVersion,
  kind,
  yaml,
  onUpdatedYaml,
  onNoNamedEditor,
  packageResources,
}: FirstClassEditorSelectorProps) => {
  const groupVersionKind = `${apiVersion}/${kind}`;
  const isNamedEditor = useRef<boolean>(true);

  useEffect(() => {
    if (!isNamedEditor.current) {
      onNoNamedEditor();
    }
  }, [onNoNamedEditor]);

  switch (groupVersionKind) {
    case 'apps/v1/Deployment':
      return (
        <DeploymentEditor
          yaml={yaml}
          onUpdatedYaml={onUpdatedYaml}
          packageResources={packageResources}
        />
      );

    case 'fn.kpt.dev/v1alpha1/ApplyReplacements':
      return (
        <ApplyReplacementsEditor
          yaml={yaml}
          onUpdatedYaml={onUpdatedYaml}
          packageResources={packageResources}
        />
      );

    case 'fn.kpt.dev/v1alpha1/SetLabels':
      return <SetLabelsEditor yaml={yaml} onUpdatedYaml={onUpdatedYaml} />;

    case 'kpt.dev/v1/Kptfile':
      return (
        <KptfileEditor
          yaml={yaml}
          onUpdatedYaml={onUpdatedYaml}
          packageResources={packageResources}
        />
      );

    case 'networking.k8s.io/v1/Ingress':
      return (
        <IngressEditor
          yaml={yaml}
          onUpdatedYaml={onUpdatedYaml}
          packageResources={packageResources}
        />
      );

    case 'rbac.authorization.k8s.io/v1/Role':
      return <RoleEditor yaml={yaml} onUpdatedYaml={onUpdatedYaml} />;

    case 'rbac.authorization.k8s.io/v1/RoleBinding':
      return (
        <RoleBindingEditor
          yaml={yaml}
          onUpdatedYaml={onUpdatedYaml}
          packageResources={packageResources}
        />
      );

    case 'v1/ConfigMap':
      return <ConfigMapEditor yaml={yaml} onUpdatedYaml={onUpdatedYaml} />;

    case 'v1/Namespace':
      return <NamespaceEditor yaml={yaml} onUpdatedYaml={onUpdatedYaml} />;

    case 'v1/ResourceQuota':
      return <ResourceQuotaEditor yaml={yaml} onUpdatedYaml={onUpdatedYaml} />;

    case 'v1/Service':
      return (
        <ServiceEditor
          yaml={yaml}
          onUpdatedYaml={onUpdatedYaml}
          packageResources={packageResources}
        />
      );

    case 'v1/ServiceAccount':
      return <ServiceAccountEditor yaml={yaml} onUpdatedYaml={onUpdatedYaml} />;

    default:
  }

  isNamedEditor.current = false;
  return null;
};
