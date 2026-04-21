"use client";
import "../globals.css";
import { useState, useRef, useEffect, useCallback } from "react";
import { Eye, EyeOff, Camera, CameraOff, RefreshCw } from "lucide-react";

type VerifyResult = {
  status: "VALID" | "INVALID" | "ALREADY_USED" | "NOT_PAID" | "ERROR";
  message: string;
  name?: string;
  id?: number;
};

type Tab = "verify" | "walkin" | "entries";

type Entry = {
  id: number;
  name: string;
  phone: string;
  code: string;
  paid: boolean;
  used: boolean;
  walkin: boolean;
  createdAt: string;
};

const STATUS_CONFIG = {
  VALID: { bg: "var(--green-dim)", border: "var(--green)", color: "var(--green)", icon: "✓" },
  INVALID: { bg: "var(--red-dim)", border: "var(--red)", color: "var(--red)", icon: "✗" },
  ALREADY_USED: { bg: "var(--red-dim)", border: "var(--red)", color: "var(--red)", icon: "⊘" },
  NOT_PAID: { bg: "var(--red-dim)", border: "var(--red)", color: "var(--red)", icon: "⚠" },
  ERROR: { bg: "var(--red-dim)", border: "var(--red)", color: "var(--red)", icon: "!" },
};

function Skeleton({ height = 20, width = "100%", style = {} }: { height?: number; width?: string; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 8, ...style }} />;
}

function EntriesSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Skeleton height={15} width="55%" style={{ marginBottom: 7 }} />
            <Skeleton height={11} width="35%" />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Skeleton height={22} width="48px" />
            <Skeleton height={22} width="48px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [tab, setTab] = useState<Tab>("verify");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraLoading, setCameraLoading] = useState(false);
  const scannerRef = useRef<any>(null);
  const pendingStart = useRef(false);

  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinPaid, setWalkinPaid] = useState(true);
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [walkinResult, setWalkinResult] = useState<string | null>(null);
  const [walkinError, setWalkinError] = useState("");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (authed && tab === "verify") setTimeout(() => codeRef.current?.focus(), 100);
  }, [authed, tab]);

  useEffect(() => {
    if (result?.status === "VALID") {
      const t = setTimeout(() => { setResult(null); setCode(""); codeRef.current?.focus(); }, 3500);
      return () => clearTimeout(t);
    }
  }, [result]);

  useEffect(() => { return () => { if (scannerRef.current) stopScanner(); }; }, []);

  useEffect(() => { if (tab === "entries" && authed) loadEntries(); }, [tab, authed]);

  const verify = useCallback(async (codeToVerify?: string) => {
    const target = (codeToVerify ?? code).trim().toUpperCase();
    if (!target) return;
    setVerifying(true);
    setResult(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ code: target }),
      });
      const data = await res.json();
      setResult(data);
      if (data.status === "VALID") setCode("");
    } catch {
      setResult({ status: "ERROR", message: "Network error. Check connection." });
    } finally {
      setVerifying(false);
    }
  }, [code, password]);

  useEffect(() => {
    if (/^MKD-[A-Z0-9]{6}$/.test(code.trim().toUpperCase())) verify(code.trim().toUpperCase());
  }, [code, verify]);

  const onScanSuccess = useCallback((decodedText: string) => {
    const match = decodedText.match(/MKD-[A-Z0-9]{6}/i);
    const scanned = (match ? match[0] : decodedText).toUpperCase();
    setCode(scanned);
    verify(scanned);
    stopScanner();
  }, [verify]);

  const onScanError = useCallback((error: string) => {
    if (!error.includes("No code") && !error.includes("No MultiFormat")) console.warn("Scan:", error);
  }, []);

  useEffect(() => {
    if (!scannerVisible || !pendingStart.current) return;
    pendingStart.current = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      const config = { fps: 15, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0, disableFlip: false, verbose: false };
      try {
        await scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanError);
        setIsScanning(true);
        setCameraLoading(false);
      } catch {
        try {
          await scanner.start({ facingMode: "user" }, config, onScanSuccess, onScanError);
          setIsScanning(true);
          setCameraLoading(false);
        } catch (err: any) {
          scannerRef.current = null;
          setIsScanning(false);
          setScannerVisible(false);
          setCameraLoading(false);
          if (err.name === "NotAllowedError" || err.message?.includes("Permission")) {
            setCameraError("Camera permission denied. Allow camera access in browser settings.");
          } else if (err.name === "NotFoundError") {
            setCameraError("No camera found on this device.");
          } else {
            setCameraError("Could not access camera. Try manual code entry.");
          }
        }
      }
    })();
  }, [scannerVisible, onScanSuccess, onScanError]);

  function startScanner() {
    if (scannerRef.current || pendingStart.current) return;
    setCameraLoading(true);
    setCameraError("");
    setResult(null);
    pendingStart.current = true;
    setScannerVisible(true);
  }

  function stopScanner() {
    pendingStart.current = false;
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setIsScanning(false);
        setScannerVisible(false);
      }).catch(() => {
        scannerRef.current = null;
        setIsScanning(false);
        setScannerVisible(false);
      });
    } else {
      setIsScanning(false);
      setScannerVisible(false);
    }
  }

  async function markPaid(id: number) {
    await fetch("/api/admin/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ id }),
    });
    verify(code);
  }

  async function submitWalkin(e: React.FormEvent) {
    e.preventDefault();
    setWalkinLoading(true);
    setWalkinError("");
    setWalkinResult(null);
    try {
      const res = await fetch("/api/admin/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ name: walkinName.trim(), phone: walkinPhone.trim(), paid: walkinPaid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWalkinResult(`Created: ${data.entry.name} — ${data.entry.code}`);
      setWalkinName("");
      setWalkinPhone("");
    } catch (err: any) {
      setWalkinError(err.message);
    } finally {
      setWalkinLoading(false);
    }
  }

  async function loadEntries() {
    setEntriesLoading(true);
    try {
      const res = await fetch("/api/admin/entries", { headers: { "x-admin-password": password } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  }

  if (!mounted) return null;

  if (!authed) {
    return (
      <div style={s.page}>
        <div style={s.loginCard} className="animate-scale-in">
          <img src="/logo.png" alt="Logo" style={s.logo} />
          <div style={s.logoText}>MARKET DAY</div>
          <div style={s.logoSub}>Gate Staff Portal</div>
          <form onSubmit={(e) => { e.preventDefault(); if (password) setAuthed(true); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button type="submit" className="btn-primary" disabled={!password}>Enter Admin Mode →</button>
          </form>
        </div>
      </div>
    );
  }

  const cfg = result ? STATUS_CONFIG[result.status] : null;
  const filteredEntries = entries.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.code.includes(search.toUpperCase()) || e.phone.includes(search)
  );

  return (
    <div style={s.page}>
      <div style={s.card} className="animate-slide-up">

        {/* Header */}
        <div style={s.header}>
          <img src="/logo.png" alt="Logo" style={s.headerLogo} />
          <div>
            <div style={s.logoText}>MARKET DAY</div>
            <div style={s.logoSub}>Gate Staff Portal</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          {(["verify", "walkin", "entries"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="tap-target" style={{ ...s.tab, ...(tab === t ? s.tabActive : {}) }}>
              {t === "verify" ? "⚡ Verify" : t === "walkin" ? "➕ Walk-in" : "📋 Entries"}
            </button>
          ))}
        </div>

        {/* VERIFY TAB */}
        {tab === "verify" && (
          <div style={s.tabContent} className="animate-fade-in">

            {/* Big scan button — primary action */}
            {!scannerVisible && !isScanning && (
              <button
                onClick={startScanner}
                style={s.scanHero}
                disabled={cameraLoading}
              >
                {cameraLoading ? (
                  <span className="animate-spin" style={{ fontSize: 32 }}>⟳</span>
                ) : (
                  <Camera size={36} strokeWidth={1.5} />
                )}
                <span style={{ fontSize: 17, fontWeight: 700, marginTop: 8 }}>
                  {cameraLoading ? "Starting camera..." : "Tap to Scan QR Code"}
                </span>
              </button>
            )}

            {/* Camera viewfinder */}
            {scannerVisible && (
              <div style={s.viewfinderWrap}>
                <div id="qr-reader" style={{ width: "100%" }} />
                <button onClick={stopScanner} style={s.stopCamBtn}>
                  <CameraOff size={16} style={{ marginRight: 6 }} />
                  Stop Camera
                </button>
              </div>
            )}

            {cameraError && (
              <div style={{ ...s.errorBox, marginBottom: 14 }}>{cameraError}</div>
            )}

            {/* Divider */}
            <div style={s.divider}><span style={s.dividerText}>or enter code manually</span></div>

            {/* Manual input */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                ref={codeRef}
                type="text"
                placeholder="MKD-XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                style={{ fontFamily: "var(--mono)", fontSize: 17, letterSpacing: "0.08em", flex: 1 }}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={() => verify()}
                className="btn-primary"
                disabled={verifying || !code.trim()}
                style={{ width: "auto", padding: "0 20px", minWidth: 80 }}
              >
                {verifying ? <span className="animate-spin">⟳</span> : "GO"}
              </button>
            </div>

            {/* Result */}
            {result && cfg && (
              <div style={{ ...s.resultBox, background: cfg.bg, border: `2px solid ${cfg.border}` }} className="animate-scale-in">
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: cfg.border + "22", border: `2px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: cfg.color, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontFamily: "var(--sans)", color: cfg.color, letterSpacing: "0.1em", fontWeight: 700 }}>
                      {result.status.replace("_", " ")}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{result.message}</div>
                  </div>
                </div>
                {result.status === "NOT_PAID" && result.id && (
                  <button onClick={() => markPaid(result.id!)} style={s.markPaidBtn}>
                    ✓ Mark as Paid & Admit
                  </button>
                )}
                {result.status !== "VALID" && (
                  <button onClick={() => { setResult(null); setCode(""); codeRef.current?.focus(); }} style={s.clearBtn}>
                    Clear & Scan Next
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* WALK-IN TAB */}
        {tab === "walkin" && (
          <div style={s.tabContent} className="animate-fade-in">
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0, marginBottom: 18 }}>
              Register a walk-in attendee manually.
            </p>
            <form onSubmit={submitWalkin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={s.label}>Name</label>
                <input placeholder="Full name" value={walkinName} onChange={(e) => setWalkinName(e.target.value)} required />
              </div>
              <div>
                <label style={s.label}>Phone</label>
                <input placeholder="Phone number" value={walkinPhone} onChange={(e) => setWalkinPhone(e.target.value)} required />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="paid" checked={walkinPaid} onChange={(e) => setWalkinPaid(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />
                <label htmlFor="paid" style={{ fontSize: 15, cursor: "pointer" }}>Mark as Paid</label>
              </div>
              {walkinError && <div style={s.errorBox}>{walkinError}</div>}
              {walkinResult && <div style={s.successBox}>✓ {walkinResult}</div>}
              <button type="submit" className="btn-primary" disabled={walkinLoading}>
                {walkinLoading ? <><span className="animate-spin" style={{ marginRight: 8 }}>⟳</span>Creating...</> : "Create Walk-in Entry"}
              </button>
            </form>
          </div>
        )}

        {/* ENTRIES TAB */}
        {tab === "entries" && (
          <div style={s.tabContent} className="animate-fade-in">
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                placeholder="Search name, code, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, fontSize: 14, padding: "10px 14px" }}
              />
              <button onClick={loadEntries} className="btn-secondary" style={{ width: "auto", padding: "10px 14px" }}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              {entriesLoading ? "Loading..." : `${filteredEntries.length} of ${entries.length} entries`}
            </div>
            {entriesLoading ? (
              <EntriesSkeleton />
            ) : filteredEntries.length === 0 ? (
              <div style={{ color: "var(--muted)", textAlign: "center", padding: 32 }}>
                {search ? "No matches found" : "No entries yet"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "55vh", overflowY: "auto", paddingBottom: 20 }}>
                {filteredEntries.map((e) => (
                  <div key={e.id} className="glass-card" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", marginTop: 2 }}>{e.code}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{e.phone}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: e.paid ? "var(--green-dim)" : "var(--red-dim)", color: e.paid ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                        {e.paid ? "PAID" : "UNPAID"}
                      </span>
                      <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: e.used ? "var(--red-dim)" : "var(--surface)", color: e.used ? "var(--red)" : "var(--muted)", fontWeight: 600 }}>
                        {e.used ? "USED" : "UNUSED"}
                      </span>
                      {e.walkin && <span style={{ fontSize: 10, color: "var(--muted)" }}>walk-in</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "16px 12px",
    paddingBottom: "calc(32px + env(safe-area-inset-bottom, 0px))",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "var(--glass)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    overflow: "hidden",
    boxShadow: "var(--shadow-lg)",
  },
  loginCard: {
    width: "100%",
    maxWidth: 360,
    background: "var(--glass)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "var(--radius)",
    padding: "36px 28px",
    border: "1px solid var(--border)",
    marginTop: 60,
    boxShadow: "var(--shadow-lg)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "18px 20px 14px",
    borderBottom: "1px solid var(--border)",
  },
  headerLogo: { width: 48, height: 48, objectFit: "contain", flexShrink: 0 },
  logo: { width: 80, height: 80, objectFit: "contain", display: "block", margin: "0 auto 12px" },
  logoText: { fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, letterSpacing: "0.15em", color: "var(--text)" },
  logoSub: { fontSize: 11, color: "var(--muted)", letterSpacing: "0.05em", marginTop: 2 },
  tabBar: { display: "flex", borderBottom: "1px solid var(--border)" },
  tab: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontFamily: "var(--sans)",
    fontWeight: 600,
    fontSize: 13,
    padding: "14px 8px",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "all var(--transition-fast)",
  },
  tabActive: { color: "var(--accent)", borderBottomColor: "var(--accent)" },
  tabContent: { padding: "20px 18px" },
  scanHero: {
    width: "100%",
    background: "var(--surface)",
    border: "2px dashed var(--border)",
    borderRadius: "var(--radius)",
    padding: "32px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    marginBottom: 20,
    gap: 4,
  },
  viewfinderWrap: {
    width: "100%",
    borderRadius: "var(--radius)",
    overflow: "hidden",
    border: "2px solid var(--accent)",
    marginBottom: 16,
    position: "relative",
  },
  stopCamBtn: {
    width: "100%",
    background: "var(--surface)",
    border: "none",
    color: "var(--muted)",
    padding: "12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderTop: "1px solid var(--border)",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "18px 0",
  },
  dividerText: {
    fontSize: 11,
    color: "var(--muted)",
    whiteSpace: "nowrap",
    padding: "0 8px",
    background: "transparent",
    letterSpacing: "0.05em",
  },
  resultBox: {
    borderRadius: "var(--radius)",
    padding: "16px 18px",
    marginTop: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--muted)",
    letterSpacing: "0.08em",
    display: "block",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  errorBox: {
    background: "var(--red-dim)",
    border: "1px solid var(--red)",
    color: "var(--red)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    fontSize: 13,
  },
  successBox: {
    background: "var(--green-dim)",
    border: "1px solid var(--green)",
    color: "var(--green)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    fontSize: 13,
    fontFamily: "var(--sans)",
  },
  markPaidBtn: {
    marginTop: 14,
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 700,
    padding: "13px 18px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    width: "100%",
  },
  clearBtn: {
    marginTop: 8,
    background: "transparent",
    color: "var(--muted)",
    fontWeight: 600,
    padding: "10px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    cursor: "pointer",
    fontSize: 13,
    width: "100%",
  },
};
