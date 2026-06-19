'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { AddProductFormController } from './use-add-product-form';

const AddProductFormContext = createContext<AddProductFormController | null>(null);

export function AddProductFormProvider({
  controller,
  children,
}: {
  controller: AddProductFormController;
  children: ReactNode;
}) {
  return (
    <AddProductFormContext.Provider value={controller}>
      {children}
    </AddProductFormContext.Provider>
  );
}

export function useAddProductFormContext(): AddProductFormController {
  const context = useContext(AddProductFormContext);
  if (!context) {
    throw new Error('useAddProductFormContext must be used within an AddProductFormProvider');
  }
  return context;
}
