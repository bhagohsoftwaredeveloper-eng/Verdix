import { Metadata } from 'next';
import ShelfBoard from './ShelfBoard';

export const metadata: Metadata = {
  title: 'Shelf Transfer Board | StockPilot',
  description: 'Manage and transfer product shelf locations using a Kanban-style board.',
};

export default function ShelfTransferBoardPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Shelf Transfer Board</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Drag and drop products to manage their shelf locations.</p>
        </div>
      </div>
      <div className="flex-1 w-full overflow-hidden relative z-0">
        <ShelfBoard />
      </div>
    </div>
  );
}
