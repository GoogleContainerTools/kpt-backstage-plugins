#!/bin/bash
# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Exit on error
set -euo pipefail

echo "Verify script prerequisites"
if ! [ -x "$(command -v kubectl)" ]; then
  echo 'Error: kubectl is not installed. Follow https://kubernetes.io/docs/tasks/tools to install kubectl.'
  exit 1
fi

if ! [ -x "$(command -v jq)" ]; then
  echo 'Error: jq is not installed. Follow https://stedolan.github.io/jq to install jq.'
  exit 1
fi

echo "Find latest published release of Porch"
LATEST_PORCH_RELEASE=`curl -s https://api.github.com/repos/GoogleContainerTools/kpt/releases | jq -r '[.[].name | select( . != null ) | select(contains("porch"))][0]'`
PORCH_VERSION=`echo "$LATEST_PORCH_RELEASE" | cut -d/ -f 2`

echo "Download Porch $PORCH_VERSION deployment blueprint"
TMPDIR=`mktemp -d -t porch-XXXXXX`
curl -Lso $TMPDIR/deployment-blueprint.tar.gz https://github.com/GoogleContainerTools/kpt/releases/download/$LATEST_PORCH_RELEASE/deployment-blueprint.tar.gz
tar xzf $TMPDIR/deployment-blueprint.tar.gz --one-top-level=$TMPDIR/porch-install

CLUSTER_NAME=`kubectl config current-context`
echo "Apply Porch resources to cluster $CLUSTER_NAME"
kubectl apply -f $TMPDIR/porch-install 1> /dev/null
kubectl wait deployment --for=condition=Available --timeout=60s -n porch-system porch-server 1> /dev/null
rm -rf $TMPDIR

echo "Porch is installed and ready for use"
