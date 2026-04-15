'use client';

import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

export function WindowControls() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron and if it's frameless
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      if ((window as any).electronAPI.isFrameless()) {
        setIsElectron(true);
      }
    }
  }, []);

  if (!isElectron) return null;

  const handleMinimize = () => {
    (window as any).electronAPI.minimize();
  };

  const handleMaximize = () => {
    (window as any).electronAPI.maximize();
  };

  const handleClose = () => {
    (window as any).electronAPI.close();
  };

  return (
    <div className="flex items-center h-full window-no-drag">
      <button
        onClick={handleMinimize}
        className="flex items-center justify-center w-10 h-10 transition-colors hover:bg-muted/80 focus:outline-none"
        title="Minimize"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={handleMaximize}
        className="flex items-center justify-center w-10 h-10 transition-colors hover:bg-muted/80 focus:outline-none"
        title="Maximize"
      >
        <Square className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleClose}
        className="flex items-center justify-center w-10 h-10 transition-colors hover:bg-destructive hover:text-destructive-foreground focus:outline-none"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
