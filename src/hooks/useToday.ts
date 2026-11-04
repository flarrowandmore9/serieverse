import { useEffect, useState } from 'react';
import { toIsoDate } from '@/lib/format';

export function useToday(): string {
  const [today, setToday] = useState(() => toIsoDate(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = toIsoDate(new Date());
      setToday((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return today;
}
