import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sendReportEmail } from '@/lib/email';

const ticketsPath = path.join(process.cwd(), 'src/data/tickets.json');

function getTickets() {
  try {
    const data = fs.readFileSync(ticketsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function GET(req: NextRequest) {
  // Simple authorization to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'secret123'}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const tickets = getTickets();
    await sendReportEmail(tickets);
    return NextResponse.json({ success: true, message: 'Report sent successfully' });
  } catch (error: any) {
    console.error('Error sending report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
