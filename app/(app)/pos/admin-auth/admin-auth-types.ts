export interface AdminAuthDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  requiredCredentials?: { username?: string | null; password?: string | null } | null;
  title?: string;
  description?: string;
  /** When true, the dialog won't restore focus to the trigger on close. */
  preventCloseAutoFocus?: boolean;
}
