export const NAVIGATION_COMPONENT_EXACT_OPTIONS = {
  paths: 'exact',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
} as const;

export const NAVIGATION_COMPONENT_QUERY_OPTIONS = {
  ...NAVIGATION_COMPONENT_EXACT_OPTIONS,
  queryParams: 'subset',
} as const;
