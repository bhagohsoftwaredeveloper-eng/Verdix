'use client';

import { useState, useEffect, useCallback } from 'react';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { breakPack, searchProducts, getUnitsOfMeasure } from '../../products/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Package, ArrowRight, CheckCircle2, Info, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type Step = 'source' | 'target' | 'calculate' | 'summary';

type SearchResult = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  stock: number;
  unitOfMeasure: string;
  price: number;
  cost?: number;
  conversionFactors?: { unit: string; factor: number }[];
};

export function RepackagingForm({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState<Step>('source');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Source State
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceResults, setSourceResults] = useState<SearchResult[]>([]);
  const [selectedSource, setSelectedSource] = useState<SearchResult | null>(null);
  const [qtyToUse, setQtyToUse] = useState('1');

  // Target State
  const [targetType, setTargetType] = useState<'search' | 'create'>('search');
  const [targetSearch, setTargetSearch] = useState('');
  const [targetResults, setTargetResults] = useState<SearchResult[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SearchResult | null>(null);

  // New Product State
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);

  // Fetch Units
  useEffect(() => {
    getUnitsOfMeasure().then(setUnits);
  }, []);

  const generateBarcode = useCallback(() => {
    const randomNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setNewBarcode(randomNumber);
  }, []);

  // Auto-generate barcode when switching to create mode
  useEffect(() => {
    if (targetType === 'create' && !newBarcode) {
      generateBarcode();
    }
  }, [targetType, newBarcode, generateBarcode]);

  // Auto-calculate Price & Cost
  useEffect(() => {
    if (targetType === 'create' && newUnit && selectedSource) {
      const cf = selectedSource.conversionFactors?.find(f => f.unit === newUnit);
      if (cf && cf.factor > 0) {
        const factor = cf.factor;
        const suggestedPrice = (selectedSource.price / factor).toFixed(2);
        const suggestedCost = selectedSource.cost ? (selectedSource.cost / factor).toFixed(2) : '';
        
        setNewPrice(suggestedPrice);
        setNewCost(suggestedCost);
        
        // Also suggest a name if empty
        if (!newName) {
          setNewName(`${selectedSource.name} ${newUnit}`);
        }
      }
    }
  }, [newUnit, selectedSource, targetType, newName]);

  // Counting State
  const [packsProduced, setPacksProduced] = useState('');

  // Search Logic
  useEffect(() => {
    const query = step === 'source' ? sourceSearch : targetSearch;
    if (query.trim().length < 2) {
      if (step === 'source') setSourceResults([]);
      else setTargetResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchProducts(query);
        const filteredResults = results.filter(r => r.id !== selectedSource?.id);
        if (step === 'source') setSourceResults(filteredResults);
        else setTargetResults(filteredResults);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [sourceSearch, targetSearch, step, selectedSource?.id]);

  const handleProcess = async () => {
    if (!selectedSource) return;
    const bulkQty = parseFloat(qtyToUse);
    const producedQty = parseFloat(packsProduced);

    if (!bulkQty || bulkQty <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Quantity', description: 'Please enter how many source units you used.' });
      return;
    }
    if (!producedQty || producedQty <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Count', description: 'Please enter how many packs were produced.' });
      return;
    }

    const factor = producedQty / bulkQty;

    setIsLoading(true);
    try {
      let result;
      if (targetType === 'search' && selectedTarget) {
        result = await breakPack(selectedSource.id, selectedTarget.id, bulkQty, factor);
      } else if (targetType === 'create') {
        result = await breakPack(selectedSource.id, null, bulkQty, undefined, {
          name: newName,
          unitOfMeasure: newUnit,
          conversionFactor: factor,
          price: parseFloat(newPrice),
          cost: newCost ? parseFloat(newCost) : undefined,
          barcode: newBarcode
        });
      } else {
         toast({ variant: 'destructive', title: 'Target Missing', description: 'Please select or create a target product.' });
         setIsLoading(false);
         return;
      }

      if (result.success) {
        if ((result as any).pendingApproval) {
          toast({ title: '⏳ Submitted for Approval', description: result.message });
        } else {
          toast({ title: '✅ Repackaging Complete', description: result.message });
          onSuccess?.();
        }
        setStep('source');
        setSelectedSource(null);
        setSelectedTarget(null);
        setQtyToUse('1');
        setPacksProduced('');
        setSourceSearch('');
        setTargetSearch('');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to process repackaging.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4">
      {/* Progress Tracker */}
      <div className="flex items-center justify-between mb-8">
        {[
          { id: 'source', label: 'Source Item', icon: Package },
          { id: 'target', label: 'Target Item', icon: ArrowRight },
          { id: 'calculate', label: 'Count & Finish', icon: CheckCircle2 }
        ].map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              "flex flex-col items-center gap-2 px-4 transition-colors",
              step === s.id ? "text-primary" : "text-muted-foreground"
            )}>
              <div className={cn(
                "h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all",
                step === s.id ? "border-primary bg-primary/10 scale-110" : "border-muted-foreground/30"
              )}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{s.label}</span>
            </div>
            {i < 2 && <div className="h-[2px] w-12 bg-muted-foreground/20" />}
          </div>
        ))}
      </div>

      <div className="min-h-[300px]">
        {/* STEP 1: SOURCE SELECTION */}
        {step === 'source' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-lg font-semibold">Step 1: Select Bulk Item</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search source product (e.g. Salt 25kg)..."
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    className="pl-10 h-12 text-lg"
                  />
                </div>
              </div>

              {sourceResults.length > 0 && !selectedSource && (
                <div className="border rounded-xl divide-y overflow-hidden bg-card shadow-lg">
                  {sourceResults.map(p => (
                    <button
                      key={p.id}
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                      onClick={() => {
                        setSelectedSource(p);
                        setSourceSearch(p.name);
                      }}
                    >
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-sm text-muted-foreground">{p.sku} · Stock: {p.stock} {p.unitOfMeasure}</p>
                      </div>
                      <Badge variant="outline">Select</Badge>
                    </button>
                  ))}
                </div>
              )}

              {selectedSource && (
                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xl font-bold text-primary">{selectedSource.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedSource.sku}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSource(null)}>Change</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/10">
                    <div className="space-y-1">
                      <p className="text-xs uppercase text-muted-foreground font-bold italic">Available Stock</p>
                      <p className="text-2xl font-black">{selectedSource.stock} {selectedSource.unitOfMeasure}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="qtyToUse" className="text-xs uppercase text-primary font-bold">Qty to Break/Use</Label>
                      <Input
                        id="qtyToUse"
                        type="number"
                        value={qtyToUse}
                        onChange={(e) => setQtyToUse(e.target.value)}
                        className="h-10 text-lg border-primary/30"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                size="lg"
                disabled={!selectedSource || !qtyToUse || parseFloat(qtyToUse) <= 0}
                onClick={() => setStep('target')}
                className="rounded-full px-8 h-12 text-lg"
              >
                Next: Select Target
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: TARGET SELECTION */}
        {step === 'target' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
             <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Step 2: Destination Product</Label>
                <div className="flex gap-1 p-1 bg-muted rounded-full">
                  <Button
                    variant={targetType === 'search' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => setTargetType('search')}
                  >
                    Search Existing
                  </Button>
                  <Button
                    variant={targetType === 'create' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-full px-4"
                    onClick={() => setTargetType('create')}
                  >
                    Quick Create
                  </Button>
                </div>
              </div>

              {targetType === 'search' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search existing pack product..."
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      className="pl-10 h-12 text-lg"
                    />
                  </div>

                  {targetResults.length > 0 && !selectedTarget && (
                    <div className="border rounded-xl divide-y overflow-hidden bg-card shadow-lg max-h-60 overflow-y-auto">
                      {targetResults.map(p => (
                        <button
                          key={p.id}
                          className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                          onClick={() => {
                            setSelectedTarget(p);
                            setTargetSearch(p.name);
                          }}
                        >
                          <div>
                            <p className="font-bold">{p.name}</p>
                            <p className="text-sm text-muted-foreground">{p.sku} · {p.unitOfMeasure}</p>
                          </div>
                          <Badge variant="outline">Select</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedTarget && (
                    <div className="p-6 bg-secondary/5 rounded-2xl border border-secondary/20 flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold">{selectedTarget.name}</h4>
                        <p className="text-sm text-muted-foreground">{selectedTarget.sku} · {selectedTarget.unitOfMeasure}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTarget(null)}>Change</Button>
                    </div>
                  )}
                </div>
              )}

              {targetType === 'create' && (
                 <div className="grid grid-cols-2 gap-4 p-6 border rounded-2xl bg-muted/30">
                  <div className="col-span-2 space-y-2">
                    <Label>New Pack Product Name</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Salt 500g Pack" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit of Measure</Label>
                    <Select value={newUnit} onValueChange={setNewUnit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Barcode</Label>
                    <div className="relative">
                      <Input value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)} placeholder="Barcode" className="pr-10" />
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                        onClick={generateBarcode}
                        type="button"
                      >
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Retail Price</Label>
                    <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost</Label>
                    <Input type="number" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep('source')} className="rounded-full">
                Back to Source
              </Button>
              <Button
                size="lg"
                disabled={targetType === 'search' ? !selectedTarget : (!newName || !newUnit || !newPrice)}
                onClick={() => setStep('calculate')}
                className="rounded-full px-8 h-12 text-lg"
              >
                Next: Count Output
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: COUNT & FINISH */}
        {step === 'calculate' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-6">
              <div className="text-center p-8 bg-muted/50 rounded-3xl border border-dashed border-muted-foreground/30">
                <p className="text-muted-foreground mb-4 uppercase text-xs font-black tracking-widest">Process Summary</p>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-black text-primary">{qtyToUse}</p>
                    <p className="text-xs text-muted-foreground uppercase">{selectedSource?.unitOfMeasure}</p>
                  </div>
                  <ArrowRight className="h-8 w-8 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-3xl font-black">?</p>
                    <p className="text-xs text-muted-foreground uppercase">{targetType === 'create' ? newUnit : selectedTarget?.unitOfMeasure}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="packsCount" className="text-xl font-bold flex items-center gap-2 italic">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    How many {targetType === 'create' ? newUnit : selectedTarget?.unitOfMeasure} did you produce?
                  </Label>
                  <Input
                    id="packsCount"
                    type="number"
                    value={packsProduced}
                    onChange={(e) => setPacksProduced(e.target.value)}
                    placeholder="Enter final count..."
                    className="h-14 text-3xl font-black text-center border-emerald-500/50 focus-visible:ring-emerald-500"
                  />
                </div>

                {packsProduced && parseFloat(packsProduced) > 0 && (
                  <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                    <Info className="h-5 w-5 text-emerald-600" />
                    <p className="text-sm text-emerald-700">
                      Conversion Factor: <span className="font-black">{(parseFloat(packsProduced) / parseFloat(qtyToUse)).toFixed(2)}</span> per {selectedSource?.unitOfMeasure}.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep('target')} className="rounded-full" disabled={isLoading}>
                Go Back
              </Button>
              <Button
                size="xl"
                disabled={!packsProduced || parseFloat(packsProduced) <= 0 || isLoading}
                onClick={handleProcess}
                className="rounded-full px-12 h-14 text-xl font-black bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? 'Processing...' : 'Complete Repackaging'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
