import { useCallback, useEffect, useState } from 'react';

type AsyncData<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[]): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar la información. Inténtalo de nuevo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // The caller controls when to reload via deps; the loader is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { data, error, loading, reload };
}
