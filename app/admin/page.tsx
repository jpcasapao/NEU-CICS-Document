"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from "firebase/firestore";
import { supabase } from "@/lib/supabase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
 
type UserRecord = { id: string; email: string; program: string; isBlocked: boolean; displayName?: string };
type DocRecord = { id: string; title: string; category: string; program?: string; storagePath?: string; fileURL: string; createdAt?: any };
 
const TABS = [
  { key: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { key: "upload", label: "Upload Document", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
  { key: "docs", label: "Document Library", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "users", label: "Access Control", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { key: "logs", label: "Audit History", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];
 
const CATEGORIES = ["Announcement", "Form", "Guideline", "Memo", "Syllabus", "Thesis", "Others"];
const PROGRAMS = ["CS", "IT", "IS", "EMC"];
 
export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [programTarget, setProgramTarget] = useState<"all" | "specific">("all");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [tab, setTab] = useState("dashboard");
  const [adminName, setAdminName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [stats, setStats] = useState({ users: 0, logins: 0, downloads: 0, documents: 0 });
  const [chartData, setChartData] = useState<{ date: string; logins: number; downloads: number }[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const router = useRouter();
 
  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser;
      if (!user) { router.push("/"); return; }
      setAdminName(user.displayName || "Admin");
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists() || snap.data().role !== "admin") router.push("/student");
    };
    check(); fetchUsers(); fetchDocuments();
  }, [router]);
 
  useEffect(() => {
    Promise.all([fetchStats(), fetchChartData(), fetchAuditLogs()]);
  }, [dateFilter, customStart, customEnd]);
 
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    if (dateFilter === "daily") start.setDate(end.getDate() - 1);
    else if (dateFilter === "weekly") start.setDate(end.getDate() - 7);
    else if (dateFilter === "monthly") start.setMonth(end.getMonth() - 1);
    else if (dateFilter === "custom" && customStart && customEnd) {
      return { start: new Date(customStart), end: new Date(customEnd + "T23:59:59") };
    }
    return { start, end };
  };
 
  const fetchStats = async () => {
    const { start, end } = getDateRange();
    const [usersSnap, docsSnap, loginsSnap, downloadsSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "documents")),
      getDocs(query(collection(db, "logins"), where("timestamp", ">=", Timestamp.fromDate(start)), where("timestamp", "<=", Timestamp.fromDate(end)))),
      getDocs(query(collection(db, "logs"), where("timestamp", ">=", Timestamp.fromDate(start)), where("timestamp", "<=", Timestamp.fromDate(end)))),
    ]);
    setStats({ users: usersSnap.size, logins: loginsSnap.size, downloads: downloadsSnap.size, documents: docsSnap.size });
  };
 
  const fetchChartData = async () => {
    const { start, end } = getDateRange();
    const [loginsSnap, downloadsSnap] = await Promise.all([
      getDocs(query(collection(db, "logins"), where("timestamp", ">=", Timestamp.fromDate(start)), where("timestamp", "<=", Timestamp.fromDate(end)))),
      getDocs(query(collection(db, "logs"), where("timestamp", ">=", Timestamp.fromDate(start)), where("timestamp", "<=", Timestamp.fromDate(end)))),
    ]);
    const loginsByDay: Record<string, number> = {};
    const downloadsByDay: Record<string, number> = {};
    loginsSnap.docs.forEach(d => {
      const ts = d.data().timestamp?.toDate();
      if (ts) { const key = ts.toLocaleDateString("en-US", { month: "short", day: "numeric" }); loginsByDay[key] = (loginsByDay[key] || 0) + 1; }
    });
    downloadsSnap.docs.forEach(d => {
      const ts = d.data().timestamp?.toDate();
      if (ts) { const key = ts.toLocaleDateString("en-US", { month: "short", day: "numeric" }); downloadsByDay[key] = (downloadsByDay[key] || 0) + 1; }
    });
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const numDays = Math.min(diff, 14);
    const days = [];
    for (let i = numDays; i >= 0; i--) {
      const d = new Date(end); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({ date: key, logins: loginsByDay[key] || 0, downloads: downloadsByDay[key] || 0 });
    }
    setChartData(days);
  };
 
  const fetchAuditLogs = async () => {
    const { start, end } = getDateRange();
    const [logsSnap, usersSnap, docsSnap] = await Promise.all([
      getDocs(query(collection(db, "logs"), where("timestamp", ">=", Timestamp.fromDate(start)), where("timestamp", "<=", Timestamp.fromDate(end)), orderBy("timestamp", "desc"))),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "documents")),
    ]);
    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach(d => { userMap[d.id] = d.data().email || d.id; });
    const docMap: Record<string, string> = {};
    docsSnap.docs.forEach(d => { docMap[d.id] = d.data().title || d.id; });
    setAuditLogs(logsSnap.docs.map(d => ({
      id: d.id, ...d.data(),
      userEmail: userMap[d.data().userId] || d.data().userId,
      docTitle: docMap[d.data().documentId] || d.data().documentId,
    })));
  };
 
  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRecord)));
  };
 
  const fetchDocuments = async () => {
    const snap = await getDocs(collection(db, "documents"));
    setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as DocRecord)));
  };
 
  const toggleProgram = (p: string) => {
    setSelectedPrograms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };
 
  const handleUpload = async () => {
    if (!file || !title || !category) return;
    if (programTarget === "specific" && selectedPrograms.length === 0) {
      setMessage({ type: "error", text: "Please select at least one program." }); return;
    }
    setUploading(true); setMessage(null);
    const storagePath = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("cics-documents").upload(storagePath, file, { contentType: "application/pdf" });
    if (error) { setMessage({ type: "error", text: "Upload failed: " + error.message }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("cics-documents").getPublicUrl(storagePath);
    await addDoc(collection(db, "documents"), {
      title, category,
      program: programTarget === "all" ? "All" : selectedPrograms.join(","),
      programs: programTarget === "all" ? ["CS","IT","IS","EMC"] : selectedPrograms,
      fileURL: urlData.publicUrl, storagePath,
      uploadedBy: auth.currentUser?.uid, createdAt: serverTimestamp(),
    });
    setMessage({ type: "success", text: `"${title}" uploaded successfully!` });
    setTitle(""); setCategory(""); setFile(null); setProgramTarget("all"); setSelectedPrograms([]);
    setUploading(false); fetchDocuments(); fetchStats();
  };
 
  const toggleBlock = async (userId: string, current: boolean) => {
    await updateDoc(doc(db, "users", userId), { isBlocked: !current });
    fetchUsers();
  };
 
  const deleteDocument = async (docId: string, storagePath?: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await deleteDoc(doc(db, "documents", docId));
    if (storagePath) await supabase.storage.from("cics-documents").remove([storagePath]);
    setMessage({ type: "success", text: "Document deleted successfully." });
    fetchDocuments(); fetchStats();
  };
 
  const maxVal = Math.max(...chartData.map(d => Math.max(d.logins, d.downloads)), 1);
  const chartH = 160, chartW = 600, padL = 30, padR = 10, padT = 10, padB = 30;
  const innerW = chartW - padL - padR, innerH = chartH - padT - padB;
  const pts = (key: "logins" | "downloads") => chartData.map((d, i) => {
    const x = padL + (i / Math.max(chartData.length - 1, 1)) * innerW;
    const y = padT + innerH - (d[key] / maxVal) * innerH;
    return `${x},${y}`;
  }).join(" ");
 
  const SidebarContent = () => (
    <>
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              <img src="/neu-logo.png" alt="NEU" style={{ width: 30, height: 30, objectFit: "contain" }}/>
            </div>
            <div>
              <div className="font-display" style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>CICS Vault</div>
              <div style={{ color: "#c0392b", fontSize: "10px", fontWeight: 600 }}>ADMIN</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#5a5f72", cursor: "pointer" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 0", flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "8px 16px 4px", fontSize: "10px", fontWeight: 600, color: "#5a5f72", letterSpacing: "0.1em" }}>MANAGE</div>
        {TABS.map(t => (
          <button key={t.key} className={`nav-item ${tab === t.key ? "active" : ""}`} onClick={() => { setTab(t.key); setSidebarOpen(false); }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={t.icon}/></svg>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ color: "#8b8fa8", fontSize: "12px", fontWeight: 500, marginBottom: "10px" }}>{adminName}</div>
        <button onClick={() => router.push("/student")} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", padding: "7px 10px", borderRadius: "7px", marginBottom: "6px", background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e74c3c", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          Student View
        </button>
        <button onClick={() => { signOut(auth); router.push("/"); }} style={{ display: "flex", alignItems: "center", gap: "7px", background: "none", border: "none", color: "#5a5f72", fontSize: "11px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Sign out
        </button>
      </div>
    </>
  );
 
  return (
    <div style={{ display: "flex" }}>
      {sidebarOpen && <div style={{ display: "block", position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49 }} onClick={() => setSidebarOpen(false)}/>}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}><SidebarContent /></div>
 
      <div className="main-content" style={{ flex: 1 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "12px", background: "#111318" }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#5a5f72", cursor: "pointer", padding: "6px", lineHeight: 0, flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <h1 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>
            {TABS.find(t => t.key === tab)?.label || "Dashboard"}
          </h1>
        </div>
 
        <div style={{ padding: "16px 20px", maxWidth: 900 }}>
          {message && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "12px", fontWeight: 500, background: message.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(192,57,43,0.1)", border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(192,57,43,0.3)"}`, color: message.type === "success" ? "#34d399" : "#f87171" }}>
              {message.text}
            </div>
          )}
 
          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <>
              <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                {["daily","weekly","monthly","custom"].map(f => (
                  <button key={f} onClick={() => setDateFilter(f as any)} style={{ padding: "5px 12px", borderRadius: "6px", border: `1px solid ${dateFilter === f ? "rgba(192,57,43,0.5)" : "rgba(255,255,255,0.08)"}`, background: dateFilter === f ? "rgba(192,57,43,0.12)" : "#1a1d24", color: dateFilter === f ? "#e74c3c" : "#8b8fa8", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", textTransform: "capitalize" }}>{f}</button>
                ))}
                {dateFilter === "custom" && (
                  <>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input-field" style={{ width: 140, fontSize: "11px", padding: "5px 10px" }}/>
                    <span style={{ color: "#5a5f72", fontSize: "11px" }}>to</span>
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input-field" style={{ width: 140, fontSize: "11px", padding: "5px 10px" }}/>
                  </>
                )}
              </div>
 
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                {[
                  { label: "Whitelisted Users", value: stats.users, sub: "Total registered accounts", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "#60a5fa" },
                  { label: "Logins This Period", value: stats.logins, sub: "Based on selected range", icon: "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1", color: "#34d399" },
                  { label: "Downloads This Period", value: stats.downloads, sub: "Based on selected range", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", color: "#fbbf24" },
                  { label: "Total Documents", value: stats.documents, sub: "In the repository", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "#fb923c" },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding: "14px" }}>
                    <div style={{ width: 32, height: 32, background: `${s.color}15`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                      <svg width="16" height="16" fill="none" stroke={s.color} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon}/></svg>
                    </div>
                    <div className="font-display" style={{ fontSize: "1.6rem", fontWeight: 800, color: "white", lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: "11px", color: "white", fontWeight: 600, marginTop: "4px" }}>{s.label}</div>
                    <div style={{ fontSize: "10px", color: s.color, marginTop: "2px" }}>{s.sub}</div>
                  </div>
                ))}
              </div>
 
              <div className="card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "white" }}>Login & Download Activity</div>
                    <div style={{ fontSize: "11px", color: "#5a5f72", marginTop: "2px" }}>
                      {dateFilter === "custom" && customStart && customEnd ? `${customStart} to ${customEnd}` : `Last ${dateFilter === "daily" ? "24 hours" : dateFilter === "weekly" ? "7 days" : "30 days"}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "14px" }}>
                    {[{ color: "#c0392b", label: "Logins" }, { color: "#fbbf24", label: "Downloads" }].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#8b8fa8" }}>
                        <div style={{ width: 10, height: 2, background: l.color, borderRadius: "1px" }}/>{l.label}
                      </div>
                    ))}
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ minWidth: 300 }}>
                      {[0,1,2,3,4].map(i => { const y = padT+(i/4)*innerH; return <line key={i} x1={padL} y1={y} x2={chartW-padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>; })}
                      {[0,1,2,3,4].map(i => { const y = padT+(i/4)*innerH; return <text key={i} x={padL-4} y={y+4} fill="#5a5f72" fontSize="9" textAnchor="end">{Math.round(maxVal-(i/4)*maxVal)}</text>; })}
                      {chartData.length > 1 && <polyline points={pts("logins")} fill="none" stroke="#c0392b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}
                      {chartData.length > 1 && <polyline points={pts("downloads")} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}
                      {chartData.map((d, i) => {
                        const x = padL+(i/Math.max(chartData.length-1,1))*innerW;
                        return <g key={i}><circle cx={x} cy={padT+innerH-(d.logins/maxVal)*innerH} r="3" fill="#c0392b"/><circle cx={x} cy={padT+innerH-(d.downloads/maxVal)*innerH} r="3" fill="#fbbf24"/></g>;
                      })}
                      {chartData.map((d, i) => {
                        if (chartData.length > 8 && i % Math.ceil(chartData.length/8) !== 0) return null;
                        const x = padL+(i/Math.max(chartData.length-1,1))*innerW;
                        return <text key={i} x={x} y={chartH-4} fill="#5a5f72" fontSize="9" textAnchor="middle">{d.date}</text>;
                      })}
                    </svg>
                  </div>
                ) : <div style={{ textAlign: "center", color: "#5a5f72", fontSize: "12px", padding: "40px 0" }}>Loading chart...</div>}
              </div>
            </>
          )}
 
          {/* UPLOAD */}
          {tab === "upload" && (
            <div className="card" style={{ padding: "22px", maxWidth: 560 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#8b8fa8", marginBottom: "6px", letterSpacing: "0.06em" }}>DOCUMENT TITLE</label>
                  <input className="input-field" placeholder="e.g. CS101 Syllabus AY 2025-2026" value={title} onChange={e => setTitle(e.target.value)}/>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#8b8fa8", marginBottom: "8px", letterSpacing: "0.06em" }}>CATEGORY</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "6px" }}>
                    {CATEGORIES.map(c => (
                      <button key={c} onClick={() => setCategory(c)} style={{ padding: "8px 12px", borderRadius: "7px", border: `1.5px solid ${category === c ? "rgba(192,57,43,0.6)" : "rgba(255,255,255,0.08)"}`, background: category === c ? "rgba(192,57,43,0.15)" : "#1a1d24", color: category === c ? "#e74c3c" : "#8b8fa8", fontSize: "12px", fontWeight: category === c ? 700 : 400, cursor: "pointer", fontFamily: "'Inter', sans-serif", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: "6px" }}>
                        {category === c && <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#8b8fa8", marginBottom: "8px", letterSpacing: "0.06em" }}>TARGET PROGRAM</label>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                    {[{ key: "all", label: "All Courses" }, { key: "specific", label: "Specific Course" }].map(opt => (
                      <button key={opt.key} onClick={() => { setProgramTarget(opt.key as any); setSelectedPrograms([]); }} style={{ padding: "8px 16px", borderRadius: "7px", border: `1.5px solid ${programTarget === opt.key ? "rgba(192,57,43,0.6)" : "rgba(255,255,255,0.08)"}`, background: programTarget === opt.key ? "rgba(192,57,43,0.15)" : "#1a1d24", color: programTarget === opt.key ? "#e74c3c" : "#8b8fa8", fontSize: "12px", fontWeight: programTarget === opt.key ? 700 : 400, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {programTarget === "all" && (
                    <div style={{ padding: "10px 12px", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "8px", fontSize: "11px", color: "#60a5fa" }}>
                      📢 This document will be visible to all programs: CS, IT, IS, EMC
                    </div>
                  )}
                  {programTarget === "specific" && (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                        {PROGRAMS.map(p => (
                          <button key={p} onClick={() => toggleProgram(p)} style={{ padding: "10px", borderRadius: "7px", border: `1.5px solid ${selectedPrograms.includes(p) ? "rgba(192,57,43,0.6)" : "rgba(255,255,255,0.08)"}`, background: selectedPrograms.includes(p) ? "rgba(192,57,43,0.15)" : "#1a1d24", color: selectedPrograms.includes(p) ? "#e74c3c" : "#8b8fa8", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", textAlign: "center", transition: "all 0.15s" }}>
                            {p}
                          </button>
                        ))}
                      </div>
                      {selectedPrograms.length > 0 && (
                        <div style={{ marginTop: "8px", fontSize: "11px", color: "#34d399" }}>
                          ✓ Will be visible to: {selectedPrograms.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#8b8fa8", marginBottom: "6px", letterSpacing: "0.06em" }}>PDF FILE</label>
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", border: `2px dashed ${file ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px", cursor: "pointer", background: file ? "rgba(16,185,129,0.05)" : "#1a1d24" }}>
                    <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: "none" }}/>
                    <svg width="26" height="26" fill="none" stroke={file ? "#34d399" : "#5a5f72"} viewBox="0 0 24 24" style={{ marginBottom: "6px" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    <span style={{ fontSize: "12px", color: file ? "#34d399" : "#5a5f72", fontWeight: file ? 600 : 400 }}>{file ? `✓ ${file.name}` : "Click to select PDF"}</span>
                  </label>
                </div>
                <button className="btn-primary" onClick={handleUpload} disabled={uploading || !file || !title || !category} style={{ padding: "12px", fontSize: "13px" }}>
                  {uploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </div>
          )}
 
          {/* DOCS */}
          {tab === "docs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "12px", color: "#5a5f72", marginBottom: "4px" }}>{documents.length} documents total</p>
              {documents.map(d => (
                <div key={d.id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 32, height: 32, background: "rgba(192,57,43,0.1)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" fill="#c0392b" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/></svg>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "12px", color: "white", margin: 0 }}>{d.title}</p>
                      <div style={{ display: "flex", gap: "6px", marginTop: "2px", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "#5a5f72" }}>{d.category}</span>
                        {d.program && <span style={{ fontSize: "10px", color: "#c0392b", fontWeight: 600 }}>· {d.program}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => window.open(d.fileURL, "_blank")} className="btn-ghost" style={{ fontSize: "11px", padding: "5px 12px" }}>View</button>
                    <button onClick={() => deleteDocument(d.id, d.storagePath)}
                      style={{ padding: "5px 12px", borderRadius: "7px", border: "1px solid rgba(192,57,43,0.3)", background: "rgba(192,57,43,0.08)", color: "#f87171", fontSize: "11px", fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(192,57,43,0.2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(192,57,43,0.08)")}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {documents.length === 0 && <p style={{ color: "#5a5f72", fontSize: "12px" }}>No documents yet.</p>}
            </div>
          )}
 
          {/* USERS */}
          {tab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "12px", color: "#5a5f72", marginBottom: "4px" }}>{users.length} accounts</p>
              {users.map(u => (
                <div key={u.id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#c0392b", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "13px" }}>
                      {(u.displayName || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "12px", color: "white", margin: 0 }}>{u.email}</p>
                      <p style={{ fontSize: "10px", color: "#5a5f72", margin: "1px 0 0" }}>{u.program || "No program"}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", fontWeight: 700, background: u.isBlocked ? "rgba(192,57,43,0.15)" : "rgba(16,185,129,0.15)", color: u.isBlocked ? "#f87171" : "#34d399", border: `1px solid ${u.isBlocked ? "rgba(192,57,43,0.3)" : "rgba(16,185,129,0.3)"}` }}>
                      {u.isBlocked ? "BLOCKED" : "ACTIVE"}
                    </span>
                    <button onClick={() => toggleBlock(u.id, u.isBlocked)} className="btn-ghost" style={{ fontSize: "11px", padding: "4px 10px", color: u.isBlocked ? "#34d399" : "#f87171", borderColor: u.isBlocked ? "rgba(16,185,129,0.3)" : "rgba(192,57,43,0.3)" }}>
                      {u.isBlocked ? "Unblock" : "Block"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
 
          {/* AUDIT LOGS */}
          {tab === "logs" && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: "13px", color: "white" }}>Audit History</span>
                <span style={{ fontSize: "11px", color: "#5a5f72" }}>{auditLogs.length} records</span>
              </div>
              {auditLogs.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#5a5f72", fontSize: "12px" }}>No logs in this period.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Email","Document","Timestamp"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 16px", fontSize: "10px", fontWeight: 700, color: "#5a5f72", letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "10px 16px", fontSize: "11px", color: "#8b8fa8" }}>{log.userEmail}</td>
                        <td style={{ padding: "10px 16px", fontSize: "11px", color: "#8b8fa8" }}>{log.docTitle}</td>
                        <td style={{ padding: "10px 16px", color: "#5a5f72", fontSize: "11px" }}>{log.timestamp?.toDate().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
 
      {/* Mobile bottom nav */}
      <div className="bottom-nav">
        {[
          { key: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
          { key: "upload", label: "Upload", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
          { key: "users", label: "Control", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
        ].map(n => (
          <button key={n.key} className={`bottom-nav-item ${tab === n.key ? "active" : ""}`} onClick={() => setTab(n.key)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={n.icon}/></svg>
            {n.label}
          </button>
        ))}
        <button className="bottom-nav-item" onClick={() => setSidebarOpen(true)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16"/></svg>
          More
        </button>
      </div>
    </div>
  );
}
 