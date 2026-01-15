import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RestockForm } from './restock-form';
import { Lightbulb } from 'lucide-react';

export default function RestockPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>AI-Powered Restock Suggestions</CardTitle>
              <CardDescription className="mt-1">
                Let AI analyze your sales data to suggest optimal restock quantities.
                <br />
                This tool helps you maintain inventory levels and minimize storage costs.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      <RestockForm />
    </div>
  );
}
