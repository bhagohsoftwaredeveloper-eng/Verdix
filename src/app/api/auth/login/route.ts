import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { compare } from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Fetch user from database
        const users = await query(
            'SELECT uid, username, password, user_type as userType, display_name as displayName, photo_url as photoURL, disabled FROM users WHERE username = ?',
            [username]
        ) as any[];

        const user = users[0];

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        if (user.disabled) {
            return NextResponse.json(
                { error: 'Account is disabled' },
                { status: 403 }
            );
        }

        // Verify password
        const isValid = await compare(password, user.password);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Fetch permissions
        const permissions = await query(
            'SELECT permission FROM user_permissions WHERE user_uid = ?',
            [user.uid]
        ) as any[];

        const userPermissions = permissions.map((p: any) => p.permission);

        // Return user session data
        return NextResponse.json({
            uid: user.uid,
            username: user.username, // using "username" as the field
            email: user.username, // keeping "email" for compatibility if frontend expects it, or we can just use username
            userType: user.userType,
            displayName: user.displayName,
            photoURL: user.photoURL,
            permissions: userPermissions,
        });
    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
