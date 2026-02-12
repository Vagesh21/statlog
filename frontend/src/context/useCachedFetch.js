import { useCallback, useRef } from 'react';

export default function useCachedFetch() {
  const lastPayloadRef = useRef(new Map());

  const get = useCallback(async (key, fetcher) => {
    const prev = lastPayloadRef.current.get(key);
    const next = await fetcher();
    if (next && JSON.stringify(next) === JSON.stringify(prev)) {
      return prev;
    }
    lastPayloadRef.current.set(key, next);
    return next;
  }, []);

  return { get };
}
