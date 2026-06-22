'use client';

import { useEffect } from 'react';

interface SearchDebounceProps {
  query: string;
  onSearch: (q: string) => void;
}

export function SearchDebounce({ query, onSearch }: SearchDebounceProps) {
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query, onSearch]);

  return null;
}
