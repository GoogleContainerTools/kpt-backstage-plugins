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

import Editor, { DiffEditor, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import React from 'react';

type YamlViewerProps = {
  height?: string;
  width?: string;
  original?: string;
  value: string;
  showDiff?: boolean;
  allowEdit?: boolean;
  onUpdatedValue?: (newValue: string) => void;
};

export const YamlViewer = ({
  original,
  value,
  showDiff,
  allowEdit,
  onUpdatedValue,
}: YamlViewerProps) => {
  loader.config({ monaco });

  const handleUpdatedValue = (yaml?: string): void => {
    if (onUpdatedValue && yaml) {
      onUpdatedValue(yaml);
    }
  };

  const sharedEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions =
    {
      minimap: { enabled: false },
      readOnly: !allowEdit,
      scrollBeyondLastLine: false,
    };

  if (showDiff) {
    return (
      <DiffEditor
        language="yaml"
        original={original ?? ''}
        modified={value}
        options={{
          renderSideBySide: false,
          ...sharedEditorOptions,
        }}
      />
    );
  }

  return (
    <Editor
      language="yaml"
      value={value}
      onChange={handleUpdatedValue}
      options={sharedEditorOptions}
    />
  );
};
