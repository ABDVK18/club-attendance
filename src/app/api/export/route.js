import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // 1. Fetch all attendance logs joined with member names
    const { data: rawLogs, error } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        members (
          name
        )
      `)
      .order('scan_time', { ascending: true }); // Chronological order to pair sessions properly

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rawLogs || rawLogs.length === 0) {
      return NextResponse.json({ error: "No attendance logs found to export" }, { status: 404 });
    }

    // 2. Flatten and group scans by Date (IST / Local Date)
    // Map logs to clean IST strings
    const logsByDate = {};

    rawLogs.forEach(log => {
      const dateObj = new Date(log.scan_time);
      // Group by IST Date (YYYY-MM-DD)
      const dateStr = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // Format: YYYY-MM-DD

      if (!logsByDate[dateStr]) {
        logsByDate[dateStr] = [];
      }

      logsByDate[dateStr].push({
        uid: log.uid,
        name: log.members?.name || "Unknown",
        status: log.status,
        date: dateStr,
        time: dateObj.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      });
    });

    // 3. Create an Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Club Attendance System';
    workbook.created = new Date();

    // 4. For each unique date, generate a separate Worksheet (Tab)
    const dates = Object.keys(logsByDate).sort();

    dates.forEach(date => {
      const dayLogs = logsByDate[date];
      const worksheet = workbook.addWorksheet(date);

      // Define columns with auto-formatting
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Card UID', key: 'uid', width: 18 },
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Entry Time', key: 'entryTime', width: 15 },
        { header: 'Exit Time', key: 'exitTime', width: 15 },
        { header: 'Status', key: 'sessionStatus', width: 14 }
      ];

      // Style header row (Dark Navy fill, bold white text)
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Pair ENTRY and EXIT scans into sessions
      const pairedSessions = [];
      const openSessions = {};

      dayLogs.forEach(log => {
        if (log.status === 'ENTRY') {
          const session = {
            name: log.name,
            uid: log.uid,
            date: log.date,
            entryTime: log.time,
            exitTime: 'ACTIVE',
            sessionStatus: 'PRESENT'
          };
          pairedSessions.push(session);
          openSessions[log.uid] = session;
        } else if (log.status === 'EXIT') {
          if (openSessions[log.uid]) {
            openSessions[log.uid].exitTime = log.time;
            openSessions[log.uid].sessionStatus = 'COMPLETED';
            openSessions[log.uid] = null;
          } else {
            // Exit without entry record
            pairedSessions.push({
              name: log.name,
              uid: log.uid,
              date: log.date,
              entryTime: '---',
              exitTime: log.time,
              sessionStatus: 'UNPAIRED EXIT'
            });
          }
        }
      });

      // Add paired rows to the worksheet
      pairedSessions.forEach(session => {
        const row = worksheet.addRow(session);
        row.alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // Add a thin border to all populated cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });
    });

    // 5. Generate binary buffer and send as .xlsx file
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="Club_Attendance_Master.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Cache-Control': 'no-store'
      }
    });

  } catch (err) {
    console.error("Export Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}