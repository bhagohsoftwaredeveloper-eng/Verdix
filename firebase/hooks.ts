import { useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useDocument } from 'react-firebase-hooks/firestore';

// Firebase-specific memo hook
export const useMemoFirebase = (fn: () => any, deps: any[]) => {
  return useMemo(fn, deps);
};

export { useCollection };
export { useDocument as useFirestore };

export type UseCollectionResult = {
  data: any;
  loading: boolean;
  error: any;
};
