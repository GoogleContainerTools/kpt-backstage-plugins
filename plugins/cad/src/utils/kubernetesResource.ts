import { KubernetesResource } from '../types/KubernetesResource';

export const removeInternalKptAnnotations = (
  resource: KubernetesResource,
): void => {
  const resourceMetadata = resource.metadata;

  if (resourceMetadata.annotations) {
    const internalAnnotations = Object.keys(
      resourceMetadata.annotations,
    ).filter(annotation => annotation.startsWith('internal.kpt.dev/'));

    internalAnnotations.forEach(
      internalAnnotation =>
        delete resourceMetadata.annotations?.[internalAnnotation],
    );

    if (Object.keys(resourceMetadata.annotations).length === 0) {
      delete resourceMetadata.annotations;
    }
  }
};
