"use client";

import { useState, useEffect } from 'react';
import Background from '../components/Background';
import { supabase } from '../lib/supabase';

const AnimatedNumber = ({ target, duration = 1000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeOut * target));
      if (progress < 1) requestAnimationFrame(animate);
      else setCount(target);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return <>{count}</>;
};

export default function Dashboard() {
  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  
  const [newUid, setNewUid] = useState("");
  const [newName, setNewName] = useState("");

  // AI Insights States
  const [aiInsight, setAiInsight] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // AI Chat Assistant States
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello, sir! Ask me anything about your attendance logs or club members.' }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const triggerAction = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
    }, 3000);
  };

  useEffect(() => {
    const fetchLogs = async () => {
    try {
      const response = await fetch('/api/log');
      if (response.ok) {
        const data = await response.json();
        // FIX: The response IS the array, so pass it directly
        setLogs(data || []); 
      }
    } catch (error) {
      // Silently handle HMR aborts
    }
  };
    
    const fetchMembers = async () => {
      const { data } = await supabase.from('members').select('*').order('id', { ascending: true });
      if (data) setMembers(data);
    };

    fetchLogs();
    fetchMembers();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  // PAIRED SESSIONS ALGORITHM
  const pairedSessions = [];
  const openSessions = {};

[...logs].reverse().forEach(log => {
  // Convert raw UTC string to clean local time (e.g., "6:34 PM")
  const dateObj = new Date(log.scan_time);
  const logDate = dateObj.toISOString().split('T')[0];
  const cleanTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (log.status === 'ENTRY') {
    const session = { uid: log.uid, name: log.name, date: logDate, entryTime: cleanTime, exitTime: null };
    pairedSessions.push(session);
    openSessions[log.uid] = session;
  } else if (log.status === 'EXIT') {
    if (openSessions[log.uid]) {
      openSessions[log.uid].exitTime = cleanTime;
      openSessions[log.uid] = null;
    } else {
      pairedSessions.push({ uid: log.uid, name: log.name, date: logDate, entryTime: "---", exitTime: cleanTime });
    }
  }
});
  pairedSessions.reverse(); 

  const liveCount = pairedSessions.filter(s => s.exitTime === null && s.date === new Date().toISOString().split('T')[0]).length;
  const totalMembers = members.length;

  const handleDateSelect = (e) => {
    if (e.target.value) {
      setSelectedDate(e.target.value);
    }
  };

  const filteredModalLogs = pairedSessions.filter(session => session.date === selectedDate);

  const downloadReport = () => {
    triggerAction("Downloading CSV Report...");
    let csv = "Name,UID,Date,Entry Time,Exit Time\n";
    pairedSessions.forEach(s => {
      csv += `"${s.name}","${s.uid}","${s.date}","${s.entryTime}","${s.exitTime || 'ACTIVE'}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Club_Attendance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newUid || !newName) return;
    
    // 1. Strip non-alphanumeric chars, convert to uppercase, and split into 2-character chunks separated by a space
  const formattedUid = newUid.replace(/[^A-Za-z0-9]/g, '').toUpperCase().match(/.{1,2}/g)?.join(' ') || newUid;

  // 2. Insert into Supabase using the perfectly formatted UID
  const { error } = await supabase.from('members').insert([{ uid: formattedUid, name: newName }]);
    if (error) {
      triggerAction("Error: UID might already exist.", "error");
    } else {
      triggerAction(`Successfully registered ${newName}`, "info");
      setNewUid("");
      setNewName("");
      const { data } = await supabase.from('members').select('*');
      setMembers(data);
    }
  };

  const generateAiReport = async () => {
    setIsAiLoading(true);
    setAiInsight("");
    triggerAction("AI is analyzing database logs...");
    
    try {
      const res = await fetch('/api/insights');
      const data = await res.json();
      setAiInsight(data.insight || "Error generating insight.");
    } catch (e) {
      setAiInsight("Failed to reach the AI server.");
    }
    setIsAiLoading(false);
  };

  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isChatLoading) return;

    const userMsg = inputQuery;
    setInputQuery("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error connecting to AI query engine.' }]);
    }
    setIsChatLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white font-sans relative overflow-hidden selection:bg-[#0A84FF]/30">
      
      {/* VIBRANT AMBIENT LIGHTING */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0A84FF]/15 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#32D74B]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
      
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60 mix-blend-screen">
        <Background />
      </div>

      {/* TOAST NOTIFICATION */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full backdrop-blur-2xl bg-[#0F172A]/90 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-500 flex items-center gap-3
        ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}
        ${toast.type === 'error' ? 'border-[#FF453A]/50 text-white' : 'text-white'}
      `}>
        {toast.type === 'info' && <div className="w-2 h-2 rounded-full bg-[#0A84FF] animate-pulse shadow-[0_0_10px_#0A84FF]"></div>}
        {toast.type === 'error' && <div className="w-2 h-2 rounded-full bg-[#FF453A] animate-ping shadow-[0_0_10px_#FF453A]"></div>}
        <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
      </div>

      <div className="relative z-10 p-6 md:p-12 max-w-[1200px] mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 mb-8 gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-4 drop-shadow-md">Club Dashboard</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#0F172A]/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-[#32D74B] shadow-[0_0_10px_rgba(50,215,75,0.9)] animate-pulse"></div>
                <span className="text-xs font-semibold text-white/90 tracking-wide">System Online</span>
              </div>
              <p className="text-white/50 text-xs font-medium tracking-wide">ESP32 Hardware Sync</p>
            </div>
          </div>
          
        </header>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-[#1E293B] to-[#0B1221] shadow-[0_0_30px_rgba(59,130,246,0.15)] border border-blue-500/30 p-8 rounded-[1.5rem] hover:shadow-[0_0_40px_rgba(59,130,246,0.25)] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <h3 className="text-white/60 text-xs font-semibold tracking-wide">Master Roster</h3>
            </div>
            <h1 className="text-6xl font-bold tracking-tight text-white drop-shadow-sm">
              <AnimatedNumber target={totalMembers === 0 ? 124 : totalMembers} duration={2000} />
            </h1>
            <p className="text-xs text-white/50 mt-3 font-medium">Active registered nodes</p>
          </div>
          
          <div className="bg-gradient-to-br from-[#064E3B] to-[#022C22] shadow-[0_0_30px_rgba(16,185,129,0.15)] border border-emerald-500/30 p-8 rounded-[1.5rem] hover:shadow-[0_0_40px_rgba(16,185,129,0.25)] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <h3 className="text-white/60 text-xs font-semibold tracking-wide">Live Attendance</h3>
            </div>
            <h1 className="text-6xl font-bold tracking-tight text-[#34D399] drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              <AnimatedNumber target={liveCount} duration={1000} />
            </h1>
            <p className="text-xs text-white/50 mt-3 font-medium">Present today</p>
          </div>

          <div className="bg-gradient-to-br from-[#0F766E] to-[#042F2E] shadow-[0_0_30px_rgba(20,184,166,0.15)] border border-teal-500/30 p-8 rounded-[1.5rem] hover:shadow-[0_0_40px_rgba(20,184,166,0.25)] transition-all duration-300">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-5 h-5 text-teal-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <h3 className="text-white/60 text-xs font-semibold tracking-wide">Log Archive</h3>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between bg-black/40 border border-teal-400/30 rounded-xl p-3 shadow-inner hover:border-teal-400/50 transition-all cursor-text focus-within:border-teal-400">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={handleDateSelect} 
                  className="bg-transparent text-white/90 text-sm font-semibold focus:outline-none cursor-pointer w-full"
                  style={{ colorScheme: 'dark' }} 
                />
                <a 
                   href="/api/export" 
                   download="Club_Attendance_Master.xlsx" 
                  className="ml-2 px-4 py-2 bg-[#0A84FF] hover:bg-[#0970D9] active:scale-95 transition-all text-white text-xs font-bold rounded-lg shadow-md whitespace-nowrap"
                  >
  EXPORT EXCEL
</a>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#0F172A]/60 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/10 p-8 rounded-[1.5rem] min-h-[350px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white tracking-tight">Activity Feed</h3>
            </div>
            
            <div className="space-y-3">
              {pairedSessions.length === 0 ? (
                <div className="text-white/40 text-sm font-medium py-6 text-center border border-white/5 rounded-xl border-dashed">Waiting for hardware scans...</div>
              ) : (
                pairedSessions.slice(0, 5).map((session, index) => (
                  <div key={index} className="flex justify-between items-center bg-[#1E293B]/50 border border-white/5 p-4 rounded-xl hover:bg-[#1E293B] transition-colors shadow-sm cursor-default">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-[0_0_15px_rgba(0,0,0,0.2)] ${session.exitTime ? 'bg-slate-700' : 'bg-[#0A84FF] shadow-[0_0_15px_rgba(10,132,255,0.4)]'}`}>
                        {session.name ? session.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white/90">{session.name}</h4>
                        <p className="text-[10px] text-white/40 font-semibold mt-1 font-mono tracking-widest">UID: {session.uid}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-0.5">IN</span>
                        <span className="text-sm font-bold text-[#32D74B]">{session.entryTime}</span>
                      </div>
                      <span className="text-white/10 font-bold text-lg">➔</span>
                      <div className="flex flex-col text-left w-[70px]">
                        <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest mb-0.5">OUT</span>
                        <span className={`text-sm font-bold ${session.exitTime ? 'text-white/80' : 'text-[#FF453A] animate-pulse drop-shadow-[0_0_5px_rgba(255,69,58,0.5)]'}`}>
                          {session.exitTime || "ACTIVE"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#0F172A]/60 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/10 p-8 rounded-[1.5rem] flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-6">Settings</h3>
              <ul className="space-y-3">
                <li onClick={() => setShowRoster(true)} className="flex justify-between items-center p-4 bg-[#1E293B]/50 border border-white/5 hover:bg-[#1E293B] active:scale-[0.97] rounded-xl cursor-pointer transition-all shadow-sm group">
                  <span className="text-white/80 font-semibold text-sm group-hover:text-white">Manage Roster</span>
                  <svg className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </li>
                <li onClick={generateAiReport} className="flex justify-between items-center p-4 bg-[#1E293B]/50 border border-white/5 hover:bg-[#1E293B] active:scale-[0.97] rounded-xl cursor-pointer transition-all shadow-sm group">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A84FF] to-[#32D74B] font-bold text-sm group-hover:text-white transition-colors">✨ Generate AI Report</span>
                  <svg className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </li>
                <li onClick={() => setShowChat(true)} className="flex justify-between items-center p-4 bg-[#1E293B]/50 border border-white/5 hover:bg-[#1E293B] active:scale-[0.97] rounded-xl cursor-pointer transition-all shadow-sm group">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A84FF] to-[#32D74B] font-bold text-sm group-hover:text-white transition-colors">✨ AI Query Assistant</span>
                  <svg className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                </li>
              </ul>
            </div>
            <button onClick={() => triggerAction("EMERGENCY: System Halted!", "error")} className="w-full mt-8 py-4 bg-[#FF453A] text-white text-sm font-bold tracking-wide active:scale-[0.96] hover:bg-[#FF5147] transition-all rounded-xl shadow-[0_0_20px_rgba(255,69,58,0.4)]">
              Halt System
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)}></div>
          
          <div className="relative w-full max-w-2xl bg-[#0F172A] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 bg-black/40 border-b border-white/10">
              <h2 className="text-sm font-bold text-white/90 tracking-wide">{selectedDate} Grouped Sessions</h2>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/5 hover:bg-white/10 active:scale-90 rounded-full transition-all text-white/50 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {filteredModalLogs.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-sm font-semibold tracking-wide">No sessions recorded on this date.</div>
              ) : (
                filteredModalLogs.map((session, i) => (
                  <div key={i} className="flex justify-between items-center py-4 px-5 bg-white/5 border border-white/5 hover:bg-white/10 transition-colors rounded-xl">
                    <div>
                      <span className="text-white/90 text-sm font-bold block">{session.name}</span>
                      <span className="text-white/40 text-[10px] font-mono font-semibold tracking-widest block mt-1">{session.uid}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-black/40 px-5 py-2.5 rounded-lg border border-white/5">
                      <span className="text-[#32D74B] text-sm font-bold">{session.entryTime}</span>
                      <span className="text-white/20 text-sm">➔</span>
                      <span className={`text-sm font-bold ${session.exitTime ? 'text-white/80' : 'text-[#FF453A] drop-shadow-[0_0_5px_rgba(255,69,58,0.5)]'}`}>{session.exitTime || "INSIDE"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showRoster && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setShowRoster(false)}></div>
          
          <div className="relative w-full max-w-xl bg-[#0F172A] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 bg-black/40 border-b border-white/10">
              <h2 className="text-sm font-bold text-white/90 tracking-wide">Database Roster Management</h2>
              <button onClick={() => setShowRoster(false)} className="p-2 bg-white/5 hover:bg-white/10 active:scale-90 rounded-full transition-all text-white/50 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Register New Card</h3>
              <form onSubmit={handleAddMember} className="flex gap-3 mb-8">
                <input 
                  type="text" 
                  placeholder="Card UID (e.g. 89E2234B)" 
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-[#0A84FF] transition-colors"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-[#0A84FF] transition-colors"
                  required
                />
                <button type="submit" className="bg-[#0A84FF] hover:bg-[#0970D9] active:scale-[0.95] text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(10,132,255,0.4)]">
                  Add
                </button>
              </form>

              <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Current Members ({members.length})</h3>
              <div className="max-h-[30vh] overflow-y-auto border border-white/10 rounded-xl bg-black/40 shadow-inner">
                {members.map((member, i) => (
                  <div key={i} className="flex justify-between items-center py-3 px-5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <span className="text-white/90 text-sm font-bold">{member.name}</span>
                    <span className="text-white/40 text-[10px] font-mono font-bold tracking-widest bg-black/50 border border-white/10 px-2 py-1 rounded">{member.uid}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI INSIGHTS MODAL */}
      {(aiInsight || isAiLoading) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => !isAiLoading && setAiInsight("")}></div>
          
          <div className="relative w-full max-w-lg bg-[#0F172A] border border-blue-500/30 shadow-[0_0_50px_rgba(10,132,255,0.2)] rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 bg-black/40 border-b border-white/10">
              <h2 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#0A84FF] to-[#32D74B] tracking-wide">✨ AI Database Analysis</h2>
              {!isAiLoading && (
                <button onClick={() => setAiInsight("")} className="p-2 bg-white/5 hover:bg-white/10 active:scale-90 rounded-full transition-all text-white/50 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              )}
            </div>

            <div className="p-8 min-h-[150px] flex items-center justify-center">
              {isAiLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-t-[#0A84FF] border-r-[#32D74B] border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  <p className="text-white/50 text-xs font-semibold tracking-widest uppercase animate-pulse">Reading Database...</p>
                </div>
              ) : (
                <p className="text-white/90 text-sm leading-relaxed font-medium">
                  {aiInsight}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OUT CHAT DRAWER */}
      {showChat && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setShowChat(false)}></div>
          
          <div className="relative w-full max-w-md bg-[#0F172A] border-l border-white/10 shadow-2xl flex flex-col h-full z-10">
            <div className="flex items-center justify-between px-6 py-5 bg-black/40 border-b border-white/10">
              <h2 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#0A84FF] to-[#32D74B]">✨ Natural Language Assistant</h2>
              <button onClick={() => setShowChat(false)} className="p-2 bg-white/5 hover:bg-white/10 active:scale-90 rounded-full text-white/50 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed ${m.role === 'user' ? 'bg-[#0A84FF] text-white rounded-br-none shadow-md' : 'bg-[#1E293B] text-white/90 border border-white/5 rounded-bl-none shadow-inner'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#1E293B] p-4 rounded-2xl border border-white/5 text-white/40 text-xs animate-pulse">
                    Analyzing database logs...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendQuery} className="p-4 bg-black/40 border-t border-white/10 flex gap-2">
              <input 
                type="text" 
                placeholder="Ask e.g. Who scanned in today?" 
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#0A84FF] transition-colors"
              />
              <button type="submit" className="bg-[#0A84FF] hover:bg-[#0970D9] active:scale-95 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(10,132,255,0.4)]">
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}