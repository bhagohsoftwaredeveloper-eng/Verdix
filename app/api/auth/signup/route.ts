import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { username: email }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);
    const uid = uuidv4();

    // Create user
    // Defaulting userType to 'Cashier'
    await db.user.create({
      data: {
        uid,
        username: email,
        passwordHash: hashedPassword,
        displayName: email.split('@')[0],
        userType: 'Cashier',
        disabled: false,
        photoUrl: '',
      }
    });

    // Add default permissions if needed (optional for now, can be expanded)
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully'
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
