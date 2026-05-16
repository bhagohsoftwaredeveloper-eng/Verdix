import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, permissions } = body;

    await withTransaction(async (tx) => {
      if (name !== undefined || description !== undefined) {
        await tx.userType.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
          },
        });
      }

      if (permissions !== undefined) {
        await tx.userTypePermission.deleteMany({
          where: { userTypeId: id },
        });
        if (permissions.length > 0) {
          await tx.userTypePermission.createMany({
            data: permissions.map((permission: string) => ({
              id: uuidv4(),
              userTypeId: id,
              permission,
            })),
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating user type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if any users are using this type
    const userType = await db.userType.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!userType) {
      return NextResponse.json({ error: 'User type not found' }, { status: 404 });
    }

    const name = userType.name;

    const user = await db.user.findFirst({
      where: { userType: name },
    });
    if (user) {
      return NextResponse.json(
        { error: 'Cannot delete user type. It is currently assigned to one or more users.' },
        { status: 400 }
      );
    }

    await withTransaction(async (tx) => {
      await tx.userTypePermission.deleteMany({ where: { userTypeId: id } });
      await tx.userType.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
