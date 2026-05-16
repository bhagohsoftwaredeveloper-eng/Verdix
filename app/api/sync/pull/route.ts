import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lastSync = searchParams.get('last_sync');

    const productsWhere: any = {};
    if (lastSync) {
      productsWhere.updatedAt = { gt: new Date(lastSync) };
    }

    const [products, categories, brands, users, userPermissions] = await Promise.all([
      db.product.findMany({
        where: productsWhere
      }),
      db.category.findMany(),
      db.brand.findMany(),
      db.user.findMany({
        select: {
          uid: true,
          username: true,
          // passwordHash: true, // Original query selected 'password' but in Prisma it's 'passwordHash'
          userType: true,
          displayName: true,
          disabled: true,
          creationTime: true
        }
      }),
      db.userPermission.findMany()
    ]);

    // Map fields if necessary (e.g., uid to id if client expects that, but here it was uid)
    // Map passwordHash back to password for compatibility if needed? 
    // The original query selected 'password'.
    const formattedUsers = users.map(u => ({
        ...u,
        password: '' // Don't send passwords in sync
    }));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        products,
        categories,
        brands,
        users: formattedUsers,
        userPermissions
      }
    });
  } catch (error: any) {
    console.error('Failed to pull sync data:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to pull sync data'
    }, { status: 500 });
  }
}
