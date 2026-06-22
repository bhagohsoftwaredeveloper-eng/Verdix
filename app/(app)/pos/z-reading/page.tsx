'use client';

import { Dialog } from '@/components/ui/dialog';
import { AdminAuthDialog } from '../admin-auth/AdminAuthDialog';
import { ZReadingReportView } from './ZReadingReportView';
import { useZReading } from './use-z-reading';

export default function ZReadingPage() {
  const { isAuthDialogOpen, setIsAuthDialogOpen, showReport, handleAdminAuthSuccess } = useZReading();

  if (!showReport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AdminAuthDialog
          isOpen={isAuthDialogOpen}
          onOpenChange={setIsAuthDialogOpen}
          onSuccess={handleAdminAuthSuccess}
        />
      </div>
    );
  }

  return (
    <>
      <ZReadingReportView />
      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <AdminAuthDialog
          isOpen={isAuthDialogOpen}
          onOpenChange={setIsAuthDialogOpen}
          onSuccess={handleAdminAuthSuccess}
        />
      </Dialog>
    </>
  );
}
