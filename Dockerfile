# Copyright 2022 Google LLC
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

# Stage 1 - Create yarn install skeleton layer
FROM node:16-bullseye-slim AS packages

WORKDIR /app
COPY package.json yarn.lock ./

COPY packages packages
COPY plugins plugins

RUN find packages \! -name "package.json" -mindepth 2 -maxdepth 2 -exec rm -rf {} \+


# Stage 2 - Install dependencies and build packages
FROM node:16-bullseye-slim AS build

WORKDIR /app
COPY --from=packages /app .

# Install sqlite3 dependencies (required for the Backstage application)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libsqlite3-dev python3 build-essential && \
    yarn config set python /usr/bin/python3

RUN yarn install --frozen-lockfile --network-timeout 600000 && rm -rf "$(yarn cache dir)"

COPY . .

RUN yarn tsc
RUN yarn --cwd packages/backend build


# Stage 3 - Build the base image
FROM node:16-bullseye-slim as base-backstage-app

WORKDIR /app

# Install sqlite3 dependencies (required for the Backstage application)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libsqlite3-dev python3 build-essential && \
    rm -rf /var/lib/apt/lists/* && \
    yarn config set python /usr/bin/python3

# Copy the install dependencies from the build stage and context
COPY --from=build /app/yarn.lock /app/package.json /app/packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN yarn install --frozen-lockfile --production --network-timeout 600000 && rm -rf "$(yarn cache dir)"

# Copy the built packages from the build stage
COPY --from=build /app/packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz


# Stage 4 - Build the actual Backstage image that can be deployed to an environment
FROM base-backstage-app as backstage-app

# Copy any other files that we need at runtime
COPY app-config.yaml app-config.kubernetes.yaml ./

# Set defaults
ENV NODE_ENV=development
ENV CAD_GITOPS_DELIVERY_TOOL=config-sync
ENV CAD_RESOURCES_NAMESPACE=default
ENV CAD_AUTH_PROVDER=google

ENTRYPOINT ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.kubernetes.yaml"]
