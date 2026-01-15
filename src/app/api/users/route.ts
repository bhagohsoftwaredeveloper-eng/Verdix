import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'bcryptjs';

export type UserWithPermissions = {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    disabled: boolean;
    creationTime: string;
    permissions: string[];
};

// GET /api/users - List all users with their permissions
export async function GET() {
    try {
        // Fetch users from MySQL
        const users = await query('SELECT uid, username as email, user_type as userType, display_name as displayName, photo_url as photoURL, disabled, creation_time as creationTime FROM users ORDER BY creation_time DESC');

        // Fetch permissions for each user
        const permissions = await query('SELECT user_uid, permission FROM user_permissions');

        // Group permissions by user
        const permissionsByUser = (permissions || []).reduce((acc: any, curr: any) => {
            if (!acc[curr.user_uid]) acc[curr.user_uid] = [];
            acc[curr.user_uid].push(curr.permission);
            return acc;
        }, {});

        // Map users with their permissions
        const usersWithPermissions = (users || []).map((user: any) => ({
            ...user,
            disabled: !!user.disabled,
            permissions: permissionsByUser[user.uid] || [],
        }));

        return NextResponse.json(usersWithPermissions);
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
    console.log('[SRC API/Users] POST request received');
    try {
        const body = await request.json();
        console.log('[SRC API/Users] Request body:', JSON.stringify(body));
        const username = body.username || body.email;
        const { password, userType, permissions } = body;

        if (!username) {
            return NextResponse.json(
                { error: 'Username or Email is required' },
                { status: 400 }
            );
        }

        const uid = uuidv4();
        const creationTime = new Date().toISOString();

        // Hash password if provided
        let hashedPassword = null;
        if (password) {
            hashedPassword = await hash(password, 10);
        }

        await withTransaction(async (connection) => {
            // Insert user
            await connection.execute(
                'INSERT INTO users (uid, username, password, user_type, display_name, photo_url, disabled, creation_time) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [uid, username, hashedPassword, userType || 'User', username.split('@')[0], '', false]
            );

            // Insert permissions
            if (permissions && permissions.length > 0) {
                for (const permission of permissions) {
                    await connection.execute(
                        'INSERT INTO user_permissions (id, user_uid, permission) VALUES (?, ?, ?)',
                        [uuidv4(), uid, permission]
                    );
                }
            }
        });

        return NextResponse.json({
            uid,
            email: username,
            userType: userType || 'User',
            displayName: username.split('@')[0],
            photoURL: '',
            disabled: false,
            creationTime,
            permissions: permissions || [],
        });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create user' },
            { status: 500 }
        );
    }
}

// PATCH /api/users - Update user permissions
export async function PATCH(request: NextRequest) {
    try {
        const { uid, permissions } = await request.json();

        if (!uid) {
            return NextResponse.json({ error: 'User UID is required' }, { status: 400 });
        }

        await withTransaction(async (connection) => {
            // Delete existing permissions
            await connection.execute('DELETE FROM user_permissions WHERE user_uid = ?', [uid]);

            // Insert new permissions
            if (permissions && permissions.length > 0) {
                for (const permission of permissions) {
                    await connection.execute(
                        'INSERT INTO user_permissions (id, user_uid, permission) VALUES (?, ?, ?)',
                        [uuidv4(), uid, permission]
                    );
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating user permissions:', error);
        return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
    }
}

// DELETE /api/users - Delete a user
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'User UID is required' }, { status: 400 });
        }

        await query('DELETE FROM users WHERE uid = ?', [uid]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
    }
}
