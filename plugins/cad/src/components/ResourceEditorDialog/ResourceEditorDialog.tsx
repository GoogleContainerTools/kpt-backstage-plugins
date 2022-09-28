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
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  makeStyles,
} from '@material-ui/core';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { KubernetesResource } from '../../types/KubernetesResource';
import { PackageResource } from '../../utils/packageRevisionResources';
import { loadYaml } from '../../utils/yaml';
import { YamlViewer } from '../Controls';
import { FirstClassEditorSelector } from './components/FirstClassEditorSelector';

type OnSaveYamlFn = (yaml: string) => void;

type ResourceEditorProps = {
  open: boolean;
  onClose: () => void;
  yaml: string;
  onSaveYaml: OnSaveYamlFn;
  packageResources: PackageResource[];
};

const useStyles = makeStyles({
  container: {
    width: '660px',
    minHeight: 'min(420px, calc(80vh - 120px))',
    maxHeight: 'calc(80vh - 120px)',
    marginBottom: '10px',
    overflowY: 'scroll',
  },
});

export const ResourceEditorDialog = ({
  open,
  onClose,
  yaml,
  onSaveYaml,
  packageResources,
}: ResourceEditorProps) => {
  const classes = useStyles();

  const [showYamlView, setShowYamlView] = useState<boolean>(false);
  const [latestYaml, setLatestYaml] = useState<string>('');
  const [isNamedEditor, setIsNamedEditor] = useState<boolean>(true);

  const resourceYaml = loadYaml(yaml) as KubernetesResource;

  const resourceApiVersion = resourceYaml && resourceYaml.apiVersion;
  const kind = resourceYaml && resourceYaml.kind;

  useEffect(() => {
    if (open) {
      // Reset the state of the dialog anytime it is opened
      setLatestYaml(yaml);
      setShowYamlView(false);
      setIsNamedEditor(true);
    }
  }, [open, yaml]);

  const toggleView = (): void => {
    setShowYamlView(!showYamlView);
  };

  const handleNoNamedEditor = useCallback(() => setIsNamedEditor(false), []);

  const handleUpdatedYaml = (updatedYaml: string): void => {
    setLatestYaml(updatedYaml);
  };

  const onSave = (): void => {
    onSaveYaml(latestYaml);
    onClose();
  };

  const onDialogClose = (): void => {
    onClose();
  };

  const latestYamlHeight = (latestYaml.split('\n').length + 1) * 18;
  const title =
    resourceYaml?.kind && resourceYaml?.metadata
      ? `${resourceYaml.kind} ${resourceYaml?.metadata.name}`
      : 'New Resource';

  return (
    <Dialog open={open} onClose={onDialogClose} maxWidth="lg">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Fragment>
          <div
            className={classes.container}
            style={{ height: `${latestYamlHeight}px` }}
          >
            {!showYamlView && isNamedEditor ? (
              <FirstClassEditorSelector
                apiVersion={resourceApiVersion}
                kind={kind}
                yaml={latestYaml}
                packageResources={packageResources}
                onNoNamedEditor={handleNoNamedEditor}
                onUpdatedYaml={handleUpdatedYaml}
              />
            ) : (
              <YamlViewer
                value={latestYaml}
                allowEdit
                onUpdatedValue={handleUpdatedYaml}
              />
            )}
          </div>
          {isNamedEditor && (
            <Button variant="text" color="primary" onClick={toggleView}>
              Show {showYamlView ? 'Formatted View' : 'YAML View'}
            </Button>
          )}
        </Fragment>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={onDialogClose}>
          Cancel
        </Button>
        <Button color="primary" onClick={onSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
