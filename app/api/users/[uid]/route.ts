import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { hash } from 'bcryptjs';

// PUT /api/users/[uid] - Update user details and permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const body = await request.json();
    const { username, password, userType, permissions, displayName } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await withTransaction(async (tx) => {
      // Hash password if provided
      let passwordHash = undefined;
      if (password) {
        passwordHash = await hash(password, 10);
      }

      // Update user basic info
      const updateData: any = {
        username,
        displayName: displayName || username.split('@')[0]
      };

      if (passwordHash) {
        updateData.passwordHash = passwordHash;
      }

      await tx.user.update({
        where: { uid },
        data: updateData
      });

      // Update permissions - delete existing and create new ones
      await tx.userPermission.deleteMany({
        where: { userUid: uid }
      });

      // Create new permissions
      if (permissions && permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map((permission: string) => ({
            userUid: uid,
            permission
          }))
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
