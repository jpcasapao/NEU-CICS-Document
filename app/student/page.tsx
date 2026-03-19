"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
 
type Doc = { id: string; title: string; category: string; fileURL: string; createdAt?: any; programs?: string[] };
type UserData = { displayName?: string; email?: string; program?: string; photoURL?: string; isBlocked?: boolean; role?: string };
 
function getBadgeClass(cat: string) {
  const map: Record<string, string> = { Syllabus: "badge-syllabus", Thesis: "badge-thesis", Forms: "badge-forms", Guidelines: "badge-guidelines", Guideline: "badge-guideline", Announcements: "badge-announcements", Memo: "badge-memo", Others: "badge-others" };
  return map[cat] || "badge-others";
}
 
export default function StudentPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [search, setSearch] = useState("");
  const [userData, setUserData] = useState<UserData>({});
  const [isBlocked, setIsBlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<"home" | "library">("home");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeYear, setActiveYear] = useState("All");
  const [activeProgram, setActiveProgram] = useState("All");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
 
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);
 
  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) { router.push("/"); return; }
      await addDoc(collection(db, "logins"), { userId: user.uid, email: user.email, timestamp: serverTimestamp() });
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserData({ displayName: user.displayName || "", email: user.email || "", program: d.program, photoURL: user.photoURL || "", isBlocked: d.isBlocked, role: d.role });
        setIsBlocked(d.isBlocked);
        setIsAdmin(d.role === "admin");
      }
      const docsSnap = await getDocs(collection(db, "documents"));
      setDocs(docsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Doc)));
      setLoading(false);
    };
    fetchData();
  }, [router]);
 
  const handleDownload = async (document: Doc) => {
    if (isBlocked) return;
    await addDoc(collection(db, "logs"), { userId: auth.currentUser?.uid, documentId: document.id, timestamp: serverTimestamp() });
    window.open(document.fileURL, "_blank");
  };
 
  const years = ["All", ...new Set(docs.map(d => { if (d.createdAt?.toDate) { const y = d.createdAt.toDate().getFullYear(); return `${y}–${y+1}`; } return null; }).filter(Boolean) as string[])];
  const filtered = docs.filter(d => {
    const s = d.title.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase());
    const c = activeCategory === "All" || d.category === activeCategory;
    const y = activeYear === "All" || (() => { if (!d.createdAt?.toDate) return false; const yr = d.createdAt.toDate().getFullYear(); return activeYear === `${yr}–${yr+1}`; })();
    const p = activeProgram === "All" || d.programs?.includes(activeProgram);
    return s && c && y && p;
  });
 
  const firstName = userData.displayName?.split(" ")[0] || "Student";
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calDays = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
 
  return (
    <div style={{ display: "flex" }}>
      {sidebarOpen && <div style={{ display: "block", position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49 }} onClick={() => setSidebarOpen(false)}/>}
 
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                <img src="/neu-logo.png" alt="NEU" style={{ width: 30, height: 30, objectFit: "contain" }}/>
              </div>
              <div>
                <div className="font-display" style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>CICS Vault</div>
                <div style={{ color: "#5a5f72", fontSize: "10px" }}>NEU · {userData.program}</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#5a5f72", cursor: "pointer" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
 
        <div style={{ padding: "10px 0", flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "8px 16px 4px", fontSize: "10px", fontWeight: 600, color: "#5a5f72", letterSpacing: "0.1em" }}>NAVIGATE</div>
          {[
            { key: "home", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
            { key: "library", label: "Document Library", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }
          ].map(n => (
            <button key={n.key} className={`nav-item ${activePage === n.key ? "active" : ""}`} onClick={() => { setActivePage(n.key as any); setSidebarOpen(false); }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={n.icon}/></svg>
              {n.label}
            </button>
          ))}
        </div>
 
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            {userData.photoURL ? <img src={userData.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}/> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#c0392b", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "12px" }}>{firstName[0]}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userData.displayName}</div>
              <div style={{ color: "#5a5f72", fontSize: "10px" }}>Student · {userData.program}</div>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => router.push("/admin")} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", padding: "7px 10px", borderRadius: "7px", marginBottom: "6px", background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e74c3c", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Admin Panel
            </button>
          )}
          <button onClick={() => { signOut(auth); router.push("/"); }} style={{ display: "flex", alignItems: "center", gap: "7px", background: "none", border: "none", color: "#5a5f72", fontSize: "11px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign out
          </button>
        </div>
      </div>
 
      {/* Main */}
      <div className="main-content" style={{ flex: 1 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "12px", background: "#111318" }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", color: "#5a5f72", cursor: "pointer", padding: "6px", lineHeight: 0, flexShrink: 0 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <span style={{ color: "#5a5f72", fontSize: "13px", flexShrink: 0 }}>{activePage === "home" ? `${greeting}, ${firstName} 👋` : "Document Library"}</span>
          <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
            <svg width="14" height="14" fill="none" stroke="#5a5f72" viewBox="0 0 24 24" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input className="input-field" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setActivePage("library"); }} style={{ paddingLeft: 32, background: "#1a1d24", fontSize: "12px" }}/>
          </div>
        </div>
 
        {isBlocked && <div style={{ margin: "14px 20px 0", padding: "10px 14px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "12px" }}>🚫 Your account has been restricted. Contact your administrator.</div>}
 
        {activePage === "home" && (
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", marginBottom: "16px" }}>
              <div style={{ background: "linear-gradient(135deg, #1a1d24, #22262f)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: "12px", padding: "18px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -20, top: -20, width: 90, height: 90, background: "rgba(192,57,43,0.08)", borderRadius: "50%" }}/>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#c0392b", letterSpacing: "0.1em", marginBottom: "6px" }}>WELCOME BACK</div>
                <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "4px" }}>{userData.displayName}</h2>
                <p style={{ color: "#5a5f72", fontSize: "11px", marginBottom: "12px" }}>{userData.program} · {userData.email}</p>
                <button onClick={() => setActivePage("library")} style={{ padding: "6px 14px", background: "#c0392b", border: "none", borderRadius: "6px", color: "white", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Browse Library →</button>
              </div>
              <div className="card" style={{ padding: "18px", textAlign: "center" }}>
                <div className="font-display" style={{ fontSize: "1.6rem", fontWeight: 800, color: "white", letterSpacing: "-1px" }}>{currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                <div style={{ fontSize: "11px", color: "#5a5f72", marginTop: "3px", marginBottom: "12px" }}>{currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
                  <div style={{ fontWeight: 700, fontSize: "10px", color: "#5a5f72", marginBottom: "8px" }}>{today.toLocaleString("default", { month: "long", year: "numeric" }).toUpperCase()}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px" }}>
                    {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} style={{ fontSize: "9px", fontWeight: 600, color: "#5a5f72", textAlign: "center", padding: "2px 0" }}>{d}</div>)}
                    {calDays.map((day, i) => <div key={i} style={{ fontSize: "10px", padding: "3px 0", borderRadius: "3px", background: day === today.getDate() ? "#c0392b" : "transparent", color: day === today.getDate() ? "white" : day ? "#8b8fa8" : "transparent", textAlign: "center", fontWeight: day === today.getDate() ? 700 : 400 }}>{day}</div>)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px" }}>
              {[{ label: "Documents", value: docs.length }, { label: "Categories", value: new Set(docs.map(d => d.category)).size }, { label: "Program", value: userData.program || "—" }].map(s => (
                <div key={s.label} className="card" style={{ padding: "12px" }}>
                  <div className="font-display" style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>{s.value}</div>
                  <div style={{ fontSize: "10px", color: "#5a5f72", marginTop: "2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#5a5f72", letterSpacing: "0.08em", marginBottom: "8px" }}>RECENT DOCUMENTS</div>
            {loading ? <p style={{ color: "#5a5f72", fontSize: "12px" }}>Loading...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {docs.slice(0, 5).map(d => (
                  <div key={d.id} className="card card-hover" style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => handleDownload(d)}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: 30, height: 30, background: "rgba(192,57,43,0.1)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="13" height="13" fill="#c0392b" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/></svg>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "12px", color: "white", margin: 0 }}>{d.title}</p>
                        <span className={`badge ${getBadgeClass(d.category)}`} style={{ marginTop: "2px" }}>{d.category}</span>
                      </div>
                    </div>
                    <svg width="12" height="12" fill="none" stroke="#5a5f72" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
 
        {activePage === "library" && (
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "170px 1fr", gap: "14px" }}>
            <div className="card" style={{ padding: "12px", height: "fit-content" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#5a5f72", letterSpacing: "0.08em", marginBottom: "8px" }}>FILTERS</div>
 
              {/* PROGRAM */}
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#8b8fa8", marginBottom: "4px" }}>PROGRAM</div>
              {["All", "CS", "IT", "IS", "EMC"].map(p => (
                <button key={p} onClick={() => setActiveProgram(p)} style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 8px", borderRadius: "5px", border: "none", background: activeProgram === p ? "rgba(192,57,43,0.12)" : "transparent", fontSize: "11px", color: activeProgram === p ? "#e74c3c" : "#8b8fa8", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: activeProgram === p ? 600 : 400 }}>{p === "All" ? "All Programs" : p}</button>
              ))}
 
              {/* CATEGORY */}
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#8b8fa8", margin: "10px 0 4px" }}>CATEGORY</div>
              {["All", "Announcement", "Form", "Guideline", "Memo", "Syllabus", "Thesis", "Others"].map(c => (
                <button key={c} onClick={() => setActiveCategory(c)} style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 8px", borderRadius: "5px", border: "none", background: activeCategory === c ? "rgba(192,57,43,0.12)" : "transparent", fontSize: "11px", color: activeCategory === c ? "#e74c3c" : "#8b8fa8", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: activeCategory === c ? 600 : 400 }}>{c === "All" ? "All Categories" : c}</button>
              ))}
 
              {/* YEAR */}
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#8b8fa8", margin: "10px 0 4px" }}>YEAR</div>
              {years.map(y => (
                <button key={y} onClick={() => setActiveYear(y)} style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 8px", borderRadius: "5px", border: "none", background: activeYear === y ? "rgba(192,57,43,0.12)" : "transparent", fontSize: "11px", color: activeYear === y ? "#e74c3c" : "#8b8fa8", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: activeYear === y ? 600 : 400 }}>{y === "All" ? "All Years" : y}</button>
              ))}
 
              <button onClick={() => { setActiveCategory("All"); setActiveYear("All"); setActiveProgram("All"); setSearch(""); }} style={{ marginTop: "10px", width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#5a5f72", fontSize: "10px", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>Clear Filters</button>
            </div>
 
            <div>
              <p style={{ fontSize: "11px", color: "#5a5f72", marginBottom: "10px" }}>{filtered.length} documents</p>
              {loading ? <p style={{ color: "#5a5f72" }}>Loading...</p> : filtered.length === 0 ? <p style={{ color: "#5a5f72", fontSize: "12px" }}>No documents found.</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "10px" }}>
                  {filtered.map(d => (
                    <div key={d.id} className="card card-hover" style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "7px" }}>
                        <span className={`badge ${getBadgeClass(d.category)}`}>{d.category}</span>
                        <div style={{ width: 26, height: 26, background: "rgba(192,57,43,0.1)", borderRadius: "5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="11" height="11" fill="#c0392b" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/></svg>
                        </div>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: "12px", color: "white", margin: "0 0 3px", lineHeight: 1.4 }}>{d.title}</p>
                      <p style={{ fontSize: "10px", color: "#5a5f72", margin: "0 0 10px" }}>{d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}</p>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => handleDownload(d)} disabled={isBlocked} style={{ flex: 1, padding: "6px", borderRadius: "5px", border: "none", fontSize: "11px", fontWeight: 600, cursor: isBlocked ? "not-allowed" : "pointer", fontFamily: "'Inter', sans-serif", background: isBlocked ? "#22262f" : "#c0392b", color: isBlocked ? "#5a5f72" : "white" }}>{isBlocked ? "Restricted" : "Download"}</button>
                        <button onClick={() => window.open(d.fileURL, "_blank")} style={{ width: 28, borderRadius: "5px", border: "1px solid rgba(255,255,255,0.07)", background: "#1a1d24", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <svg width="11" height="11" fill="none" stroke="#8b8fa8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
 
      {/* Mobile bottom nav */}
      <div className="bottom-nav">
        {[{ key: "home", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
          { key: "library", label: "Library", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }
        ].map(n => (
          <button key={n.key} className={`bottom-nav-item ${activePage === n.key ? "active" : ""}`} onClick={() => setActivePage(n.key as any)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={n.icon}/></svg>
            {n.label}
          </button>
        ))}
        <button className="bottom-nav-item" onClick={() => setSidebarOpen(true)}>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16"/></svg>
          Menu
        </button>
      </div>
    </div>
  );
}
 