
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Power,
  X,
  Plus,
  Minus,
  Percent,
  Tag,
  Pencil,
  ListOrdered,
  User,
  Star,
  Clock,
  Ban,
  Undo,
  BookOpen,
  Ticket,
  Printer,
  ChevronRight,
  Trash2,
  Search,
} from 'lucide-react';
import type { Product, Customer } from '@/lib/types';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { TenderDialog } from './tender-dialog';
import { ProductSearchDialog } from './product-search-dialog';
import { EditItemDialog } from './edit-item-dialog';
import { HeldTransactionsDialog } from './held-transactions-dialog';
import { AdjustQuantityDialog } from './adjust-quantity-dialog';
import { StartShiftDialog } from './start-shift-dialog';
import { PosLoginForm } from './login-form';
import { AdminAuthDialog } from './admin-auth-dialog';
import { EndShiftDialog } from './end-shift-dialog';
import { CashTransferDialog } from './cash-transfer-dialog';
import { SelectCustomerDialog, WALK_IN_CUSTOMER } from './select-customer-dialog';
import { LoyaltyRewardsDialog } from './loyalty-rewards-dialog';
import { RecentSalesDialog } from './recent-sales-dialog';
import { VoidSalesDialog } from './void-sales-dialog';
import { ReturnSalesDialog } from './return-sales-dialog';
import { PriceInquiryDialog } from './price-inquiry-dialog';
import { ZReadingDialog } from './z-reading-dialog';

import { CancelSaleDialog } from './cancel-sale-dialog';
import { DiscountDialog } from './discount-dialog';
import { ShutdownConfirmationDialog } from './shutdown-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { InsufficientStockDialog } from './insufficient-stock-dialog';


const MOCK_PRODUCTS: Product[] = [
  {
    id: 'parent_1',
    name: 'Wireless Keyboard - Container',
    description: 'A sleek, modern wireless keyboard.',
    category: 'Electronics',
    brand: 'Logitech',
    stock: 144,
    reorderPoint: 20,
    avgDailySales: 5,
    price: 75.0,
    cost: 50.0,
    sku: 'WK-001-PARENT',
    imageUrl: 'https://picsum.photos/seed/keyboard/400/300',
    imageHint: 'wireless keyboard',
    unitOfMeasure: 'Piece',
    conversionFactor: 1,
    priceLevels: [],
  },
  {
    id: 'child_1_1',
    name: 'Wireless Keyboard (Piece)',
    parentId: 'parent_1',
    description: 'A single wireless keyboard.',
    category: 'Electronics',
    brand: 'Logitech',
    stock: 120,
    reorderPoint: 20,
    avgDailySales: 5,
    price: 75.0,
    cost: 50.0,
    sku: 'WK-001-P',
    imageUrl: 'https://picsum.photos/seed/keyboard/400/300',
    imageHint: 'wireless keyboard',
    unitOfMeasure: 'Piece',
    conversionFactor: 1,
    priceLevels: [],
  },
  {
    id: 'child_1_2',
    name: 'Wireless Keyboard (Box of 5)',
    parentId: 'parent_1',
    description: 'A box containing 5 wireless keyboards.',
    category: 'Electronics',
    brand: 'Logitech',
    stock: 24,
    reorderPoint: 4,
    avgDailySales: 1,
    price: 350.0,
    cost: 240.0,
    sku: 'WK-001-B5',
    imageUrl: 'https://picsum.photos/seed/keyboard/400/300',
    imageHint: 'keyboard box',
    unitOfMeasure: 'Box',
    conversionFactor: 5,
    priceLevels: [],
  },
  {
    id: 'parent_2',
    name: 'Ergonomic Mouse',
    description: 'An ergonomic wireless mouse for all-day comfort.',
    category: 'Electronics',
    brand: 'Microsoft',
    stock: 0,
    reorderPoint: 15,
    avgDailySales: 8,
    price: 45.0,
    cost: 30.0,
    sku: 'EM-002-P',
    imageUrl: 'https://picsum.photos/seed/mouse/400/300',
    imageHint: 'ergonomic mouse',
    unitOfMeasure: 'Piece',
    conversionFactor: 1,
    priceLevels: [],
  },
  {
    id: 'parent_3',
    name: '4K UHD Monitor',
    description: 'A 27-inch 4K UHD monitor with vibrant colors.',
    category: 'Electronics',
    brand: 'Dell',
    stock: 45,
    reorderPoint: 10,
    avgDailySales: 2,
    price: 350.0,
    cost: 280.0,
    sku: '4KM-003-U',
    imageUrl: 'https://picsum.photos/seed/monitor/400/300',
    imageHint: 'computer monitor',
    unitOfMeasure: 'Unit',
    conversionFactor: 1,
    priceLevels: [],
  },
];


