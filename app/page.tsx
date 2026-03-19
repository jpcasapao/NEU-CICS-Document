"use client";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, getDocs, setDoc, collection, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email || "";
      if (!email.endsWith("@neu.edu.ph")) {
        await signOut(auth);
        setError("Only @neu.edu.ph accounts are permitted.");
        setLoading(false);
        return;
      }

      const uid = result.user.uid;

      // Check by UID first
      const userByUid = await getDoc(doc(db, "users", uid));

      if (userByUid.exists()) {
        const role = userByUid.data().role;
        router.push(role === "admin" ? "/admin" : "/student");
      } else {
        // Check if pre-registered by email
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const existingData = snap.docs[0].data();
          // Create new document with correct UID as document ID
          await setDoc(doc(db, "users", uid), {
            ...existingData,
            uid,
          });
          router.push(existingData.role === "admin" ? "/admin" : "/student");
        } else {
          router.push("/setup");
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#111318", display: "flex" }}>
      <div style={{ width: "42%", background: "#1a1d24", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            <img src="/neu-logo.png" alt="NEU" style={{ width: 40, height: 40, objectFit: "contain" }}/>
          </div>
          <div>
            <div className="font-display" style={{ color: "white", fontWeight: 700, fontSize: "16px", letterSpacing: "0.02em" }}>CICS VAULT</div>
            <div style={{ color: "#5a5f72", fontSize: "11px" }}>New Era University</div>
          </div>
        </div>

        <div>
          <div style={{ display: "inline-block", padding: "4px 12px", background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "20px", fontSize: "11px", color: "#e74c3c", fontWeight: 600, letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            DOCUMENT REPOSITORY
          </div>
          <h1 className="font-display" style={{ fontSize: "3rem", fontWeight: 800, color: "white", lineHeight: 1.1, marginBottom: "1rem" }}>
            All CICS<br />
            <span style={{ color: "#c0392b" }}>documents</span><br />
            in one place.
          </h1>
          <p style={{ color: "#5a5f72", fontSize: "14px", lineHeight: 1.7, maxWidth: 300 }}>
            Access syllabi, theses, forms, and official guidelines from the College of Information and Computer Studies.
          </p>
        </div>

        <div style={{ display: "flex", gap: "2rem" }}>
          {[{ label: "Programs", value: "4" }, { label: "Document Types", value: "7" }, { label: "NEU Only", value: "✓" }].map(s => (
            <div key={s.label}>
              <div className="font-display" style={{ fontSize: "1.4rem", fontWeight: 800, color: "white" }}>{s.value}</div>
              <div style={{ fontSize: "11px", color: "#5a5f72", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
        <div style={{ width: "100%", maxWidth: 360 }} className="fade-up">
          <h2 className="font-display" style={{ fontSize: "1.8rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
            Sign in
          </h2>
          <p style={{ color: "#5a5f72", fontSize: "13px", marginBottom: "2rem" }}>
            Use your NEU Google account to continue
          </p>

          {error && (
            <div style={{ padding: "12px 14px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "13px", marginBottom: "1.5rem" }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
            background: "#1a1d24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
            padding: "14px 20px", fontSize: "14px", fontWeight: 500, fontFamily: "'Inter', sans-serif",
            color: "white", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s",
            opacity: loading ? 0.6 : 1,
          }}
            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(192,57,43,0.5)"; (e.currentTarget as HTMLButtonElement).style.background = "#22262f"; }}}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.background = "#1a1d24"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <div style={{ marginTop: "1.5rem", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", fontSize: "12px", color: "#5a5f72", textAlign: "center" }}>
            🔒 Restricted to <span style={{ color: "#8b8fa8" }}>@neu.edu.ph</span> accounts only
          </div>
        </div>
      </div>
    </div>
  );
}