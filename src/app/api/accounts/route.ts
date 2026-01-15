import { query } from '@/lib/mysql';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        let sql = `SELECT * FROM accounts`;
        const params: any[] = [];

        if (type && (type === 'income' || type === 'expense')) {
            sql += ` WHERE type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY type ASC, name ASC`;

        const accounts = await query(sql, params);
        return NextResponse.json(accounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
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
