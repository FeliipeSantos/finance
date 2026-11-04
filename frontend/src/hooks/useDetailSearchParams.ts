import { useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import type { SetURLSearchParams } from 'react-router-dom';

// Filters replace the detail URL while retaining the screen underneath it.
export function useDetailSearchParams(): ReturnType<typeof useSearchParams> {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const update: SetURLSearchParams = useCallback((next, options) => setParams(next, {
    ...options,
    state: options?.state ?? location.state,
  }), [setParams, location.state]);
  return [params, update];
}
