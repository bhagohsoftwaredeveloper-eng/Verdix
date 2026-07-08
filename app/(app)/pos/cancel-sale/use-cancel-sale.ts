'use client';

import { useState, useEffect } from 'react';

type Options = {
  isOpen: boolean;
  selectedItem: any | null;
};

export function useCancelSale({ isOpen, selectedItem }: Options) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen && selectedItem) setQuantity(1);
  }, [isOpen, selectedItem]);

  const handleIncrement = () => {
    if (selectedItem && quantity < selectedItem.quantity) setQuantity(q => q + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(q => q - 1);
  };

  const handleQuantityChange = (val: number) => {
    if (val > 0 && val <= (selectedItem?.quantity || 1)) setQuantity(val);
  };

  return { quantity, setQuantity, handleIncrement, handleDecrement, handleQuantityChange };
}
