import { NextRequest, NextResponse } from 'next/server';
import { saveEJournalFiles } from '@/lib/ejournal/ejournal-writer';

export async function POST(request: NextRequest) {
  try {
    const { date, terminalId } = await request.json();
    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }
    const result = await saveEJournalFiles(date, terminalId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error saving e-journal files:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
