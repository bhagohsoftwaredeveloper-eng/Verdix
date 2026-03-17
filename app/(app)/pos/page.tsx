
'use client';

import { useTheme } from 'next-themes';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import type { Product, Customer } from '@/lib/types';
import Link from 'next/link';

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
import { ThemeToggle } from '@/components/theme-toggle';
import { calculateEffectivePrice } from '@/lib/pricing';
import { getApiUrl } from '@/lib/api-config';


import { SystemSettings } from '@/lib/types';
// ...
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



export type SaleItem = Product & { 
    quantity: number; 
    discount: number; 
    name: string;
    taxType?: 'VAT' | 'NON_VAT' | 'ZERO_RATED' | 'VAT_EXEMPT';
};

const initialItems: SaleItem[] = [];

function CurrencyIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="currentColor" d="M10 18v-4H6.816c-.422 0-.645-.24-.868-.617c-.223-.377-.28-.702-.28-1.383V7H4V5h4v4h3.184c.422 0 .645.24.868.617c-.223-.377-.28.702-.28 1.383v.831c0 .68-.057 1.006-.28 1.383c-.223.377-.446.617-.868.617H12v4zm2-6.831c0-.491.062-.83.184-1.018c.123-.188.31-.35.564-.515c.254-.166.52-.28.802-.344V7h2V5h-4v3.831c.491.062.83.184 1.018.366c.188.182.35.436.515.762c.166.326.28.675.344 1.047h2v2h-2c-.062.372-.184.72-.366 1.047c-.326-.182-.58-.436-.762-.762c-.182-.326-.304-.675-.366-1.047z" /></svg>
}

import { useProducts } from '@/hooks/use-api';

// Shift Management State
// ... (keep imports)

