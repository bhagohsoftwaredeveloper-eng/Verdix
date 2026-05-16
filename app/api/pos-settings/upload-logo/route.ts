import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PNG, JPG, and JPEG are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 2MB limit' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'business');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `logo_${timestamp}.${extension}`;
    const filepath = join(uploadDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Generate public URL path
    const publicPath = `/uploads/business/${filename}`;

    // Update pos_settings with new logo path
    const settings = await db.posSettings.findFirst();
    if (settings) {
      await db.posSettings.update({
        where: { id: settings.id },
        data: { logoPath: publicPath }
      });
    } else {
      // Create if doesn't exist
      await db.posSettings.create({
        data: {
          businessName: 'Stock Pilot', // Default or from config
          logoPath: publicPath
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoPath: publicPath
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
