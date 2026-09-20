import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ insight: "Configuration Error: GEMINI_API_KEY is missing from .env.local." });
    }

    const { data: logs, error } = await supabase
      .from('attendance_logs')
      .select('id, uid, scan_time, status')
      .order('scan_time', { ascending: false })
      .limit(50);
    
    if (error) {
      return NextResponse.json({ insight: `Supabase Error: ${error.message}` });
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ insight: "Not enough data to generate an AI insight yet. Run some hardware scans first!" });
    }

    const systemPrompt = `You are an AI assistant managing a club attendance system. Analyze the following JSON logs. 
    1. Identify peak entry times.
    2. Point out any missing exits (people who scanned IN but never scanned OUT).
    3. Keep your response under 4 sentences, professional, and directly actionable.
    
    Raw Logs: ${JSON.stringify(logs)}`;

    // Pass AQ. key via x-goog-api-key header instead of query param
    // Update model name to match your active Google AI Studio key tier
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });
    const aiData = await aiResponse.json();

    if (aiData.error) {
      return NextResponse.json({ insight: `Google API Error: ${aiData.error.message}` });
    }

    const finalText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "AI returned an empty response structure.";

    return NextResponse.json({ insight: finalText });

  } catch (err) {
    console.error("AI Insights Fatal Error:", err);
    return NextResponse.json({ insight: `Server Crash: ${err.message}` }, { status: 500 });
  }
}