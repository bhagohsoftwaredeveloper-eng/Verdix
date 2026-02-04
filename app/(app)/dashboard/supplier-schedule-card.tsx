'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, Calendar, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { getSuppliers } from '../products/actions';
import { AddPurchaseOrderDialog } from '../purchases/add-purchase-order-dialog';
import { Supplier } from '@/lib/types';

export function SupplierScheduleCard() {
  const [scheduledSuppliers, setScheduledSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for creating an order
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | undefined>(undefined);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  useEffect(() => {
    const fetchAndFilter = async () => {
      try {
        const suppliers = await getSuppliers();
        
        const today = new Date();
        const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }); // e.g. Monday
        const dayOfMonth = today.getDate(); // 1-31
        
        // Check for last day of month
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + 1);
        const isLastDay = nextDay.getDate() === 1;

        const due = suppliers.filter((s: Supplier) => {
           const sched = s.orderSchedule;
           if (!sched) return false;
           
           if (sched === 'Daily') return true;
           if (sched === `Every ${dayOfWeek}`) return true;
           if (sched === `Monthly (Day ${dayOfMonth})`) return true;
           if (sched === 'Monthly (End of Month)' && isLastDay) return true;
           
           // Simple "Every 2 Weeks" check: If it matches weekday, show it as "Potential"
           // For now, let's treat it as a match on the weekday but maybe mark it differently?
           // The user just asked to put in dashboard. Simplicity first.
           if (sched === 'Every 2 Weeks') {
               // We don't know the phase of the 2 weeks without order history.
               // Ignoring for now to avoid false positives.
               return false;
           }

           return false;
        });

        setScheduledSuppliers(due);
      } catch (err) {
        console.error("Failed to fetch suppliers for schedule", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilter();
  }, []);

  if (loading || scheduledSuppliers.length === 0) return null;

  return (
    <>
    <Card className="glass-card border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden">
       <div className="absolute right-0 top-0 p-3 opacity-10">
           <Truck className="w-16 h-16 text-blue-500" />
       </div>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
           <Calendar className="w-5 h-5 text-blue-600" />
           Order Reminders
        </CardTitle>
        <CardDescription>
          You have {scheduledSuppliers.length} supplier{scheduledSuppliers.length !== 1 ? 's' : ''} scheduled for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mt-2">
          {scheduledSuppliers.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg hover:bg-muted/60 transition-colors">
               <div className="flex flex-col">
                  <span className="font-semibold text-sm">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.orderSchedule}</span>
               </div>
               <Button 
                 size="sm" 
                 variant="secondary" 
                 className="h-8 text-xs"
                 onClick={() => {
                     setSelectedSupplierId(s.id);
                     setIsOrderDialogOpen(true);
                 }}
               >
                 <ShoppingCart className="w-3 h-3 mr-1" />
                 Order
               </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {isOrderDialogOpen && (
        <AddPurchaseOrderDialog 
            open={isOrderDialogOpen}
            onOpenChange={setIsOrderDialogOpen}
            prefillSupplierId={selectedSupplierId}
            onAddOrder={() => {
                // Remove from list? Or just keep it.
                // Keeping it is safer as "done" state isn't tracked here.
                setIsOrderDialogOpen(false);
            }}
        />
    )}
    </>
  );
}
