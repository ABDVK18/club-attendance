import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  // 1. HARDWARE API SECURITY CHECK
  const apiKey = req.headers.get('x-api-key');

  if (apiKey !== process.env.API_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized access" }), { status: 401 });
  }

  // ... your existing database insert logic continues below ...
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing UID" }, { status: 400 });
    }

    // Clean UID formatting (uppercase, single spaces or no spaces matching your DB format)
    const formattedUid = uid.trim().toUpperCase();

    // 1. Look up the member's name
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('name')
      .eq('uid', formattedUid)
      .maybeSingle();

    const memberName = member ? member.name : "Unknown User";

    // 2. Fetch the most recent scan for this UID
    const { data: lastLog, error: logError } = await supabase
      .from('attendance_logs')
      .select('scan_time, status')
      .eq('uid', formattedUid)
      .order('scan_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();

    // 3. 20-Second Anti-Spam Guard
    if (lastLog && lastLog.scan_time) {
      const lastScanTime = new Date(lastLog.scan_time);
      const elapsedSeconds = (now.getTime() - lastScanTime.getTime()) / 1000;

      if (elapsedSeconds < 20) {
        return NextResponse.json({
          status: 'DUPLICATE',
          name: memberName,
          action: lastLog.status,
          message: `Ignored: wait ${Math.ceil(20 - elapsedSeconds)}s`
        });
      }
    }

    // 4. Toggle Status (First tap / after EXIT = ENTRY; after ENTRY = EXIT)
    let nextStatus = 'ENTRY';
    if (lastLog && lastLog.status === 'ENTRY') {
      nextStatus = 'EXIT';
    }

    // 5. Insert new record into attendance_logs
    const { error: insertError } = await supabase
      .from('attendance_logs')
      .insert([
        {
          uid: formattedUid,
          status: nextStatus,
          scan_time: now.toISOString()
        }
      ]);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'SUCCESS',
      name: memberName,
      action: nextStatus
    });

  } catch (err) {
    console.error("Attendance Logging Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      members (
        name
      )
    `)
    .order('scan_time', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const logsWithNames = data.map(log => ({
    ...log,
    name: log.members?.name || "Unknown"
  }));

  return NextResponse.json(logsWithNames);
}