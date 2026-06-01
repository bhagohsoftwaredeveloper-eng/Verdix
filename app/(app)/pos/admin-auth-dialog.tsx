
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getApiUrl } from '@/lib/api-config';

interface AdminAuthDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  requiredCredentials?: {
    username?: string | null;
    password?: string | null;
  } | null;
  title?: string;
  description?: string;
  /** When true, the dialog won't restore focus to the trigger on close
   *  (lets the caller move focus to an inline editor instead). */
  preventCloseAutoFocus?: boolean;
}

export function AdminAuthDialog({
  isOpen,
  onOpenChange,
  onSuccess,
  requiredCredentials,
  title,
  description,
  preventCloseAutoFocus,
}: AdminAuthDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setIsProcessing(false);
      setError(null);
    }
  }, [isOpen]);

  const handleAuthenticate = async () => {
    setIsProcessing(true);
    setError(null);

    // If custom credentials are required (e.g. for Void/Return), validate locally
    if (requiredCredentials) {
        // Simple local validation
        // We only check password if it is set in the required credentials
        // If username is set, we check that too
        
        const validUser = !requiredCredentials.username || requiredCredentials.username === username;
        const validPass = !requiredCredentials.password || requiredCredentials.password === password;

        if (validUser && validPass) {
             // Simulate a small delay for better UX
             setTimeout(() => {
                 onSuccess();
                 onOpenChange(false);
                 setIsProcessing(false);
             }, 500);
             return;
        } else {
            setError('Invalid credentials');
            setPassword('');
            setIsProcessing(false);
            return;
        }
    }

    try {
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        // The API returns user data directly in result (not result.user)
        const user = result;
        const userType = user.userType || '';
        const permissions = user.permissions || [];
        const userTypeUpper = (userType || '').toUpperCase();
        const hasPermission = userTypeUpper === 'ADMIN' || 
                             userTypeUpper === 'SUPER_ADMIN' ||
                             userTypeUpper === 'MANAGER' ||
                             permissions.includes('manage_settings') || 
                             permissions.includes('manage_users') ||
                             permissions.includes('edit_price') || 
                             permissions.includes('super_admin');

        if (hasPermission) {
          onSuccess();
          onOpenChange(false);
        } else {
          setError('You do not have permission to perform this action.');
          setPassword('');
        }
      } else {
        setError(result.error || 'Invalid credentials');
        setPassword('');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={preventCloseAutoFocus ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title || 'Admin Authentication Required'}
            {error && (
              <Badge variant="destructive" className="px-2 py-0.5 animate-in zoom-in-95 duration-300">
                <XCircle className="w-3 h-3 mr-1" />
                Invalid
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {description || 'Enter admin credentials to authorize this action.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {error && (
            <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="admin-username">Username</Label>
            <Input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin username"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
              placeholder="Admin password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAuthenticate}
            disabled={isProcessing || !password}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Authenticate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