export default function POSPage() {
  // Shift Management State
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);
  // Show X-Reading report after shift end
  const [showEndShiftReport, setShowEndShiftReport] = useState(false);
  const [lastEndedShiftId, setLastEndedShiftId] = useState<string | null>(null);

  // Terminal State
  const [terminals, setTerminals] = useState<any[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const { setTheme } = useTheme();

  useEffect(() => {
     const posTheme = localStorage.getItem('pos-theme');
     // Backup current theme to admin-theme if it's not likely a POS theme artifact?
     // For now, just apply POS theme if exists.
     if (posTheme) {
         setTheme(posTheme);
     }
     
     // On unmount, verify if we need to restore? 
     // For now, let's keep it simple: apply POS theme. 
     // User can change it back in settings if stuck.
     return () => {
         const adminTheme = localStorage.getItem('admin-theme');
         if (adminTheme) {
             setTheme(adminTheme);
         }
     };
  }, []);

  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState('');
  const [items, setItems] = useState<SaleItem[]>(initialItems);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use the hook to fetch real products
  const { products: fetchedProducts, loading: productsLoading, refetch: refreshProducts } = useProducts('', 'Available');
  const [products, setProducts] = useState<Product[]>([]);
  
  // Sync fetched products to local state
  useEffect(() => {
    if (!productsLoading && fetchedProducts) {
        setProducts(fetchedProducts);
    }
  }, [fetchedProducts, productsLoading]);

  // Handle auto-refresh when stock is updated (e.g., after a sale)
  useEffect(() => {
    const handleStockUpdate = () => {
      refreshProducts();
    };
    window.addEventListener('stock-updated', handleStockUpdate);
    return () => window.removeEventListener('stock-updated', handleStockUpdate);
  }, [refreshProducts]);


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
  
  const [businessSettings, setBusinessSettings] = useState<SystemSettings | null>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [priceLevels, setPriceLevels] = useState<any[]>([]);
  const [selectedPriceLevelId, setSelectedPriceLevelId] = useState<string>('');
  
  const [enableNegativeInventory, setEnableNegativeInventory] = useState(false);
  const [enableCashCountAuth, setEnableCashCountAuth] = useState(false);
  const [cashCountAuthCredentials, setCashCountAuthCredentials] = useState<{username?: string | null, password?: string | null} | null>(null);
  const [isCashCountAuthOpen, setIsCashCountAuthOpen] = useState(false);
  const [enableLineVoidAuth, setEnableLineVoidAuth] = useState(false);
  const [lineVoidAuthCredentials, setLineVoidAuthCredentials] = useState<{username?: string | null, password?: string | null} | null>(null);
  const [isLineVoidAuthOpen, setIsLineVoidAuthOpen] = useState(false);
  const [priceEditAuthCredentials, setPriceEditAuthCredentials] = useState<{username?: string | null, password?: string | null} | null>(null);
  const [isPriceEditAuthOpen, setIsPriceEditAuthOpen] = useState(false);

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
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  
  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<{id: string; name: string; isActive: boolean; isReferenceRequired?: boolean; pointsAmount?: number; currencyEquivalent?: number}[]>([]);
  
  const [showQuantityInSearch, setShowQuantityInSearch] = useState(true);
  
  // Sticky Focus Logic
  useEffect(() => {
    const isAnyDialogOpen = 
      isTenderDialogOpen ||
      isEditItemOpen ||
      isQuantityDialogOpen ||
      isCancelDialogOpen ||
      isDiscountDialogOpen ||
      isHeldTransOpen ||
      isAuthDialogOpen ||
      isLineVoidAuthOpen ||
      isEndShiftOpen ||
      isCashTransferOpen ||
      isCustomerSelectOpen ||
      isLoyaltyOpen ||
      isRecentSalesOpen ||
      isVoidSalesOpen ||
      isReturnSalesOpen ||
      isPriceInquiryOpen ||
      isZReadingOpen ||
      isShutdownConfirmOpen ||
      isInsufficientStockOpen ||
      isProductSearchOpen ||
      showEndShiftReport;

    if (!isAnyDialogOpen && isPosLoggedIn && shiftActive) {
      // Small timeout to allow dialogs to fully unmount/close
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
      isTenderDialogOpen, isEditItemOpen, isQuantityDialogOpen, isCancelDialogOpen, isDiscountDialogOpen,
      isHeldTransOpen, isAuthDialogOpen, isLineVoidAuthOpen, isEndShiftOpen, isCashTransferOpen,
      isCustomerSelectOpen, isLoyaltyOpen, isRecentSalesOpen, isVoidSalesOpen, isReturnSalesOpen,
      isPriceInquiryOpen, isZReadingOpen, isShutdownConfirmOpen, isInsufficientStockOpen, isProductSearchOpen,
      showEndShiftReport, isPosLoggedIn, shiftActive
  ]);

  // Persist shift ID and POS user
  useEffect(() => {
      const storedUser = localStorage.getItem('pos_current_user');
      if (storedUser) {
          try {
              setCurrentUser(JSON.parse(storedUser));
              setIsPosLoggedIn(true);
          } catch (e) {
              console.error("Failed to parse stored POS user");
          }
      }

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

  // Scroll to selected item
  useEffect(() => {
    if (selectedItemId) {
      const element = document.getElementById(`pos-item-${selectedItemId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedItemId]);

  // Fetch POS settings - stable reference via useCallback so polling interval never resets
  const fetchSettings = useCallback(async () => {
      try {
          const response = await fetch(getApiUrl('/pos-settings'));
          const result = await response.json();
          if (result.success) {
              setEnableNegativeInventory(result.data.enableNegativeInventory);
              setEnableCashCountAuth(result.data.enableCashCountAuth);
              setCashCountAuthCredentials({
                  username: result.data.cashCountAuthUsername,
                  password: result.data.cashCountAuthPassword
              });
              setEnableLineVoidAuth(result.data.enableLineVoidAuth);
              setLineVoidAuthCredentials({
                  username: result.data.lineVoidAuthUsername,
                  password: result.data.lineVoidAuthPassword
              });
              setPriceEditAuthCredentials({
                  username: result.data.priceEditAuthUsername,
                  password: result.data.priceEditAuthPassword
              });
              setShowQuantityInSearch(result.data.showQuantityInSearch ?? true);
              setBusinessSettings(result.data);
          }
      } catch (error) {
          console.error('Error fetching settings:', error);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh settings when they are changed from another tab/window
  // Storage event works for browser-to-browser; polling works universally (including Electron)
  useEffect(() => {
    // Fast refresh for browser tabs via storage event
    const handleSettingsChange = (e: StorageEvent) => {
      if (e.key === 'pos_settings_version') {
        fetchSettings();
      }
    };
    window.addEventListener('storage', handleSettingsChange);

    // Universal polling fallback every 30 seconds (works in Electron + browser)
    const pollInterval = setInterval(() => {
      fetchSettings();
    }, 30000);

    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      clearInterval(pollInterval);
    };
  }, [fetchSettings]);

  // Fetch initial data
  useEffect(() => {
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
    
    // Fetch POS settings on mount
    fetchSettings();

    // Fetch Terminals
    const fetchTerminals = async () => {
      try {
        const response = await fetch(getApiUrl('/pos-terminals?activeOnly=true'));
        const result = await response.json();
        if (result.success) {
          const terminalsData = result.data;
          setTerminals(terminalsData);
          
          const clientIp = result.clientIp;
          console.log('Client IP:', clientIp);

          // Priority 1: Check for terminal matching client IP
          const autoMatchedTerminal = terminalsData.find((t: any) => t.ipAddress === clientIp);
          
          // Priority 2: Check for stored manual selection
          const storedTerminalId = localStorage.getItem('pos_terminal_id');
          const storedTerminal = terminalsData.find((t: any) => t.id === storedTerminalId);
          
          if (autoMatchedTerminal) {
            setSelectedTerminalId(autoMatchedTerminal.id);
            localStorage.setItem('pos_terminal_id', autoMatchedTerminal.id);
            toast({
              title: 'Terminal Connected',
              description: `Automatically connected to ${autoMatchedTerminal.terminalDescription} (${clientIp})`,
            });
          } else if (storedTerminal) {
            // Use stored terminal but inform user about IP mismatch
            setSelectedTerminalId(storedTerminal.id);
            toast({
              title: 'Manual Terminal Connected',
              description: `Connected to ${storedTerminal.terminalDescription} (Note: This machine IP is ${clientIp})`,
            });
          } else {
            // No IP match and no valid stored terminal - show informative error
            toast({
              variant: 'destructive',
              title: 'Terminal Not Found',
              description: `No terminal configured for IP: ${clientIp}. Please register this IP in Terminals page.`,
            });

            // Fallback to first available if any
            if (terminalsData.length > 0) {
              const defaultTerminalId = terminalsData[0].id;
              setSelectedTerminalId(defaultTerminalId);
              localStorage.setItem('pos_terminal_id', defaultTerminalId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching terminals:', error);
      }
    };
    fetchTerminals();
    
    // Fetch Payment Methods
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch(getApiUrl('/payment-methods?activeOnly=true'));
        const result = await response.json();
        if (result.success && result.data) {
          setPaymentMethods(result.data);
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }
    };
    fetchPaymentMethods();
  }, []);

  // Heartbeat for terminal status
  useEffect(() => {
    if (!selectedTerminalId) return;

    const sendHeartbeat = () => {
      fetch(getApiUrl('/pos-terminals'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTerminalId })
      }).catch(console.error);
    };

    // Initial heartbeat
    sendHeartbeat();

    // Heartbeat every 1 minute
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, [selectedTerminalId]);

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

  // Ref so the keyboard handler always sees latest login state without
  // changing the dependency array size (avoids React Fast Refresh warning).
  const isPosLoggedInRef = useRef(isPosLoggedIn);
  useEffect(() => { isPosLoggedInRef.current = isPosLoggedIn; }, [isPosLoggedIn]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable all shortcuts while the login form is displayed
      if (!isPosLoggedInRef.current) return;

      // Check if any dialog is open to prevent background interactions
      const isDialogOpen = document.querySelector('[role="dialog"]') !== null;

      if (e.key && e.key.startsWith('F')) {
        // e.preventDefault(); // Un-comment if you want to block F1 (Help), F3 (Search), etc.
      }

      switch (e.key) {
        case 'F1': handleOpenEditDialog(); break;
        case 'F2': 
          if (items.length > 0) {
             if (enableLineVoidAuth) {
                  setIsLineVoidAuthOpen(true);
             } else {
                  setIsCancelDialogOpen(true);
             }
          }
          break;
        case 'F3': handleOpenDiscountDialog(); break;
        case 'F4': handleHold(); break;
        case 'F5': setIsHeldTransOpen(true); break;
        case 'F6': handleOpenQuantityDialog(); break;
        case 'F7': handleRequestPriceEdit(); break;
        case 'F8': setIsShutdownConfirmOpen(true); break;
        case '+':
          {
            const isInputFocused = document.activeElement === inputRef.current;
            const isInputEmpty = inputRef.current ? inputRef.current.value === '' : true;
            
            if (selectedItemId && (!isInputFocused || isInputEmpty) && !isDialogOpen) {
                e.preventDefault();
                const item = items.find(i => i.id === selectedItemId);
                if (item) updateQuantity(selectedItemId, item.quantity + 1);
            }
          }
          break;
        case '-':
          {
            const isInputFocused = document.activeElement === inputRef.current;
            const isInputEmpty = inputRef.current ? inputRef.current.value === '' : true;
            
            if (selectedItemId && (!isInputFocused || isInputEmpty) && !isDialogOpen) {
                e.preventDefault();
                const item = items.find(i => i.id === selectedItemId);
                if (item) updateQuantity(selectedItemId, item.quantity - 1);
            }
          }
          break;
        case 'ArrowUp':
          {
            const isInputFocused = document.activeElement === inputRef.current;
            const isInputEmpty = inputRef.current ? inputRef.current.value === '' : true;
            
            if (items.length > 0 && (!isInputFocused || isInputEmpty) && !isDialogOpen) {
                e.preventDefault();
                const currentIndex = items.findIndex(i => i.id === selectedItemId);
                const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
                setSelectedItemId(items[prevIndex].id);
            }
          }
          break;
        case 'ArrowDown':
          {
            const isInputFocused = document.activeElement === inputRef.current;
            const isInputEmpty = inputRef.current ? inputRef.current.value === '' : true;
            
            if (items.length > 0 && (!isInputFocused || isInputEmpty) && !isDialogOpen) {
                e.preventDefault();
                const currentIndex = items.findIndex(i => i.id === selectedItemId);
                const nextIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
                setSelectedItemId(items[nextIndex].id);
            }
          }
          break;
        // Payment method shortcuts
        case 'F9': 
             e.preventDefault();
             setIsProductSearchOpen(prev => !prev); 
             break;
        case 'F10': handleOpenTender('CREDIT_CARD'); break;
        case 'F11': handleOpenTender('E_WALLET'); break;
        case 'F12': handleOpenTender('POINTS'); break;
      }

      if (e.ctrlKey) {
        switch (e.key) {
          case '1': e.preventDefault(); handleOpenEndShift(); break;
          case '2': e.preventDefault(); setIsCashTransferOpen(true); break;
          case '3': e.preventDefault(); setIsCustomerSelectOpen(true); break;
          case '4': e.preventDefault(); handleOpenLoyalty(); break;
          case '5': e.preventDefault(); setIsRecentSalesOpen(true); break;
          case '6': e.preventDefault(); setIsVoidSalesOpen(true); break;
          case '7': e.preventDefault(); setIsReturnSalesOpen(true); break;
          case '0': e.preventDefault(); setIsZReadingOpen(true); break;
          case 'p': 
          case 'P':
            e.preventDefault(); 
            setIsPriceInquiryOpen(true); 
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedItemId, heldTransactions, enableLineVoidAuth]); // Dependencies for relevant state - validated

  const defaultLevelId = useMemo(() => {
    const defaultLevel = priceLevels.find((l: any) => l.isDefault);
    return defaultLevel?.id || 'retail-level';
  }, [priceLevels]);

  const activeLevelId = useMemo(() => {
    return selectedCustomer?.priceLevelId || selectedPriceLevelId || defaultLevelId;
  }, [selectedCustomer, selectedPriceLevelId, defaultLevelId]);

  const activeLevelName = useMemo(() => {
    const level = priceLevels.find((l: any) => l.id === activeLevelId);
    return level?.name || 'Retail';
  }, [activeLevelId, priceLevels]);

  // Update item prices when price level or customer changes
  useEffect(() => {
    if (!activeLevelId) return;

    setItems(currentItems => {
      if (currentItems.length === 0) return currentItems;
      
      const updatedItems = currentItems.map(item => {
        const newPrice = calculateEffectivePrice(item, item.quantity, activeLevelId, defaultLevelId);
        return { ...item, price: newPrice };
      });

      const hasChanged = JSON.stringify(currentItems.map(i => i.price)) !== JSON.stringify(updatedItems.map(i => i.price));
      return hasChanged ? updatedItems : currentItems;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevelId]);


  const handleAddItem = (product: Product | undefined) => {
    if (product) {
      setItems(prevItems => {
        const existingItem = prevItems.find((item) => item.id === product.id);
        if (existingItem) {
          const newQuantity = existingItem.quantity + 1;
          // Use original product for price calculation to ensure base price is preserved
          const newPrice = calculateEffectivePrice(product, newQuantity, activeLevelId, defaultLevelId);
          return prevItems.map(item => 
            item.id === product.id 
              ? { ...item, quantity: newQuantity, price: newPrice } 
              : item
          );
        } else {
          const itemPrice = calculateEffectivePrice(product, 1, activeLevelId, defaultLevelId);
          const newItem: SaleItem = { ...product, quantity: 1, discount: 0, name: product.name, price: itemPrice };
          setSelectedItemId(newItem.id); 
          return [...prevItems, newItem];
        }
      });
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
    
    // Priority 1: Exact SKU or Barcode match
    let product = products?.find((p) => p.sku === sku || p.barcode === sku);
    
    // Priority 2: Exact Name match (case-insensitive)
    if (!product) {
         product = products?.find(p => p.name.toLowerCase() === sku.toLowerCase());
    }

    // Priority 3: Partial Name match (if nothing else found)
    if (!product) {
         product = products?.find(p => p.name.toLowerCase().includes(sku.toLowerCase()));
    }

    handleAddItem(product);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      setItems(prevItems => prevItems.map(item => {
        if (item.id === productId) {
             const originalProduct = products?.find(p => p.id === productId);
             const newPrice = calculateEffectivePrice(originalProduct || item, newQuantity, activeLevelId, defaultLevelId);
             // console.log(`Price update for ${item.name}: Qty ${newQuantity}, Level ${activeLevelId} -> ${newPrice}`);
             return { ...item, quantity: newQuantity, price: newPrice };
        }
        return item;
      }));
    }
  };

  const handleUpdateItem = (itemId: string, newName: string, newQuantity: number, newPrice: number, newDiscount: number) => {
    setItems(prevItems => prevItems.map(item =>
      item.id === itemId
        ? { ...item, name: newName, quantity: newQuantity, price: newPrice, discount: newDiscount }
        : item
    ));
  };

  const handleCancelSale = () => {
    if (items.length > 0) {
      if (enableLineVoidAuth) {
           setIsLineVoidAuthOpen(true);
      } else {
           setIsCancelDialogOpen(true);
      }
    } else {
      toast({
        title: "Cart Empty",
        description: "There are no items to cancel.",
      });
    }
  };

  const handleCancelSelected = (quantityToVoid: number) => {
    if (selectedItemId) {
      const item = items.find(i => i.id === selectedItemId);
      if (item) {
          if (quantityToVoid < item.quantity) {
              // Partial Void
              updateQuantity(selectedItemId, item.quantity - quantityToVoid);
              toast({
                  title: "Item Value Reduced",
                  description: `Voided ${quantityToVoid} from ${item.name}`,
              });
          } else {
              // Full Void
              removeItem(selectedItemId);
              setSelectedItemId(null);
              toast({
                  title: "Item Removed",
                  description: "The selected item has been removed from the cart.",
              });
          }
      }
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
    // Trigger notification update
    window.dispatchEvent(new Event('stock-updated'));
  };

  const handleOpenTender = (method: string) => {
    if (items.length > 0) {
      if (!enableNegativeInventory) {
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

  const handleDefaultTender = () => {
    const cashMethod = paymentMethods.find(m => m.name.toUpperCase() === 'CASH');
    handleOpenTender(cashMethod ? cashMethod.name : (paymentMethods.length > 0 ? paymentMethods[0].name : 'CASH'));
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

         const response = await fetch(getApiUrl('/pos/shifts'), {
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
          const response = await fetch(getApiUrl('/pos/shifts'), {
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
              // 1. Fetch X-Reading Data for this ended shift
              // try {
              //     const xReadingRes = await fetch(`/api/sales/x-reading?shiftId=${currentShiftId}&limit=1`);
              //     const xReadingResult = await xReadingRes.json();
                  
              //     if (xReadingResult.success && xReadingResult.data.length > 0) {
              //         // 2. Print X-Reading
              //         const printUtils = await import('./print-x-reading');
              //         printUtils.printXReading(xReadingResult.data[0], businessSettings);
              //         toast({ title: "Printing Report", description: "X-Reading is being printed..." });
              //     } else {
              //         console.warn("Could not fetch X-Reading for printing");
              //     }
              // } catch (printError) {
              //     console.error("Error printing X-Reading:", printError);
              //     // Don't fail the whole end shift process just because print failed
              // }

              setLastEndedShiftId(currentShiftId);
              localStorage.removeItem('pos_current_shift_id');
              localStorage.removeItem('pos_current_user');
              setCurrentShiftId(null);
              
              setIsEndShiftOpen(false);
              setShiftActive(false);
              setIsPosLoggedIn(false); 
              setItems([]);
              setHeldTransactions([]);
              setSelectedCustomer(WALK_IN_CUSTOMER);
              

              // Show the report dialog which has the print button
              setShowEndShiftReport(true); 
              
              // 2. Generate and Save X-Reading
              try {
                  const xReadingRes = await fetch(getApiUrl(`/sales/x-reading?shiftId=${currentShiftId}&limit=1`));
                  const xReadingResult = await xReadingRes.json();
                  
                  if (xReadingResult.success && xReadingResult.data.length > 0) {
                      const xData = xReadingResult.data[0];
                      // Save X-Reading Record
                      await fetch(getApiUrl('/sales/x-reading'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              readingNumber: `X-${xData.id.substring(0, 8).toUpperCase()}`, // Generate a reading number
                              reportDate: xData.reportDate,
                              shiftStart: xData.shiftStart,
                              shiftEnd: xData.shiftEnd, // Shift is now ended
                              terminalId: xData.terminalId,
                              cashierName: xData.cashierName,
                              cashierId: xData.cashierId,
                              grossSales: xData.grossSales,
                              returns: xData.returns,
                              discounts: xData.discounts,
                              netSales: xData.netSales,
                              vatAmount: xData.vatAmount,
                              paymentMethods: xData.paymentMethods,
                              transactionCount: xData.transactionCount,
                              startingCash: xData.startingCash,
                              cashSales: xData.cashSales,
                              cashInDrawer: xData.cashInDrawer,
                              shiftStatus: 'completed'
                          })
                      });
                  }
              } catch (xError) {
                  console.error("Failed to generate X-Reading record", xError);
              }

              // 3. Generate and Save Z-Reading
              try {
                  await fetch(getApiUrl('/sales/z-reading'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          terminalId: selectedTerminalId,
                          cashierName: currentUser?.displayName || 'Admin'
                      })
                  });
              } catch (zError) {
                   console.error("Failed to generate Z-Reading record", zError);
              }

              toast({ title: "Shift Ended", description: "Shift closed and readings generated successfully." });
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
    localStorage.setItem('pos_current_user', JSON.stringify(user));
    // Determine if shift is already active based on localStorage? 
    // Usually we would fetch "active shift for user" from backend here.
  }

  const handleLogout = () => {
    // Only log out the user, don't clear transaction
    setIsPosLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('pos_current_user');
  }

  const handleShutdown = () => {
    setIsShutdownConfirmOpen(true);
  }

  const handleRequestPriceEdit = () => {
    if (selectedItem) {
      if (businessSettings?.enablePriceEditAuth) {
          setIsPriceEditAuthOpen(true);
      } else {
         // Direct access if auth is disabled
         setEditDialogMode('price-only');
         setIsEditItemOpen(true);
      }
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

  const handlePriceEditAuthSuccess = () => {
    setIsPriceEditAuthOpen(false);
    setEditDialogMode('price-only');
    setIsEditItemOpen(true);
  };


  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setIsCustomerSelectOpen(false);
  }

  const handleOpenLoyalty = () => {
    setIsLoyaltyOpen(true);
  };

  // Tax Calculations
  const taxDetails = useMemo(() => {
    let vatSales = 0;
    let vatAmount = 0;
    let nonVatSales = 0;
    let zeroRatedSales = 0;
    let vatExemptSales = 0;
    let subTotal = 0;

    items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        const netItemTotal = itemTotal - ((itemTotal * item.discount) / 100);
        
        subTotal += netItemTotal; // This acts as net sales after item discount

        // Default to VAT if undefined
        const taxType = item.taxType || 'VAT';

        if (taxType === 'VAT') {
            const vatable = netItemTotal / 1.12;
            vatSales += vatable;
            vatAmount += (netItemTotal - vatable);
        } else if (taxType === 'NON_VAT') {
            nonVatSales += netItemTotal;
        } else if (taxType === 'ZERO_RATED') {
            zeroRatedSales += netItemTotal;
        } else if (taxType === 'VAT_EXEMPT') {
            vatExemptSales += netItemTotal;
        }
    });

    return {
        vatSales,
        vatAmount,
        nonVatSales,
        zeroRatedSales,
        vatExemptSales,
        subTotal
    };
  }, [items]);

  const totalDue = useMemo(() => {
    return items.reduce((acc, item) => {
      const itemTotal = item.price * item.quantity;
      return acc + (itemTotal - (itemTotal * item.discount) / 100);
    }, 0);
  }, [items]);

  // Derived for display
  const subTotal = taxDetails.subTotal;
  const vatSales = taxDetails.vatSales;
  const vatAmount = taxDetails.vatAmount;
  const numberOfItems = items.reduce((acc, item) => acc + item.quantity, 0);




  const [cashDeposits, setCashDeposits] = useState(0);
  const [cashPickups, setCashPickups] = useState(0);

  const fetchShiftData = async () => {
    if (!currentShiftId) return;
    try {
        const response = await fetch(getApiUrl(`/pos/shifts?shiftId=${currentShiftId}`));
        const result = await response.json();
        if (result.success && result.data) {
            setStartingCash(result.data.startingCash);
            setCashSales(result.data.cashSales); // Update local cash sales with server truth
            setCashDeposits(result.data.cashDeposits);
            setCashPickups(result.data.cashPickups);
        }
    } catch (error) {
        console.error("Failed to fetch shift data", error);
    }
  };

  const handleOpenEndShift = async () => {
    if (currentShiftId) {
        await fetchShiftData();
    }

    if (enableCashCountAuth) {
        setIsCashCountAuthOpen(true);
    } else {
        setIsEndShiftOpen(true);
    }
  };



  const pointsMethod = useMemo(() => {
    return paymentMethods.find(pm => pm.name.toUpperCase() === 'POINTS');
  }, [paymentMethods]);

  const pointsRate = useMemo(() => {
    if (!pointsMethod || !pointsMethod.pointsAmount || !pointsMethod.currencyEquivalent) {
        return 1; // Default 1:1
    }
    return Number(pointsMethod.currencyEquivalent) / Number(pointsMethod.pointsAmount);
  }, [pointsMethod]);

  const customerPoints = (selectedCustomer as any)?.current_points || (selectedCustomer as any)?.loyaltyPoints || 0;
  const customerPointsValue = Number(customerPoints) * pointsRate;

  // Header Actions
  const headerActions = [
    { icon: Pencil, label: 'Edit Item', fKey: 'F1', action: handleOpenEditDialog, className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 hover:border-blue-200" },
    { icon: X, label: 'Line Void', fKey: 'F2', action: handleCancelSale, className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-100 hover:border-red-200" },
    { icon: Percent, label: 'Discount', fKey: 'F3', action: handleOpenDiscountDialog, className: "bg-green-50 text-green-700 hover:bg-green-100 border-green-100 hover:border-green-200" },
    { icon: Tag, label: 'Suspend', fKey: 'F4', action: handleHold, className: "bg-orange-50 text-orange-800 hover:bg-orange-100 border-orange-100 hover:border-orange-200" },
    { icon: ListOrdered, label: 'Suspended', fKey: 'F5', action: () => setIsHeldTransOpen(true), className: "bg-orange-50 text-orange-800 hover:bg-orange-100 border-orange-100 hover:border-orange-200" },
    { icon: Plus, label: 'Quantity', fKey: 'F6', action: handleOpenQuantityDialog, className: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 hover:border-indigo-200" },
    { icon: CurrencyIcon, label: 'Edit Price', fKey: 'F7', action: handleRequestPriceEdit, className: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100 hover:border-purple-200" },
    { icon: Power, label: 'Shutdown', fKey: 'F8', action: handleShutdown, className: "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-100 hover:border-slate-200" },
  ];

  const footerActions = [
    { icon: Printer, label: 'Cash count', shortcut: 'Ctrl+1', action: handleOpenEndShift },
    { icon: CurrencyIcon, label: 'Cash transfer', shortcut: 'Ctrl+2', action: () => setIsCashTransferOpen(true) },
    { icon: User, label: 'Customer', shortcut: 'Ctrl+3', action: () => setIsCustomerSelectOpen(true) },
    { icon: Star, label: 'Loyalty', shortcut: 'Ctrl+4', action: handleOpenLoyalty },
    { icon: Clock, label: 'Recent Sales', shortcut: 'Ctrl+5', action: () => setIsRecentSalesOpen(true) },
    { icon: Ban, label: 'Post Void', shortcut: 'Ctrl+6', action: () => setIsVoidSalesOpen(true) },
    { icon: Undo, label: 'Merch Credit', shortcut: 'Ctrl+7', action: () => setIsReturnSalesOpen(true) },
    { icon: BookOpen, label: 'Z-READING', shortcut: 'Ctrl+0', action: () => setIsZReadingOpen(true) },
    { icon: Search, label: 'Price Inquiry', shortcut: 'Ctrl+P', action: () => setIsPriceInquiryOpen(true) },
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
  const matteYellowButtons = ['Recent Sales', 'Post Void', 'Merch Credit'];
  const mattePurpleButtons = ['Z-READING', 'Price Inquiry'];



  const showOverlay = !isPosLoggedIn || !shiftActive;

  return (

    <>
      <div className="flex h-screen w-screen bg-muted/30 font-sans overflow-hidden">
        <AdminAuthDialog 
          isOpen={isCashCountAuthOpen}
          onOpenChange={setIsCashCountAuthOpen}
          onSuccess={() => setIsEndShiftOpen(true)}
          requiredCredentials={cashCountAuthCredentials}
          title="Cash Count Authentication"
          description="Please enter credentials to access Cash Count."
        />
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
                {headerActions.map(({ icon: Icon, label, fKey, action, className }) => (
                  <Button 
                    key={label} 
                    variant="ghost" 
                    size="sm"
                    className={`flex flex-col gap-0.5 h-12 min-w-[4.5rem] px-2 transition-all font-normal border ${className}`} 
                    onClick={action}
                  >
                    <Icon className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] leading-none font-medium text-center">{label}</span>
                    <span className="text-[9px] text-black leading-none font-mono opacity-100">{fKey}</span>
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
                 <Button variant="outline" size="icon" onClick={() => window.location.reload()} className="h-9 w-9 rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground" title="Refresh Page">
                    <RefreshCw className="h-4 w-4" />
                 </Button>
                 <ThemeToggle />
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
                    ref={inputRef}
                    type="text"
                    placeholder="Scan Barcode or Enter Product SKU (Enter)"
                    className="pl-9 h-12 text-lg bg-background shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.stopPropagation();
                            if (inputValue.trim()) {
                                handleAddItemBySKU(inputValue);
                            } else {
                                handleDefaultTender();
                            }
                        }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsProductSearchOpen(true)}
                  >
                    <div className="flex items-center gap-1.5">
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        F9
                      </kbd>
                    </div>
                  </Button>
                </div>

                <div className="flex items-center gap-2 bg-background border border-muted-foreground/20 rounded-md px-3 h-12 shadow-sm min-w-[200px]">
                    <User className="h-4 w-4 text-primary" />
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                            <div className="text-xs text-muted-foreground">Customer</div>
                        </div>
                        <div className="text-sm font-medium truncate">{selectedCustomer?.name || 'Walk-in'}</div>
                    </div>
                    {selectedCustomer?.id !== 'walk-in' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1" onClick={() => handleSelectCustomer(WALK_IN_CUSTOMER)}>
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
             </div>

             {/* Items Table */}
             <div className="flex-1 bg-background rounded-xl border shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-y-auto flex-1 scroll-pt-12">
                  <table className="w-full caption-bottom text-sm">
                    <TableHeader className="sticky top-0 bg-muted z-20 shadow-sm">
                      <TableRow className="hover:bg-transparent border-b-border/50">
                        <TableHead className="w-10 pl-4"></TableHead>
                        <TableHead className="w-[40%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                        <TableHead className="w-[10%] text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</TableHead>
                        <TableHead className="text-center w-32 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                        <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
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
                                    id={`pos-item-${item.id}`}
                                    className={`
                                        cursor-pointer transition-colors border-b-border/40 last:border-0
                                        ${selectedItemId === item.id ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}
                                    `}
                                    onClick={() => {
                                        setSelectedItemId(item.id);
                                        inputRef.current?.focus();
                                    }}
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
                                    <TableCell className="text-left text-sm text-muted-foreground">
                                        {item.unitOfMeasure}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm group">
                                        <div className="flex flex-col items-end">
                                            <span>₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                            {/* Tiered Pricing Label Removed */}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <div className="flex items-center justify-center gap-1 h-full">
                                            <span className="w-8 text-center font-mono text-sm font-medium">{item.quantity}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-medium">
                                         ₱{(item.price * item.quantity * (1 - item.discount / 100)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                  </table>
                </div>
                
                {/* Summary Strip Removed - Moved to Sidebar */}
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
                        {shortcut && <span className="text-[9px] text-black font-mono">{shortcut}</span>}
                    </Button>
                ))}
            </div>

          </div>
        </div>

        {/* Right Section: Totals & Payments */}
        <div className="w-96 bg-background border-l shadow-2xl z-20 flex flex-col h-full">
            {/* Cashier Profile */}
            <div className="p-6 border-b flex flex-col items-center gap-2 bg-muted/10">
                 {businessSettings?.logoPath ? (
                     <div className="relative w-20 h-20 mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={businessSettings.logoPath} 
                            alt="Business Logo" 
                            className="w-full h-full object-contain"
                        />
                     </div>
                 ) : (
                     <div className="bg-primary text-white py-2 w-[350px] flex items-center justify-center rounded-md mb-2">
                         <span className="text-2xl uppercase font-bold leading-none tracking-tight text-center">STOCK PILOT</span>
                     </div>
                  )}
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
                    {/* Detailed Breakdown Card */}
                    <Card className="mx-4 mt-12 bg-muted/30 border-dashed">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Sub total:</span>
                                    <span className="font-mono">{subTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Vat Sales:</span>
                                    <span className="font-mono">{vatSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Sub discount:</span>
                                    {/* Placeholder logic for discount sum if needed, typically difference between gross and net if not per item stored */}
                                    <span className="font-mono">{(items.reduce((acc, item) => acc + item.price * item.quantity, 0) - totalDue).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Vat amount:</span>
                                    <span className="font-mono">{vatAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                 <div className="flex justify-between font-bold text-foreground">
                                    <span>Amount due:</span>
                                    <span className="font-mono text-primary">{totalDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Non-vat sales:</span>
                                    <span className="font-mono">{taxDetails.nonVatSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                 <div className="flex justify-between">
                                     {/* Divider / Spacer */}
                                </div>
                                <div className="flex justify-between">
                                    <span>No of Items:</span>
                                    <span className="font-mono">{numberOfItems}</span>
                                </div>
                                
                                 <div className="flex justify-between">
                                    <span>Vat-Exempt sales:</span>
                                    <span className="font-mono">{taxDetails.vatExemptSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                 <div className="flex justify-between">
                                     <span>Zero-Rated Sales:</span>
                                     <span className="font-mono">{taxDetails.zeroRatedSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-3">
                    
                     {/* Individual Payment Buttons Removed as per request to move selection to dialog */}
                     {/* <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.filter(m => m.isActive).map((method) => (
                            <Button
                                key={method.id}
                                variant="outline"
                                onClick={() => handleOpenTender(method.name)}
                                disabled={items.length === 0}
                                className="h-16 flex flex-col items-center justify-center gap-1 border-muted-foreground/20 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                            >
                                <span className="font-semibold">{method.name}</span>
                            </Button>
                        ))}
                     </div> */}
                </div>
            </div>

            {/* Tender Button */}
            <div className="p-6 bg-muted/10 border-t">
                <Button 
                    size="lg" 
                    className="w-full h-20 text-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all rounded-xl"
                    onClick={handleDefaultTender}
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
        totalDue={items.reduce((acc, item) => {
          const itemTotal = item.price * item.quantity;
          return acc + (itemTotal - (itemTotal * item.discount) / 100);
        }, 0)}
        items={items}
        customer={selectedCustomer}
        currentUser={currentUser}
        onSuccess={handleSuccessfulSale}
        shiftId={currentShiftId || null}
        terminalId={selectedTerminalId}
        terminalMin={terminals.find(t => t.id === selectedTerminalId)?.min}
        terminalSerialNumber={terminals.find(t => t.id === selectedTerminalId)?.serialNumber}
        paymentMethods={paymentMethods}
        printMode={businessSettings?.printMode || 'browser'}
        settings={businessSettings as any} 
        onTriggerCustomerSelection={() => {
          setIsCustomerSelectOpen(true);
        }}
      />
      <EditItemDialog
        isOpen={isEditItemOpen}
        onOpenChange={setIsEditItemOpen}
        item={selectedItem}
        product={products?.find(p => p.id === selectedItemId)}
        onUpdate={handleUpdateItem}
        activeLevelId={activeLevelId}
        defaultLevelId={defaultLevelId}
      />
       {/* Product Search Dialog */}
      <ProductSearchDialog
        isOpen={isProductSearchOpen}
        onOpenChange={setIsProductSearchOpen}
        onSelectProduct={handleAddItem}
        showQuantityInSearch={showQuantityInSearch}
        activeLevelId={activeLevelId}
        defaultLevelId={defaultLevelId}
        activeLevelName={activeLevelName}
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
        selectedItem={selectedItem}
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
      <AdminAuthDialog
        isOpen={isPriceEditAuthOpen}
        onOpenChange={setIsPriceEditAuthOpen}
        title="Price Edit Authorization"
        description="Please provide credentials to edit item price"
        requiredCredentials={priceEditAuthCredentials}
        onSuccess={handlePriceEditAuthSuccess}
      />

      <AdminAuthDialog
        isOpen={isLineVoidAuthOpen}
        onOpenChange={setIsLineVoidAuthOpen}
        title="Authorisation Required"
        description="Please provide credentials to Void Line Items"
        requiredCredentials={lineVoidAuthCredentials}
        onSuccess={() => {
             setIsLineVoidAuthOpen(false);
             setIsCancelDialogOpen(true);
        }}
      />
      <EndShiftDialog
        isOpen={isEndShiftOpen}
        onOpenChange={setIsEndShiftOpen}
        startingCash={startingCash}
        cashSales={cashSales}
        cashIn={cashDeposits}
        cashOut={cashPickups}
        onShiftEnd={handleConfirmEndShift}
      />
      <CashTransferDialog
        isOpen={isCashTransferOpen}
        onOpenChange={setIsCashTransferOpen}
        shiftId={currentShiftId}
        terminalId={selectedTerminalId}
        userId={currentUser?.uid || currentUser?.id || ''}
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
      <RecentSalesDialog 
        isOpen={isRecentSalesOpen} 
        onOpenChange={setIsRecentSalesOpen} 
        printMode={businessSettings?.printMode || 'browser'}
        settings={businessSettings as any}
      />
      <VoidSalesDialog isOpen={isVoidSalesOpen} onOpenChange={setIsVoidSalesOpen} />
      <ReturnSalesDialog 
        isOpen={isReturnSalesOpen} 
        onOpenChange={setIsReturnSalesOpen} 
        currentUser={currentUser}
        terminalId={selectedTerminalId}
        printMode={businessSettings?.printMode || 'browser'}
      />
      <PriceInquiryDialog 
        isOpen={isPriceInquiryOpen} 
        onOpenChange={setIsPriceInquiryOpen} 
        activeLevelId={activeLevelId}
        defaultLevelId={defaultLevelId}
        activeLevelName={activeLevelName}
      />
      <ZReadingDialog 
        isOpen={isZReadingOpen} 
        onOpenChange={setIsZReadingOpen} 
        printMode={businessSettings?.printMode || 'browser'}
        terminalId={selectedTerminalId}
      />
      
      <XReadingDialog 
        isOpen={showEndShiftReport} 
        onOpenChange={setShowEndShiftReport}
        shiftId={lastEndedShiftId ?? undefined}
        autoShow={true}
        printMode={businessSettings?.printMode || 'browser'}
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
