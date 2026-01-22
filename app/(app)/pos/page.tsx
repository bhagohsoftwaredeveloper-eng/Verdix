
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
  ShoppingCart,
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
import { XReadingDialog } from './x-reading-dialog';

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
  
  // Shift Management State
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  // Show X-Reading report after shift end
  const [showEndShiftReport, setShowEndShiftReport] = useState(false);
  const [lastEndedShiftId, setLastEndedShiftId] = useState<string | null>(null);

  // Terminal State
  const [terminals, setTerminals] = useState<any[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');

  const { toast } = useToast();
  
  // Persist shift ID
  useEffect(() => {
      const storedShiftId = localStorage.getItem('pos_current_shift_id');
      if (storedShiftId) {
          setCurrentShiftId(storedShiftId);
          setShiftActive(true);
          // Ideally fetch shift details here to verify active status
      }
  }, []);

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

    // Fetch Terminals
    const fetchTerminals = async () => {
      try {
        const response = await fetch('/api/pos-terminals?activeOnly=true');
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setTerminals(result.data);
          
          // Try to get stored terminal ID
          const storedTerminalId = localStorage.getItem('pos_terminal_id');
          const isValidStored = result.data.some((t: any) => t.id === storedTerminalId);
          
          if (storedTerminalId && isValidStored) {
            setSelectedTerminalId(storedTerminalId);
          } else {
            // Default to first terminal
            const defaultTerminalId = result.data[0].id;
            setSelectedTerminalId(defaultTerminalId);
            localStorage.setItem('pos_terminal_id', defaultTerminalId);
          }
        }
      } catch (error) {
        console.error('Error fetching terminals:', error);
      }
    };
    fetchTerminals();
  }, []);

  const currentTerminalName = useMemo(() => {
    const t = terminals.find(t => t.id === selectedTerminalId);
    return t ? t.terminalDescription : '';
  }, [terminals, selectedTerminalId]);

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

      if (e.ctrlKey) {
        switch (e.key) {
          case '1': e.preventDefault(); setIsEndShiftOpen(true); break;
          case '2': e.preventDefault(); setIsCashTransferOpen(true); break;
          case '3': e.preventDefault(); setIsCustomerSelectOpen(true); break;
          case '4': e.preventDefault(); handleOpenLoyalty(); break;
          case '5': e.preventDefault(); setIsRecentSalesOpen(true); break;
          case '6': e.preventDefault(); setIsVoidSalesOpen(true); break;
          case '7': e.preventDefault(); setIsReturnSalesOpen(true); break;
          case '0': e.preventDefault(); setIsZReadingOpen(true); break;
        }
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

  const handleStartShift = async (cash: number) => {
    if (!currentUser) { // Should check currentUser, setIsPosLoggedIn handles UI
        toast({ title: "Error", description: "User not logged in", variant: "destructive" });
        return;
    }

     try {
         if (!selectedTerminalId) {
             toast({ title: "Error", description: "No POS Terminal selected. Please configure a terminal.", variant: "destructive" });
             return;
         }

         const response = await fetch('/api/pos/shifts', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 userId: currentUser.uid || currentUser.id,
                 terminalId: selectedTerminalId,
                 startingCash: cash
             })
         });
        
        const result = await response.json();
        
        if (result.success) {
            setStartingCash(cash);
            setCashSales(0);
            setShiftActive(true);
            setCurrentShiftId(result.data.shiftId);
            localStorage.setItem('pos_current_shift_id', result.data.shiftId);
            toast({ title: "Shift Started", description: "You are now ready to make sales." });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        console.error("Start shift error:", error);
        toast({ title: "Error", description: "Failed to start shift: " + error.message, variant: "destructive" });
    }
  };

  const handleEndShift = async () => {
    // This is called by EndShiftDialog AFTER user confirms and calculations are done
    // However, EndShiftDialog doesn't pass the calculated values back via onShiftEnd prop (it's void).
    // We need to modify EndShiftDialog to pass back the data, OR handle the API call inside EndShiftDialog.
    // Given the current structure, EndShiftDialog (lines 116-126) calculates variance but doesn't pass it up.
    // I will refactor EndShiftDialog to pass the data, then handle API call here.
    // CAUTION: The current replaced code assumes EndShiftDialog signature change.
    // See next step for EndShiftDialog update.
  }
  
  // Redefining handleEndShift with expected signature, I'll update the Dialog next.
  const handleConfirmEndShift = async (data: { actualCash: number; cashDifference: number; notes: string; cashDenominations: any[] }) => {
      if (!currentShiftId) {
          toast({ title: "Error", description: "No active shift found", variant: "destructive" });
          return;
      }

      try {
          const response = await fetch('/api/pos/shifts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  shiftId: currentShiftId,
                  actualCash: data.actualCash,
                  cashDifference: data.cashDifference,
                  cashDenominations: data.cashDenominations, // Add this line
                  notes: data.notes
              })
          });

          const result = await response.json();
          
          if (result.success) {
              setLastEndedShiftId(currentShiftId);
              localStorage.removeItem('pos_current_shift_id');
              setCurrentShiftId(null);
              
              setIsEndShiftOpen(false);
              setShiftActive(false);
              setIsPosLoggedIn(false); 
              setItems([]);
              setHeldTransactions([]);
              setSelectedCustomer(WALK_IN_CUSTOMER);
              
              // Trigger X-Reading Report
              setShowEndShiftReport(true);
              
              toast({ title: "Shift Ended", description: "Shift closed successfully." });
          } else {
              throw new Error(result.error);
          }
      } catch (error: any) {
           console.error("End shift error:", error);
           toast({ title: "Error", description: "Failed to end shift: " + error.message, variant: "destructive" });
      }
  };

  const handlePosLoginSuccess = (user: any) => {
    setIsPosLoggedIn(true);
    setCurrentUser(user);
    // Determine if shift is already active based on localStorage? 
    // Usually we would fetch "active shift for user" from backend here.
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
    { icon: Printer, label: 'Cash count', shortcut: 'Ctrl+1', action: () => setIsEndShiftOpen(true) },
    { icon: CurrencyIcon, label: 'Cash transfer', shortcut: 'Ctrl+2', action: () => setIsCashTransferOpen(true) },
    { icon: User, label: 'Customer', shortcut: 'Ctrl+3', action: () => setIsCustomerSelectOpen(true) },
    { icon: Star, label: 'Loyalty', shortcut: 'Ctrl+4', action: handleOpenLoyalty },
    { icon: Clock, label: 'Recent Sales', shortcut: 'Ctrl+5', action: () => setIsRecentSalesOpen(true) },
    { icon: Ban, label: 'Void Sales', shortcut: 'Ctrl+6', action: () => setIsVoidSalesOpen(true) },
    { icon: Undo, label: 'Return Sales', shortcut: 'Ctrl+7', action: () => setIsReturnSalesOpen(true) },
    { icon: BookOpen, label: 'Z-READING', shortcut: 'Ctrl+0', action: () => setIsZReadingOpen(true) },
    { icon: Search, label: 'Price Inquiry', action: () => setIsPriceInquiryOpen(true) },
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
      <div className="flex h-screen w-screen bg-muted/30 font-sans overflow-hidden">
        {/* Left Section: Main Transaction Area */}
        <div className="flex-1 flex flex-col relative min-w-0">
          {showOverlay && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md z-20 flex items-center justify-center p-8">
                <div className="max-w-md text-center space-y-4 animate-fade-in">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">POS Locked</h1>
                    <p className="text-muted-foreground">Please log in and start a shift to continue.</p>
                </div>
            </div>
          )}
          
          {/* Header Bar */}
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4 justify-between shrink-0 z-10">
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient-x flex-1">
                {headerActions.map(({ icon: Icon, label, fKey, action }) => (
                  <Button 
                    key={label} 
                    variant="ghost" 
                    size="sm"
                    className="flex flex-col gap-0.5 h-12 min-w-[4.5rem] px-2 hover:bg-muted/80 transition-all font-normal" 
                    onClick={action}
                  >
                    <Icon className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] leading-none font-medium">{label}</span>
                    <span className="text-[9px] text-muted-foreground leading-none font-mono opacity-70">{fKey}</span>
                    {label === 'Hold Trans' && heldTransactions.length > 0 && (
                      <span className="absolute top-1 right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white">
                        {heldTransactions.length}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center gap-2 border-l pl-4 ml-2 shrink-0">
                 <div className="text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground font-medium">{currentTerminalName || 'No Terminal'}</div>
                    <div className="text-[10px] text-muted-foreground/70">{currentTime}</div>
                 </div>
                 <div className={`h-2 w-2 rounded-full ${shiftActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
              </div>
          </header>

          {/* Product Entry & List */}
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
             
             {/* Customer & Search Bar */}
             <div className="flex gap-3 shrink-0 z-0">
                <div className="relative flex-1 group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                     <Search className="w-4 h-4" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Scan Barcode or Enter Product SKU (Enter)"
                    className="pl-9 h-12 text-lg bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItemBySKU(inputValue)}
                    autoFocus
                  />
                  <ProductSearchDialog onSelectProduct={handleAddItem}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      <span className="text-xs mr-1">Search</span>
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">F3</kbd>
                    </Button>
                  </ProductSearchDialog>
                </div>

                <div className="flex items-center gap-2 bg-background border border-muted-foreground/20 rounded-md px-3 h-12 shadow-sm min-w-[200px]">
                    <User className="h-4 w-4 text-primary" />
                    <div className="flex-1 overflow-hidden">
                        <div className="text-xs text-muted-foreground">Customer</div>
                        <div className="text-sm font-medium truncate">{selectedCustomer?.name || 'Walk-in'}</div>
                    </div>
                    {selectedCustomer?.id !== 'walk-in' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={() => setSelectedCustomer(WALK_IN_CUSTOMER)}>
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
             </div>

             {/* Items Table */}
             <div className="flex-1 bg-background rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-y-auto flex-1">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur z-10 shadow-sm">
                      <TableRow className="hover:bg-transparent border-b-border/50">
                        <TableHead className="w-10 pl-4"></TableHead>
                        <TableHead className="w-[40%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</TableHead>
                        <TableHead className="text-center w-32 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                                        <ShoppingCart className="w-12 h-12 mb-2" />
                                        <p className="text-lg font-medium">Cart is empty</p>
                                        <p className="text-sm">Scan items or search to start sale</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow 
                                    key={item.id} 
                                    className={`
                                        cursor-pointer transition-colors border-b-border/40 last:border-0
                                        ${selectedItemId === item.id ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}
                                    `}
                                    onClick={() => setSelectedItemId(item.id)}
                                >
                                    <TableCell className="pl-4">
                                        <div className={`w-2 h-2 rounded-full ${selectedItemId === item.id ? 'bg-primary' : 'bg-transparent border border-muted-foreground/30'}`} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{item.name}</span>
                                            {item.discount > 0 && <span className="text-[10px] text-green-600 font-medium">Discount: {item.discount}%</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <div className="flex items-center justify-center gap-1 h-full">
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted" 
                                                onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity - 1); }}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center font-mono text-sm font-medium">{item.quantity}</span>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted" 
                                                onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity + 1); }}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-medium">
                                         ₱{(item.price * item.quantity * (1 - item.discount / 100)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors" 
                                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Summary Strip */}
                <div className="border-t bg-muted/20 p-3 grid grid-cols-4 gap-4 text-xs text-muted-foreground">
                    <div>
                        <span className="block opacity-70">Total Items</span>
                        <span className="font-mono font-medium text-foreground">{numberOfItems}</span>
                    </div>
                    <div>
                        <span className="block opacity-70">Subtotal</span>
                         <span className="font-mono font-medium text-foreground">₱{subTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                         <span className="block opacity-70">VAT Sales</span>
                         <span className="font-mono font-medium text-foreground">₱{vatSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                        <span className="block opacity-70">VAT Amount</span>
                        <span className="font-mono font-medium text-foreground">₱{vatAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
             </div>
             
             {/* Footer Actions */}
            <div className="grid grid-cols-9 gap-2 shrink-0 h-16">
                {footerActions.map(({ icon: Icon, label, shortcut, action }) => (
                    <Button
                        key={label}
                        variant="secondary"
                        onClick={action}
                        className={`
                            flex flex-col items-center justify-center gap-1 h-full text-xs font-medium border transition-all hover:-translate-y-0.5
                            ${matteGreenButtons.includes(label) ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' : ''}
                            ${matteBlueButtons.includes(label) ? 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200' : ''}
                            ${matteYellowButtons.includes(label) ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200' : ''}
                            ${mattePurpleButtons.includes(label) ? 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200' : ''}
                            ${!matteGreenButtons.includes(label) && !matteBlueButtons.includes(label) && !matteYellowButtons.includes(label) && !mattePurpleButtons.includes(label) ? 'bg-background hover:bg-muted' : ''}
                        `}
                    >
                        <Icon className="w-5 h-5 opacity-80" />
                        <span className="leading-tight text-center px-1">{label}</span>
                        {shortcut && <span className="text-[9px] text-muted-foreground/70 font-mono">{shortcut}</span>}
                    </Button>
                ))}
            </div>

          </div>
        </div>

        {/* Right Section: Totals & Payments */}
        <div className="w-96 bg-background border-l shadow-2xl z-20 flex flex-col h-full">
            {/* Cashier Profile */}
            <div className="p-6 border-b flex flex-col items-center gap-2 bg-muted/10">
                 <Logo className="size-10 text-primary mb-2" />
                 <div className="text-center">
                    <h2 className="font-bold text-lg leading-none">{currentUser?.displayName || 'Cashier Terminal'}</h2>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{currentTerminalName}</p>
                 </div>
            </div>

            {/* Big Total */}
            <div className="flex-1 flex flex-col p-6 gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                
                <div className="space-y-2 text-center z-10">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total Amount Due</span>
                    <div className="flex items-start justify-center text-7xl font-bold tracking-tighter text-primary">
                        <span className="text-2xl mt-2 mr-1">₱</span>
                        {totalDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-3">
                     <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Payment Method</p>
                     <div className="grid grid-cols-2 gap-3">
                        {paymentOptions.slice(0, 4).map((option) => (
                            <Button
                                key={option.value}
                                variant="outline"
                                onClick={() => handleOpenTender(option.label)}
                                disabled={items.length === 0}
                                className="h-16 flex flex-col items-center justify-center gap-1 border-muted-foreground/20 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                            >
                                <span className="font-semibold">{option.label}</span>
                            </Button>
                        ))}
                     </div>
                      <Button
                        variant="outline"
                         onClick={() => handleOpenTender('POINTS')}
                         disabled={items.length === 0}
                         className="h-12 border-muted-foreground/20 text-muted-foreground hover:text-primary"
                      >
                         Points / Other
                      </Button>
                </div>
            </div>

            {/* Tender Button */}
            <div className="p-6 bg-muted/10 border-t">
                <Button 
                    size="lg" 
                    className="w-full h-20 text-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all rounded-xl"
                    onClick={() => handleOpenTender('CASH')}
                    disabled={items.length === 0}
                >
                    <span className="flex-1 text-left pl-4">TENDER</span>
                    <div className="bg-white/20 rounded-lg p-2 mr-2">
                        <ChevronRight className="w-8 h-8" />
                    </div>
                </Button>
            </div>
        </div>
      </div>

      {!isPosLoggedIn && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
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
        shiftId={currentShiftId}
        terminalId={selectedTerminalId}
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
        onShiftEnd={handleConfirmEndShift}
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
      
      <XReadingDialog 
        isOpen={showEndShiftReport} 
        onOpenChange={setShowEndShiftReport}
        shiftId={lastEndedShiftId}
        autoShow={true}
      />
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
