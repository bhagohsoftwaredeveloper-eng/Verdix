import { query } from '@/lib/mysql';
import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = 'http://192.168.1.13:3000/api/accounts';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        // Fetch data from local database
        let sql = 'SELECT * FROM accounts ORDER BY name ASC';
        const params: any[] = [];

        if (type) {
            sql = 'SELECT * FROM accounts WHERE type = ? ORDER BY name ASC';
            params.push(type);
        }

        const accounts = await query(sql, params);

        // Map database fields to API response format
        const formattedAccounts = accounts.map((account: any) => ({
            id: account.id,
            name: account.name,
            code: account.code,
            category: account.type === 'income' ? 'Income' : 'Expense',
            type: account.type,
            created_at: account.created_at,
            updated_at: account.updated_at,
        }));

        return NextResponse.json(formattedAccounts);
    } catch (error) {
        console.error('Error fetching accounts from database:', error);
        return NextResponse.json({ error: 'Error fetching accounts' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, type, code } = body;

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
        }

        const accountId = `account_${Date.now()}`;
        const sql = `INSERT INTO accounts (id, name, type, code) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), code = VALUES(code)`;

        await query(sql, [accountId, name, type, code || null]);

        const newAccount = { id: accountId, name, type, code };
        return NextResponse.json({ success: true, account: newAccount }, { status: 201 });
    } catch (error) {
        console.error('Error adding account:', error);
        return NextResponse.json({ error: 'Error adding account' }, { status: 500 });
    }
}
