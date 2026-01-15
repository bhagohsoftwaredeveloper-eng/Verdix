'use client';

import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAccounts, addAccount, updateAccount, deleteAccount } from './actions';

function AccountDialog({ account, onSave, children, disabled }: { account?: Account, onSave: (name: string, type: 'income' | 'expense', code?: string) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState(account?.name || '');
    const [type, setType] = useState<'income' | 'expense'>(account?.type || 'income');
    const [code, setCode] = useState(account?.code || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (!name.trim()) {
            toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'Account name cannot be empty.',
            });
            return;
        }
        if (!type) {
            toast({
                variant: 'destructive',
                title: 'Validation Error',
                description: 'Account type is required.',
            });
            return;
        }
        setIsSaving(true);
        try {
            await onSave(name, type, code || undefined);
            toast({
                title: account ? 'Account Updated' : 'Account Added',
                description: `Account "${name}" has been successfully saved.`,
            });
            setIsOpen(false);
            if (!account) {
                setName('');
                setCode('');
                setType('income');
            }
        } catch (error) {
            console.error('Failed to save account', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to save account. Please try again.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{account ? 'Edit Account' : 'Add New Account'}</DialogTitle>
                    <DialogDescription>
                        {account ? `Editing the account "${account.name}".` : 'Enter the details for the new account.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., Sales Revenue"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <Select value={type} onValueChange={(value: 'income' | 'expense') => setType(value)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="income">Income</SelectItem>
                                <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">
                            Code
                        </Label>
                        <Input
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., 4000 (optional)"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !name.trim() || !type}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSaving ? 'Saving...' : 'Save Account'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AccountRow({ account, onAccountUpdated, onAccountDeleted }: { account: Account; onAccountUpdated: () => void; onAccountDeleted: () => void }) {
    const { toast } = useToast();

    const handleUpdate = async (name: string, type: 'income' | 'expense', code?: string) => {
        const result = await updateAccount(account.id, name, type, code);
        if (result.success) {
            toast({
                title: 'Account Updated',
                description: result.message,
            });
            onAccountUpdated();
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message,
            });
        }
    };

    const handleDelete = async () => {
        const result = await deleteAccount(account.id);
        if (result.success) {
            toast({
                title: 'Account Deleted',
                description: result.message,
            });
            onAccountDeleted();
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message,
            });
        }
    };

    return (
        <TableRow>
            <TableCell className="font-medium">{account.name}</TableCell>
            <TableCell>{account.type === 'income' ? 'Income' : 'Expense'}</TableCell>
            <TableCell>{account.code || '-'}</TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <AccountDialog account={account} onSave={handleUpdate}>
                        <Button variant="outline" size="sm">
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    </AccountDialog>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

function AccountSkeleton() {
    return (
        <TableRow>
            <TableCell>
                <Skeleton className="h-5 w-48" />
            </TableCell>
            <TableCell>
                <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
                <Skeleton className="h-5 w-12" />
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-28" />
                </div>
            </TableCell>
        </TableRow>
    );
}

export function ManageAccountsDialog({ trigger, onAccountAdded, onAccountUpdated }: { trigger?: React.ReactNode; onAccountAdded?: (account: Account) => void; onAccountUpdated?: () => void }) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshAccounts = async () => {
        try {
            const loadedAccounts = await getAccounts();
            setAccounts(loadedAccounts || []);
        } catch (error) {
            console.error('Error loading accounts', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshAccounts();
    }, []);

    const handleAddAccount = async (name: string, type: 'income' | 'expense', code?: string) => {
        const result = await addAccount(name, type, code);
        if (result.success) {
            await refreshAccounts();
            if (result.account) {
                onAccountAdded?.(result.account as Account);
            } else if (result.accountId) {
                onAccountAdded?.({ id: result.accountId, name, type, code } as Account);
            }
        }
    };

    const handleAccountUpdate = () => {
        refreshAccounts();
        onAccountUpdated?.();
    };

    const dialogTrigger = trigger || (
        <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Manage Accounts
        </Button>
    );

    return (
        <Dialog>
            <DialogTrigger asChild>
                {dialogTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Manage Accounts</DialogTitle>
                    <DialogDescription>
                        Add, edit, or delete your income and expense accounts for proper accounting.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <div className="flex justify-end mb-4">
                        <AccountDialog onSave={handleAddAccount}>
                            <Button size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Account
                            </Button>
                        </AccountDialog>
                    </div>
                    <Card>
                        <CardContent className='p-0'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Code</TableHead>
                                        <TableHead>
                                            <span className="sr-only">Actions</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && Array.from({ length: 4 }).map((_, i) => <AccountSkeleton key={i} />)}
                                    {!isLoading && accounts.map((account) => (
                                        <AccountRow key={account.id} account={account} onAccountUpdated={handleAccountUpdate} onAccountDeleted={handleAccountUpdate} />
                                    ))}
                                    {!isLoading && accounts.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">
                                                No accounts found. Add an account to get started.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <DialogFooter>
                    <DialogTrigger asChild>
                        <Button variant="outline">Close</Button>
                    </DialogTrigger>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
