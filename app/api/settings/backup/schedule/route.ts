
import { NextRequest, NextResponse } from 'next/server';
import { getSchedule, saveSchedule, BackupSchedule } from '@/lib/scheduler';

export async function GET() {
  const schedule = getSchedule();
  return NextResponse.json(schedule);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Quality Assurance: Robust validation
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid enabled status' }, { status: 400 });
    }
    
    if (!['daily', 'weekly'].includes(body.frequency)) {
      return NextResponse.json({ error: 'Invalid frequency. Must be daily or weekly' }, { status: 400 });
    }
    
    if (!body.time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(body.time)) {
      return NextResponse.json({ error: 'Invalid time format. Must be HH:MM (24h)' }, { status: 400 });
    }

    if (body.frequency === 'weekly' && (typeof body.dayOfWeek !== 'number' || body.dayOfWeek < 0 || body.dayOfWeek > 6)) {
      return NextResponse.json({ error: 'Invalid day of week for weekly frequency' }, { status: 400 });
    }
    
    const newSchedule: BackupSchedule = {
      enabled: body.enabled,
      frequency: body.frequency as 'daily' | 'weekly',
      time: body.time,
      dayOfWeek: body.dayOfWeek
    };

    saveSchedule(newSchedule);
    
    return NextResponse.json({ success: true, message: 'Schedule updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}
