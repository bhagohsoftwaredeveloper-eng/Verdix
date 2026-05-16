import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
        const user = await db.user.findUnique({
            where: { username },
            include: {
                permissions: {
                    select: { permission: true }
                }
            }
        });

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
        const isValid = await compare(password, user.passwordHash || '');

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Fetch role info if userType is set
        let roleId = null;
        if (user.userType) {
            const role = await db.userType.findFirst({
                where: {
                    OR: [
                        { name: user.userType },
                        { id: user.userType }
                    ]
                }
            });
            roleId = role?.id || null;
        }

        const userPermissions = user.permissions.map((p) => p.permission);

        // Return user session data
        return NextResponse.json({
            uid: user.uid,
            username: user.username, // using "username" as the field
            email: user.username, // keeping "email" for compatibility if frontend expects it, or we can just use username
            userType: user.userType,
            roleId: roleId,
            displayName: user.displayName,
            photoURL: user.photoUrl,
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
