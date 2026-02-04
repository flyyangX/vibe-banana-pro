import { useState } from 'react';

export function useAsyncAction<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (action: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await action();
      setData(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, execute, setError };
}
