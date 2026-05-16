import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
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
    // Fetch all users with their permissions
    const users = await db.user.findMany({
      include: {
        permissions: {
          select: { permission: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map users with their permissions
    const usersWithPermissions = users.map((user: typeof users[0]) => ({
      uid: user.uid,
      email: user.username,
      displayName: user.displayName,
      photoURL: user.photoUrl,
      disabled: user.disabled,
      creationTime: user.creationTime.toISOString(),
      permissions: user.permissions.map((p: typeof user.permissions[0]) => p.permission),
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

export async function POST(request: NextRequest) {
  console.log('[ROOT API/Users] POST request received');
  try {
    const body = await request.json();
    const { password, userType, permissions, displayName } = body;
    const username = body.username || body.email;

    if (!username) {
      return NextResponse.json(
        { error: 'Username or Email is required' },
        { status: 400 }
      );
    }

    const uid = uuidv4();

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await hash(password, 10);
    }

    const user = await withTransaction(async (tx) => {
      // Create user with permissions
      const newUser = await tx.user.create({
        data: {
          uid,
          username,
          passwordHash: hashedPassword,
          displayName: displayName || username.split('@')[0],
          photoUrl: '',
          disabled: false,
          creationTime: new Date(),
          permissions: {
            create: (permissions || []).map((permission: string) => ({
              permission
            }))
          }
        },
        include: {
          permissions: {
            select: { permission: true }
          }
        }
      });

      return newUser;
    });

    return NextResponse.json({
      uid: user.uid,
      username: user.username,
      email: user.username,
      userType: userType || 'User',
      displayName: user.displayName,
      photoURL: user.photoUrl,
      disabled: user.disabled,
      creationTime: user.creationTime.toISOString(),
      permissions: user.permissions.map((p: typeof user.permissions[0]) => p.permission),
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
    const { uid, permissions, disabled } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'User UID is required' }, { status: 400 });
    }

    await withTransaction(async (tx) => {
      // Update disabled status if provided
      if (disabled !== undefined) {
        await tx.user.update({
          where: { uid },
          data: { disabled }
        });
      }

      // Update permissions if provided
      if (permissions !== undefined) {
        // Delete existing permissions
        await tx.userPermission.deleteMany({
          where: { userUid: uid }
        });

        // Create new permissions
        if (permissions.length > 0) {
          await tx.userPermission.createMany({
            data: permissions.map((permission: string) => ({
              userUid: uid,
              permission
            }))
          });
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

    // Check for dependencies
    const posTransactionCount = await db.posTransaction.count({
      where: { userId: uid }
    });

    const shiftCount = await db.shift.count({
      where: { userId: uid }
    });

    const auditLogCount = await db.paymentAuditLog.count({
      where: { userId: uid }
    });

    const cashTransferCount = await db.cashTransfer.count({
      where: { userId: uid }
    });

    if (posTransactionCount > 0 || shiftCount > 0 || auditLogCount > 0 || cashTransferCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete user. This user has associated transactions, shifts, or cash transfer records. For data integrity, these users cannot be deleted. Consider disabling the account instead.' },
        { status: 400 }
      );
    }

    await withTransaction(async (tx) => {
      // Delete user permissions first
      await tx.userPermission.deleteMany({
        where: { userUid: uid }
      });

      // Delete user
      await tx.user.delete({
        where: { uid }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
