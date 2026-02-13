import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'http://192.168.1.246:3000/api/accounts';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
             return NextResponse.json({ error: 'External API Error' }, { status: response.status });
        }

        const accounts = await response.json();
        
        let filteredAccounts = accounts;
        if (type) {
            filteredAccounts = accounts.filter((a: any) => (a.type || '').toLowerCase() === type.toLowerCase());
        }

        // Map to expected format if needed, or pass through
        const formattedAccounts = filteredAccounts.map((account: any) => ({
            id: account.id || account.Id || account.accountId,
            name: account.name || account.Name || account.accountName || 'Unknown',
            code: account.code || account.Code || '',
            category: (account.type === 'income' || account.type === 'Income') ? 'Income' : 'Expense',
            type: (account.type || '').toLowerCase(),
            created_at: account.created_at || account.date_created,
            updated_at: account.updated_at || account.last_updated_at,
        }));

        return NextResponse.json(formattedAccounts);
    } catch (error) {
        console.error('Error fetching accounts from external API:', error);
        return NextResponse.json({ error: 'Error fetching accounts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to add account to external API' }, { status: response.status });
        }

        const newAccount = await response.json();
        return NextResponse.json({ success: true, account: newAccount }, { status: 201 });
    } catch (error) {
        console.error('Error adding account:', error);
        return NextResponse.json({ error: 'Error adding account' }, { status: 500 });
    }
}
