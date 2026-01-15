
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { generateSuggestions, type FormState } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Package, Truck, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState: FormState = {
  suggestions: null,
  error: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        'Get Suggestions'
      )}
    </Button>
  );
}

export function RestockForm() {
  const [state, formAction] = useActionState(generateSuggestions, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: state.error,
      });
    }
  }, [state.error, toast]);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Generate Suggestions</CardTitle>
          <CardDescription>
            Enter the cost to store one unit of product per day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="w-full sm:w-64">
              <Label htmlFor="storageCost">Storage Cost per Unit/Day (₱)</Label>
              <Input
                id="storageCost"
                name="storageCost"
                type="number"
                step="0.01"
                placeholder="e.g., 2.50"
                defaultValue="2.50"
                required
              />
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
      
      {state.suggestions && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {state.suggestions.map((item) => (
              <Card key={item.productName} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-accent/10">
                      <Package className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <CardTitle>{item.productName}</CardTitle>
                       <CardDescription>Suggested Restock</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
                        <span className="text-sm font-medium text-muted-foreground">Quantity</span>
                        <div className="flex items-center gap-2">
                             <Truck className="w-5 h-5 text-primary" />
                            <span className="text-2xl font-bold text-primary">{item.suggestedRestockQuantity}</span>
                        </div>
                    </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Reasoning</AlertTitle>
                    <AlertDescription>{item.reasoning}</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
