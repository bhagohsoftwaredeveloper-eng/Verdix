import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const userTypesWithPermissions = await db.userType.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: true,
      },
    });

    const formattedUserTypes = userTypesWithPermissions.map((type) => ({
      ...type,
      permissions: type.permissions.map((p) => p.permission),
    }));

    return NextResponse.json(formattedUserTypes);
  } catch (error: any) {
    console.error('Error fetching user types:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = uuidv4();

    const userType = await withTransaction(async (tx) => {
      const newUserType = await tx.userType.create({
        data: {
          id,
          name,
          description: description || '',
          permissions: {
            create: (permissions || []).map((permission: string) => ({
              id: uuidv4(),
              permission,
            })),
          },
        },
        include: {
          permissions: true,
        }
      });
      return newUserType;
    });

    return NextResponse.json({
      ...userType,
      permissions: userType.permissions.map((p) => p.permission),
    });
  } catch (error: any) {
    console.error('Error creating user type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
