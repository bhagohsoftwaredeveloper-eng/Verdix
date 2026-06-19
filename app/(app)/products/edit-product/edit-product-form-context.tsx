'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { EditProductFormController } from './use-edit-product-form';

const EditProductFormContext = createContext<EditProductFormController | null>(null);

export function EditProductFormProvider({
  controller,
  children,
}: {
  controller: EditProductFormController;
  children: ReactNode;
}) {
  return (
    <EditProductFormContext.Provider value={controller}>
      {children}
    </EditProductFormContext.Provider>
  );
}

export function useEditProductFormContext(): EditProductFormController {
  const context = useContext(EditProductFormContext);
  if (!context) {
    throw new Error('useEditProductFormContext must be used within an EditProductFormProvider');
  }
  return context;
}
