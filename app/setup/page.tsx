"use client";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const PROGRAMS = [
  { code: "CS", label: "BS Computer Science" },
  { code: "IT", label: "BS Information Technology" },
  { code: "IS", label: "BS Information Systems" },
  { code: "EMC", label: "BS Entertainment & Multimedia Computing" },
];

export default function SetupPage() {
  const [program, setProgram] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => { if (!auth.currentUser) router.push("/"); }, [router]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !program) return;
    setLoading(true);
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid, email: user.email, displayName: user.displayName,
      photoURL: user.photoURL, role: "student", program,
      isBlocked: false, createdAt: serverTimestamp(),
    });
    router.push("/student");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#111318", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 460 }} className="fade-up">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ width: 56, height: 56, background: "#c0392b", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
            <svg width="26" height="26" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <h2 className="font-display" style={{ fontSize: "1.6rem", fontWeight: 700, color: "white", marginBottom: "0.4rem" }}>
            Set up your profile
          </h2>
          <p style={{ color: "#5a5f72", fontSize: "13px" }}>Select your program to personalize your experience</p>
        </div>

        {/* Program selection */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.5rem" }}>
          {PROGRAMS.map((p) => (
            <button key={p.code} onClick={() => setProgram(p.code)} style={{
              width: "100%", textAlign: "left", padding: "14px 16px",
              background: program === p.code ? "rgba(192,57,43,0.12)" : "#1a1d24",
              border: `1px solid ${program === p.code ? "rgba(192,57,43,0.5)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "10px", cursor: "pointer", transition: "all 0.15s",
              fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <span>
                <span style={{ display: "block", fontSize: "14px", fontWeight: 600, color: program === p.code ? "#e74c3c" : "white" }}>{p.code}</span>
                <span style={{ display: "block", fontSize: "12px", color: "#5a5f72", marginTop: "2px" }}>{p.label}</span>
              </span>
              {program === p.code && (
                <div style={{ width: 20, height: 20, background: "#c0392b", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="12" height="12" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={!program || loading}
          style={{ width: "100%", padding: "14px", fontSize: "14px" }}>
          {loading ? "Setting up..." : "Continue to CICS Vault →"}
        </button>
      </div>
    </div>
  );
}