export type SaleItem = Product & { quantity: number; discount: number; name: string; };

const initialItems: SaleItem[] = [];

function CurrencyIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M10 18v-4H6.816c-.422 0-.645-.24-.868-.617c-.223-.377-.28-.702-.28-1.383V7H4V5h4v4h3.184c.422 0 .645.24.868.617c-.223-.377-.28.702-.28 1.383v.831c0 .68-.057 1.006-.28 1.383c-.223.377-.446.617-.868.617H12v4zm2-6.831c0-.491.062-.83.184-1.018c.123-.188.31-.35.564-.515c.254-.166.52-.28.802-.344V7h2V5h-4v3.831c.491.062.83.184 1.018.366c.188.182.35.436.515.762c.166.326.28.675.344 1.047h2v2h-2c-.062.372-.184.72-.366 1.047c-.326-.182-.58-.436-.762-.762c-.182-.326-.304-.675-.366-1.047z" /></svg>
}

export default function POSPage() {
  const [currentTime, setCurrentTime] = useState('');
  const [items, setItems] = useState<SaleItem[]>(initialItems);
  const [inputValue, setInputValue] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isTenderDialogOpen, setIsTenderDialogOpen] = useState(false);
  const [tenderMethod, setTenderMethod] = useState<string | null>(null);
  const [heldTransactions, setHeldTransactions] = useState<SaleItem[][]>([]);
  const [shiftActive, setShiftActive] = useState(false);
  const [startingCash, setStartingCash] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [isPosLoggedIn, setIsPosLoggedIn] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [editDialogMode, setEditDialogMode] = useState<'full' | 'price-only'>('full');
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(WALK_IN_CUSTOMER);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [isRecentSalesOpen, setIsRecentSalesOpen] = useState(false);
  const [isVoidSalesOpen, setIsVoidSalesOpen] = useState(false);
  const [isReturnSalesOpen, setIsReturnSalesOpen] = useState(false);
  const [isPriceInquiryOpen, setIsPriceInquiryOpen] = useState(false);
  const [isZReadingOpen, setIsZReadingOpen] = useState(false);
  const [isShutdownConfirmOpen, setIsShutdownConfirmOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [priceLevels, setPriceLevels] = useState<any[]>([]);
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<string>('');
  
  const [enableAdvancedInventory, setEnableAdvancedInventory] = useState(false);
  const [isInsufficientStockOpen, setIsInsufficientStockOpen] = useState(false);
  const [insufficientItems, setInsufficientItems] = useState<SaleItem[]>([]);


  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isQuantityDialogOpen, setIsQuantityDialogOpen] = useState(false);
  const [isHeldTransOpen, setIsHeldTransOpen] = useState(false);
  const [isEndShiftOpen, setIsEndShiftOpen] = useState(false);
  const [isCashTransferOpen, setIsCashTransferOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedItem = useMemo(() => {
    return items.find(item => item.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  useEffect(() => {
    // Simulate fetching products
    setProducts(MOCK_PRODUCTS);

    // Fetch price levels
    const fetchPriceLevels = async () => {
      try {
        const levels = await import('../products/actions').then(m => m.getPriceLevels());
        setPriceLevels(levels);
        // Set default price level if exists
        const defaultLevel = levels.find((l: any) => l.isDefault);
        if (defaultLevel) {
          setSelectedPriceLevelId(defaultLevel.id);
        }
      } catch (error) {
        console.error('Error fetching price levels:', error);
      }
    };
    fetchPriceLevels();
    
    // Fetch POS settings
    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/pos-settings');
            const result = await response.json();
            if (result.success) {
                setEnableAdvancedInventory(result.data.enableAdvancedInventory);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default function key actions if needed
      if (e.key.startsWith('F')) {
        // e.preventDefault(); // Un-comment if you want to block F1 (Help), F3 (Search), etc.
      }

      switch (e.key) {
        case 'F1': handleOpenEditDialog(); break;
        case 'F2': setIsCancelDialogOpen(true); break;
        case 'F3': handleOpenDiscountDialog(); break;
        case 'F4': handleHold(); break;
        case 'F5': setIsHeldTransOpen(true); break;
        case 'F6': handleOpenQuantityDialog(); break;
        case 'F7': handleRequestPriceEdit(); break;
        case 'F8': setIsShutdownConfirmOpen(true); break;
        // Payment method shortcuts
        case 'F9': handleOpenTender('CASH'); break;
        case 'F10': handleOpenTender('CREDIT_CARD'); break;
        case 'F11': handleOpenTender('E_WALLET'); break;
        case 'F12': handleOpenTender('POINTS'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedItemId, heldTransactions]); // Dependencies for relevant state

  // Update item prices when price level changes
  useEffect(() => {
    if (items.length === 0 || !selectedPriceLevelId) return;

    const updatedItems = items.map(item => {
      let newPrice = item.price;
      // Try to find override for this level
      if ((item as any).priceLevels) {
        const override = (item as any).priceLevels.find((pl: any) => pl.levelId === selectedPriceLevelId);
        if (override) {
          newPrice = override.price;
        }
      }
      return { ...item, price: newPrice };
    });

    // Check if anything actually changed to avoid infinite loop or unnecessary updates
    const hasChanged = JSON.stringify(items.map(i => i.price)) !== JSON.stringify(updatedItems.map(i => i.price));
    if (hasChanged) {
      setItems(updatedItems);
    }
  }, [selectedPriceLevelId, items]);

  const handleAddItem = (product: Product | undefined) => {
    if (product) {
      const existingItem = items.find((item) => item.id === product.id);
      if (existingItem) {
        updateQuantity(product.id, existingItem.quantity + 1);
      } else {
        // Calculate price based on selected price level
        let itemPrice = product.price;
        if (selectedPriceLevelId && product.priceLevels) {
          const override = product.priceLevels.find((pl: any) => pl.levelId === selectedPriceLevelId);
          if (override) {
            itemPrice = override.price;
          }
        }

        const newItem: SaleItem = { ...product, quantity: 1, discount: 0, name: product.name, price: itemPrice };
        setItems([...items, newItem]);
        setSelectedItemId(newItem.id); // Select the new item
      }
    } else {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
    }
    setInputValue('');
  };

  const handleAddItemBySKU = (sku: string) => {
    if (!sku) return;
    const product = products?.find((p) => p.sku === sku);
    handleAddItem(product);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      setItems(items.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const handleUpdateItem = (itemId: string, newName: string, newQuantity: number, newPrice: number, newDiscount: number) => {
    setItems(items.map(item =>
      item.id === itemId
        ? { ...item, name: newName, quantity: newQuantity, price: newPrice, discount: newDiscount }
        : item
    ));
  };

  const handleCancelSale = () => {
    if (items.length > 0) {
      setIsCancelDialogOpen(true);
    } else {
      toast({
        title: "Cart Empty",
        description: "There are no items to cancel.",
      });
    }
  };

  const handleCancelSelected = () => {
    if (selectedItemId) {
      removeItem(selectedItemId);
      setSelectedItemId(null);
      toast({
        title: "Item Removed",
        description: "The selected item has been removed from the cart.",
      });
    }
  };

  const handleCancelAll = () => {
    setItems([]);
    setSelectedItemId(null);
    setSelectedCustomer(WALK_IN_CUSTOMER);
    toast({
      title: "Transaction Cleared",
      description: "All items have been removed from the cart.",
    });
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.id !== productId));
  };

  const handleSuccessfulSale = (paymentMethod: string, amount: number) => {
    if (paymentMethod.toUpperCase() === 'CASH') {
      setCashSales(prev => prev + amount);
    }
    setItems([]);
    setSelectedCustomer(WALK_IN_CUSTOMER);
  };

  const handleOpenTender = (method: string) => {
    if (items.length > 0) {
      if (!enableAdvancedInventory) {
        const lowStockItems = items.filter(item => item.quantity > item.stock);
        if (lowStockItems.length > 0) {
            setInsufficientItems(lowStockItems);
            setIsInsufficientStockOpen(true);
            return;
        }
      }
      
      setTenderMethod(method);
      setIsTenderDialogOpen(true);
    }
  };

  const handleOpenEditDialog = () => {
    if (selectedItem) {
      setEditDialogMode('full');
      setIsEditItemOpen(true);
    } else {
      toast({
        title: "No Item Selected",
        description: "Please select an item to edit.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDiscountDialog = () => {
    if (selectedItem) {
      setIsDiscountDialogOpen(true);
    } else {
      toast({
        title: "No Item Selected",
        description: "Please select an item to apply a discount.",
        variant: "destructive",
      });
    }
  };

  const handleApplyDiscount = (itemId: string | 'ALL', percentage: number) => {
    if (itemId === 'ALL') {
      setItems(items.map(item => ({ ...item, discount: percentage })));
      toast({
        title: "Global Discount Applied",
        description: `Applied ${percentage.toFixed(2)}% discount to all items.`,
      });
    } else {
      setItems(items.map(item =>
        item.id === itemId ? { ...item, discount: percentage } : item
      ));
      toast({
        title: "Discount Applied",
        description: `Discount updated to ${percentage.toFixed(2)}%`,
      });
    }
  };

  const handleOpenQuantityDialog = () => {
    if (selectedItem) {
      setIsQuantityDialogOpen(true);
    } else {
      toast({
        title: "No Item Selected",
        description: "Please select an item to adjust quantity.",
        variant: "destructive",
      });
    }
  };

  const handleHold = () => {
    if (items.length > 0) {
      setHeldTransactions(prev => [...prev, items]);
      setItems([]);
      setSelectedItemId(null);
      setSelectedCustomer(WALK_IN_CUSTOMER);
    } else {
      toast({
        title: "Empty Cart",
        description: "There are no items to hold.",
        variant: "destructive",
      });
    }
  };

  const handleRestore = (index: number) => {
    if (items.length > 0) {
      toast({
        title: "Cart Not Empty",
        description: "Please clear the current cart before restoring a transaction.",
        variant: "destructive",
      });
      return;
    }
    const transactionToRestore = heldTransactions[index];
    setItems(transactionToRestore);
    setHeldTransactions(prev => prev.filter((_, i) => i !== index));
    setIsHeldTransOpen(false);
  };

  const handleDeleteHeld = (index: number) => {
    setHeldTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartShift = (cash: number) => {
    setStartingCash(cash);
    setCashSales(0);
    setShiftActive(true);
  };

  const handleEndShift = () => {
    setIsEndShiftOpen(false);
    setShiftActive(false);
    setIsPosLoggedIn(false); // Log out cashier
    setItems([]);
    setHeldTransactions([]);
    setSelectedCustomer(WALK_IN_CUSTOMER);
  }

  const handlePosLoginSuccess = (user: any) => {
    setIsPosLoggedIn(true);
    setCurrentUser(user);
  }

  const handleLogout = () => {
    // Only log out the user, don't clear transaction
    setIsPosLoggedIn(false);
    setCurrentUser(null);
  }

  const handleShutdown = () => {
    setIsShutdownConfirmOpen(true);
  }

  const handleRequestPriceEdit = () => {
    if (selectedItem) {
      setIsAuthDialogOpen(true);
    } else {
      toast({
        title: "No Item Selected",
        description: "Please select an item to authorize price change.",
        variant: "destructive",
      });
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    setEditDialogMode('price-only');
    setIsEditItemOpen(true); // Open the edit dialog after successful auth
  };

  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer && customer.priceLevelId) {
      setSelectedPriceLevelId(customer.priceLevelId);
    } else {
      // Back to default if walk-in or no level
      const defaultLevel = priceLevels.find(l => l.isDefault);
      if (defaultLevel) {
        setSelectedPriceLevelId(defaultLevel.id);
      }
    }
    setIsCustomerSelectOpen(false);
  }

  const handleOpenLoyalty = () => {
    setIsLoyaltyOpen(true);
  };

  const subTotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const totalDiscount = items.reduce(
    (acc, item) => acc + (item.price * item.quantity * item.discount) / 100,
    0
  );
  const taxableAmount = subTotal - totalDiscount;
  const vatSales = taxableAmount / 1.12;
  const vatAmount = taxableAmount - vatSales;
  const totalDue = taxableAmount;
  const numberOfItems = items.reduce((acc, item) => acc + item.quantity, 0);


  const headerActions = [
    { icon: Pencil, label: 'Edit Item', fKey: 'F1', action: handleOpenEditDialog },
    { icon: X, label: 'Cancel', fKey: 'F2', action: handleCancelSale },
    { icon: Percent, label: 'Discount', fKey: 'F3', action: handleOpenDiscountDialog },
    { icon: Tag, label: 'Hold', fKey: 'F4', action: handleHold },
    { icon: ListOrdered, label: 'Hold Trans', fKey: 'F5', action: () => setIsHeldTransOpen(true) },
    { icon: Plus, label: '+/- quantity', fKey: 'F6', action: handleOpenQuantityDialog },
    { icon: CurrencyIcon, label: 'Edit Price', fKey: 'F7', action: handleRequestPriceEdit },
    { icon: Power, label: 'Shutdown', fKey: 'F8', action: handleShutdown },
  ];

  const footerActions = [
    { icon: Printer, label: 'Cash count', action: () => setIsEndShiftOpen(true) },
    { icon: CurrencyIcon, label: 'Cash transfer', action: () => setIsCashTransferOpen(true) },
    { icon: User, label: 'Customer', action: () => setIsCustomerSelectOpen(true) },
    { icon: Star, label: 'Loyalty', action: handleOpenLoyalty },
    { icon: Clock, label: 'Recent Sales', action: () => setIsRecentSalesOpen(true) },
    { icon: Ban, label: 'Void Sales', action: () => setIsVoidSalesOpen(true) },
    { icon: Undo, label: 'Return Sales', action: () => setIsReturnSalesOpen(true) },
    { icon: BookOpen, label: 'Z-READING', action: () => setIsZReadingOpen(true) },

  ];

  const paymentOptions = [
    { label: 'CASH', value: 'CASH' },
    { label: 'CREDIT CARD', value: 'CREDIT_CARD' },
    { label: 'E-WALLET', value: 'E_WALLET' },
    { label: 'GIFT CHECK', value: 'GIFT_CHECK' },
    { label: 'POINTS', value: 'POINTS' },
  ];

  const matteGreenButtons = ['Cash count', 'Cash transfer'];
  const matteBlueButtons = ['Customer', 'Loyalty'];
  const matteYellowButtons = ['Recent Sales', 'Void Sales', 'Return Sales'];
  const mattePurpleButtons = ['Z-READING', 'Price Inquiry'];

  const showOverlay = !isPosLoggedIn || !shiftActive;

  return (
    <>
      <div className="flex h-screen w-screen bg-slate-50 text-slate-800 font-sans">
        <div className="flex-1 flex flex-col relative">
          {showOverlay && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10" />
          )}
          <div className="flex flex-col flex-1 p-4 gap-4">
            {/* Header */}
            <header className="flex justify-between items-start">
              <div className="flex-1 flex justify-center items-center gap-2">
                {headerActions.map(({ icon: Icon, label, fKey, action }) => (
                  <Button key={label} variant="ghost" className="relative flex flex-col items-center h-auto gap-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all duration-200 hover:scale-105" onClick={action}>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs">{label}</span>
                    <span className="text-xs text-slate-400">{fKey}</span>
                    {label === 'Hold Trans' && heldTransactions.length > 0 && (
                      <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                        {heldTransactions.length}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
              <div className="flex items-center p-2 border-b border-slate-200 gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Scan Barcode or Enter Product SKU"
                    className="bg-slate-50 border-slate-200 pr-10"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItemBySKU(inputValue)}
                  />
                  <ProductSearchDialog onSelectProduct={handleAddItem}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                    >
                      <Search className="h-4 w-4" />
                      <span className="sr-only">Search Products</span>
                    </Button>
                  </ProductSearchDialog>
                </div>
                <Button variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">QTY</Button>
              </div>
              {selectedCustomer && (
                <div className="p-2 border-b bg-blue-50 text-blue-800 flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Customer: {selectedCustomer.name}</span>
                  </div>
                  {selectedCustomer.id !== 'walk-in' && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedCustomer(WALK_IN_CUSTOMER)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="text-slate-500">Description</TableHead>
                      <TableHead className="text-right text-slate-500">Product price</TableHead>
                      <TableHead className="text-center text-slate-500 w-32">Quantity</TableHead>
                      <TableHead className="text-right text-slate-500">Total</TableHead>
                      <TableHead className="text-right text-slate-500">Discount</TableHead>
                      <TableHead className="text-right text-slate-500">Total Due</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="border-slate-100" data-state={selectedItemId === item.id ? 'selected' : ''}>
                        <TableCell>
                          <input type="radio" name="selected-item" className="form-radio h-4 w-4 bg-slate-100 border-slate-300 text-blue-500 focus:ring-blue-500"
                            checked={selectedItemId === item.id}
                            onChange={() => setSelectedItemId(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{item.name}</TableCell>
                        <TableCell className="text-right font-mono text-slate-700">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(item.price)}</TableCell>
                        <TableCell className="text-center font-mono text-slate-700">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                            <span>{item.quantity}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-700">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(item.price * item.quantity)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-700">{item.discount.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-mono text-slate-700">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(item.price * item.quantity * (1 - item.discount / 100))}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/70 hover:text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Summary Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                <div className="grid grid-cols-3 gap-x-8 gap-y-1 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Sub total:</span>
                    <span className="font-mono">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Vat Sales:</span>
                    <span className="font-mono">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(vatSales)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Vat-Exempt sales:</span>
                    <span className="font-mono">₱0.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Sub discount:</span>
                    <span className="font-mono">-₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Vat amount:</span>
                    <span className="font-mono">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Zero-Rated Sales:</span>
                    <span className="font-mono">₱0.00</span>
                  </div>
                  <div className="font-bold flex justify-between text-slate-800">
                    <span>Amount Due:</span>
                    <span className="font-mono">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(totalDue)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Non-vat sales:</span>
                    <span className="font-mono">₱0.00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>No of Items:</span>
                    <span className="font-mono">{numberOfItems}</span>
                  </div>
                </div>
              </div>
            </div>


            {/* Footer actions */}
            <footer className="grid grid-cols-9 gap-2">
              {footerActions.map(({ icon: Icon, label, action }) => (
                <Button
                  key={label}
                  variant="secondary"
                  onClick={action}
                  className={`flex flex-col h-auto gap-1 text-sm transition-colors duration-200 ${matteGreenButtons.includes(label)
                    ? 'bg-green-600 text-green-50 hover:bg-green-700 border-green-700'
                    : matteBlueButtons.includes(label)
                      ? 'bg-blue-600 text-blue-50 hover:bg-blue-700 border-blue-700'
                      : matteYellowButtons.includes(label)
                        ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-600 border-yellow-600'
                        : mattePurpleButtons.includes(label)
                          ? 'bg-purple-600 text-purple-50 hover:bg-purple-700 border-purple-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Button>
              ))}
            </footer>
          </div>
        </div>
        <div className="relative w-96 bg-white p-4 flex flex-col gap-4 border-l border-slate-200">
          {showOverlay && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10" />
          )}
          <div className="text-center mb-2">
            <div className="flex items-baseline justify-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Logo className="size-7 text-primary" />
                <span className="text-xl font-bold text-slate-800">BHAGOH</span>
              </Link>
              <div className="flex items-center gap-2 text-slate-500 text-lg">
                <User className="w-5 h-5" />
                <span>{currentUser?.displayName || 'Cashier'}</span>
              </div>
            </div>
            <div className="text-sm text-slate-500 mt-1">{currentTime}</div>
          </div>
          <div className="p-4 rounded-lg bg-blue-50">
            <div className="flex justify-end text-5xl font-bold text-cyan-600">
              <span className="font-mono">₱{new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(totalDue)}</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-center mb-2 text-slate-700">Payment Method</h3>
            <div className="bg-slate-50 rounded-lg p-4 flex-1 flex flex-col gap-2">
              {paymentOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  className="w-full justify-start text-base bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors duration-200"
                  onClick={() => handleOpenTender(option.label)}
                  disabled={items.length === 0}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-auto">
            <Button
              className="w-full h-24 text-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
              disabled={items.length === 0}
              onClick={() => handleOpenTender('CASH')}
            >
              Tender
              <ChevronRight className="ml-2 w-8 h-8" />
            </Button>
          </div>
        </div>
      </div>

      {!isPosLoggedIn && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <PosLoginForm onLoginSuccess={handlePosLoginSuccess} />
        </div>
      )}

      {isPosLoggedIn && !shiftActive && (
        <StartShiftDialog
          isOpen={isPosLoggedIn && !shiftActive}
          onShiftStart={handleStartShift}
        />
      )}

      <TenderDialog
        isOpen={isTenderDialogOpen}
        onOpenChange={setIsTenderDialogOpen}
        paymentMethod={tenderMethod || ''}
        totalDue={totalDue}
        items={items}
        customer={selectedCustomer}
        currentUser={currentUser}
        onSuccess={handleSuccessfulSale}
      />
      <EditItemDialog
        isOpen={isEditItemOpen}
        onOpenChange={setIsEditItemOpen}
        item={selectedItem}
        onUpdate={handleUpdateItem}
        mode={editDialogMode}
      />
      <AdjustQuantityDialog
        isOpen={isQuantityDialogOpen}
        onOpenChange={setIsQuantityDialogOpen}
        item={selectedItem}
        onUpdate={updateQuantity}
      />
      <CancelSaleDialog
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onCancelSelected={handleCancelSelected}
        onCancelAll={handleCancelAll}
        hasSelectedItem={!!selectedItemId}
      />
      <DiscountDialog
        isOpen={isDiscountDialogOpen}
        onOpenChange={setIsDiscountDialogOpen}
        item={selectedItem}
        onApplyDiscount={handleApplyDiscount}
        hasItems={items.length > 0}
      />
      <HeldTransactionsDialog
        isOpen={isHeldTransOpen}
        onOpenChange={setIsHeldTransOpen}
        heldTransactions={heldTransactions}
        onRestore={handleRestore}
        onDelete={handleDeleteHeld}
      />
      <AdminAuthDialog
        isOpen={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        onSuccess={handleAdminAuthSuccess}
      />
      <EndShiftDialog
        isOpen={isEndShiftOpen}
        onOpenChange={setIsEndShiftOpen}
        startingCash={startingCash}
        cashSales={cashSales}
        onShiftEnd={handleEndShift}
      />
      <CashTransferDialog
        isOpen={isCashTransferOpen}
        onOpenChange={setIsCashTransferOpen}
      />
      <SelectCustomerDialog
        isOpen={isCustomerSelectOpen}
        onOpenChange={setIsCustomerSelectOpen}
        onSelectCustomer={handleSelectCustomer}
      />
      <LoyaltyRewardsDialog 
        isOpen={isLoyaltyOpen} 
        onOpenChange={setIsLoyaltyOpen} 
        customer={selectedCustomer} 
      />
      <RecentSalesDialog isOpen={isRecentSalesOpen} onOpenChange={setIsRecentSalesOpen} />
      <VoidSalesDialog isOpen={isVoidSalesOpen} onOpenChange={setIsVoidSalesOpen} />
      <ReturnSalesDialog isOpen={isReturnSalesOpen} onOpenChange={setIsReturnSalesOpen} />
      <PriceInquiryDialog isOpen={isPriceInquiryOpen} onOpenChange={setIsPriceInquiryOpen} />
      <ZReadingDialog isOpen={isZReadingOpen} onOpenChange={setIsZReadingOpen} />
      <ShutdownConfirmationDialog 
        open={isShutdownConfirmOpen} 
        onOpenChange={setIsShutdownConfirmOpen}
        onConfirm={handleLogout}
      />
      
      <InsufficientStockDialog 
        open={isInsufficientStockOpen} 
        onOpenChange={setIsInsufficientStockOpen}
        items={insufficientItems}
      />

    </>
  );
}
