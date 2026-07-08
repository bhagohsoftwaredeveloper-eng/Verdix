'use client';

import { useState, useEffect, useCallback } from 'react';

type Options = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (note: string) => void;
};

export function useSuspendNote({ isOpen, onOpenChange, onConfirm }: Options) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote('');
    }
  }, [isOpen]);

  const handleConfirm = useCallback(() => {
    onConfirm(note.trim());
  }, [note, onConfirm]);

  return {
    note,
    setNote,
    handleConfirm,
  };
}
