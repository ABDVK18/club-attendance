import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ answer: "Configuration Error: GEMINI_API_KEY is missing." });
    }

    // Fetch recent logs and roster members for context
    const { data: logs } = await supabase.from('attendance_logs').select('*').order('scan_time', { ascending: false }).limit(100);
    const { data: members } = await supabase.from('members').select('*');

    const systemPrompt = `You are an intelligent assistant for a club attendance dashboard. 
    You have access to the current club members roster and recent attendance logs.
    Answer the user's question accurately, concisely, and professionally based on the data provided.
    
    Members Roster: ${JSON.stringify(members)}
    Recent Logs: ${JSON.stringify(logs)}
    
    User Question: "${prompt}"`;

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
    const answer = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that query.";

    return NextResponse.json({ answer });

  } catch (err) {
    console.error("Query API Error:", err);
    return NextResponse.json({ answer: "Server error processing query." }, { status: 500 });
  }
}