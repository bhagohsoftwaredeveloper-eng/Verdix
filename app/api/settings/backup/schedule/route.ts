
import { NextRequest, NextResponse } from 'next/server';
import { getSchedule, saveSchedule, BackupSchedule } from '@/lib/scheduler';

export async function GET() {
  const schedule = getSchedule();
  return NextResponse.json(schedule);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Basic validation
    if (typeof body.enabled !== 'boolean' || !body.frequency || !body.time) {
      return NextResponse.json({ error: 'Invalid schedule data' }, { status: 400 });
    }
    
    const newSchedule: BackupSchedule = {
      enabled: body.enabled,
      frequency: body.frequency,
      time: body.time,
      dayOfWeek: body.dayOfWeek
    };

    saveSchedule(newSchedule);
    
    return NextResponse.json({ success: true, message: 'Schedule updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
