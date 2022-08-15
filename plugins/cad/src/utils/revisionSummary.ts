import { PackageRevision } from '../types/PackageRevision';
import { PackageRevisionResourcesMap } from '../types/PackageRevisionResource';

export type RevisionSummary = {
  revision: PackageRevision;
  resourcesMap: PackageRevisionResourcesMap;
};

export const getRevisionSummary = (
  revision: PackageRevision,
  resourcesMap: PackageRevisionResourcesMap,
): RevisionSummary => {
  const revisionSummary: RevisionSummary = {
    revision,
    resourcesMap,
  };

  return revisionSummary;
};
