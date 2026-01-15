
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';


export async function handleSignOut() {
    // For the mock auth, this will trigger the client-side logic to clear storage.
    // In a real scenario, this would also call Firebase sign out.
    revalidatePath('/', 'layout');
    redirect('/login');
}
