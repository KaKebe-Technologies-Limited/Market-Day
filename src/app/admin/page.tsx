"use client";
import "../globals.css";
import { useState, useRef, useEffect, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";

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
  VALID: {
    bg: "var(--green-dim)",
    border: "var(--green)",
    color: "var(--green)",
    icon: "✓",
  },
  INVALID: {
    bg: "var(--red-dim)",
    border: "var(--red)",
    color: "var(--red)",
    icon: "✗",
  },
  ALREADY_USED: {
    bg: "var(--red-dim)",
    border: "var(--red)",
    color: "var(--red)",
    icon: "⊘",
  },
  NOT_PAID: {
    bg: "var(--red-dim)",
    border: "var(--red)",
    color: "var(--red)",
    icon: "⚠",
  },
  ERROR: {
    bg: "var(--red-dim)",
    border: "var(--red)",
    color: "var(--red)",
    icon: "!",
  },
};

function Skeleton({
  height = 20,
  width = "100%",
  style = {},
}: {
  height?: number;
  width?: string;
  style?: React.CSSProperties;
}) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

function EntriesSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1 }}>
            <Skeleton height={16} width="60%" style={{ marginBottom: 8 }} />
            <Skeleton height={12} width="40%" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Skeleton height={24} width="50px" />
            <Skeleton height={24} width="50px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [mounted, setMounted] = useState(false);

  const [tab, setTab] = useState<Tab>("verify");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scannerDivVisible, setScannerDivVisible] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraLoading, setCameraLoading] = useState(false);
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const pendingStart = useRef(false);

  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinPaid, setWalkinPaid] = useState(true);
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [walkinResult, setWalkinResult] = useState<string | null>(null);
  const [walkinError, setWalkinError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authed && tab === "verify") {
      setTimeout(() => codeRef.current?.focus(), 100);
    }
  }, [authed, tab]);

  useEffect(() => {
    if (result?.status === "VALID") {
      const t = setTimeout(() => {
        setResult(null);
        setCode("");
        codeRef.current?.focus();
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [result]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) stopScanner();
    };
  }, []);

  useEffect(() => {
    if (tab === "entries" && authed) loadEntries();
  }, [tab, authed]);

  function login(e: React.FormEvent) {
    e.preventDefault();
    if (password === "marketday2026" || password) {
      setAuthed(true);
      setAuthError("");
    }
  }

  const verify = useCallback(
    async (codeToVerify?: string) => {
      const target = (codeToVerify ?? code).trim().toUpperCase();
      if (!target) return;
      setVerifying(true);
      setResult(null);
      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-password": password,
          },
          body: JSON.stringify({ code: target }),
        });
        const data = await res.json();
        setResult(data);
        if (data.status !== "VALID") {
        } else setCode("");
      } catch {
        setResult({
          status: "ERROR",
          message: "Network error. Check connection.",
        });
      } finally {
        setVerifying(false);
      }
    },
    [code, password],
  );

  useEffect(() => {
    if (/^MKD-[A-Z0-9]{6}$/.test(code.trim().toUpperCase())) {
      verify(code.trim().toUpperCase());
    }
  }, [code, verify]);

  const onScanSuccess = useCallback(
    (decodedText: string) => {
      const codeMatch = decodedText.match(/MKD-[A-Z0-9]{6}/i);
      if (codeMatch) {
        setCode(codeMatch[0].toUpperCase());
        verify(codeMatch[0].toUpperCase());
        stopScanner();
      } else {
        setCode(decodedText.toUpperCase());
        verify(decodedText.toUpperCase());
        stopScanner();
      }
    },
    [verify],
  );

  const onScanError = useCallback((error: string) => {
    if (!error.includes("No code")) {
      console.warn("Scan error:", error);
    }
  }, []);

  useEffect(() => {
    if (!scannerDivVisible || !pendingStart.current) return;
    pendingStart.current = false;

    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      setCameraError(
        "Camera requires HTTPS. Please access the site via HTTPS or use manual code entry.",
      );
      setScannerDivVisible(false);
      setCameraLoading(false);
      return;
    }

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: { width: 200, height: 200 },
        aspectRatio: 1.0,
        disableFlip: false,
        verbose: false,
      };

      try {
        await scanner.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanError,
        );
        setIsScanning(true);
        setCameraLoading(false);
      } catch (err: any) {
        console.warn("Environment camera failed, trying user camera:", err);
        try {
          await scanner.start(
            { facingMode: "user" },
            config,
            onScanSuccess,
            onScanError,
          );
          setIsScanning(true);
          setCameraLoading(false);
        } catch (fallbackErr: any) {
          console.error("All cameras failed:", fallbackErr);
          scannerRef.current = null;
          setIsScanning(false);
          setScannerDivVisible(false);
          setCameraLoading(false);

          let errorMsg = "Could not access camera. ";
          if (
            fallbackErr.name === "NotAllowedError" ||
            fallbackErr.message?.includes("Permission")
          ) {
            errorMsg +=
              "Camera permission denied. Please allow camera access in your browser settings.";
          } else if (
            fallbackErr.name === "NotFoundError" ||
            fallbackErr.message?.includes("not found")
          ) {
            errorMsg += "No camera found on this device.";
          } else if (
            fallbackErr.name === "NotReadableError" ||
            fallbackErr.message?.includes("in use")
          ) {
            errorMsg +=
              "Camera is being used by another app. Please close other apps using the camera.";
          } else {
            errorMsg += "Please check permissions or use manual entry.";
          }
          setCameraError(errorMsg);
        }
      }
    })();
  }, [scannerDivVisible, onScanSuccess, onScanError]);

  function startScanner() {
    if (scannerRef.current || pendingStart.current) return;
    setCameraLoading(true);
    setCameraError("");
    pendingStart.current = true;
    setScannerDivVisible(true);
  }

  function stopScanner() {
    pendingStart.current = false;
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
          setIsScanning(false);
          setScannerDivVisible(false);
        })
        .catch(() => {
          scannerRef.current = null;
          setIsScanning(false);
          setScannerDivVisible(false);
        });
    } else {
      setIsScanning(false);
      setScannerDivVisible(false);
    }
  }

  function toggleScanner() {
    if (isScanning || scannerDivVisible) stopScanner();
    else startScanner();
  }

  async function markPaid(id: number) {
    await fetch("/api/admin/mark-paid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
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
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          name: walkinName.trim(),
          phone: walkinPhone.trim(),
          paid: walkinPaid,
        }),
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
    setPulling(false);
    try {
      const res = await fetch("/api/admin/entries", {
        headers: { "x-admin-password": password },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format - expected JSON");
      }

      const data = await res.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error("Failed to load entries:", error);
      // Don't crash the app, just show empty entries
      setEntries([]);
    } finally {
      setEntriesLoading(false);
      setPulling(false);
    }
  }

  function handlePullRefresh() {
    if (!pulling && tab === "entries") {
      setPulling(true);
      loadEntries();
    }
  }

  if (!mounted) return null;

  if (!authed) {
    return (
      <div style={styles.page}>
        <div style={styles.loginCard} className="animate-scale-in">
          <img src="/logo.png" alt="Logo" style={styles.logo} />
          <div style={styles.logoText}>MARKET DAY</div>
          <div style={styles.logoSubtext}>Gate Staff Portal</div>
          <div style={styles.tagline}>ADMIN ACCESS</div>
          <h1 style={{ ...styles.title, fontSize: 22, marginBottom: 20 }}>
            Enter Password
          </h1>
          <form
            onSubmit={login}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{ fontFamily: "var(--sans)" }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {authError && <div style={styles.errorBox}>{authError}</div>}
            <button type="submit" className="btn-primary" disabled={!password}>
              Enter Admin Mode →
            </button>
          </form>
        </div>
      </div>
    );
  }

  const cfg = result ? STATUS_CONFIG[result.status] : null;

  return (
    <div style={styles.page}>
      <div style={styles.adminCard} className="animate-slide-up">
        <img src="/logo.png" alt="Logo" style={styles.logo} />
        <div style={styles.logoText}>MARKET DAY</div>
        <div style={styles.logoSubtext}>Gate Staff Portal</div>
        <div style={styles.adminHeader}>
          <div style={styles.tabs} className="swipe-container" ref={tabsRef}>
            {(["verify", "walkin", "entries"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="tap-target"
                style={{
                  ...styles.tab,
                  ...(tab === t ? styles.tabActive : {}),
                }}
              >
                {t === "verify"
                  ? "⚡ Verify"
                  : t === "walkin"
                    ? "➕ Walk-in"
                    : "📋 Entries"}
              </button>
            ))}
          </div>
        </div>

        {tab === "verify" && (
          <div style={styles.tabContent}>
            <div style={styles.verifyInputRow}>
              <input
                ref={codeRef}
                type="text"
                placeholder="Scan QR or type code..."
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 18,
                  letterSpacing: "0.06em",
                }}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                onClick={() => verify()}
                className="btn-primary"
                disabled={verifying || !code.trim()}
                style={{ minWidth: 90, marginTop: 10 }}
              >
                {verifying ? <span className="animate-spin">⟳</span> : "VERIFY"}
              </button>
            </div>

            <div style={styles.scannerSection}>
              <button
                onClick={toggleScanner}
                className="btn-secondary"
                style={{ width: "auto", padding: "12px 20px", fontSize: 14 }}
              >
                {isScanning || scannerDivVisible ? "📷 Stop Camera" : "📷 Scan QR Code"}
              </button>
              {cameraLoading && (
                <div style={{ ...styles.cameraLoading, marginTop: 10 }}>
                  <span className="animate-spin" style={{ marginRight: 8 }}>
                    ⟳
                  </span>
                  Starting camera...
                </div>
              )}
              {cameraError && (
                <div
                  style={{ ...styles.errorBox, marginTop: 10, fontSize: 13 }}
                >
                  {cameraError}
                </div>
              )}
              {scannerDivVisible && (
                <div ref={scannerContainerRef} style={styles.scannerContainer}>
                  <div id="qr-reader" style={{ width: "100%" }}></div>
                </div>
              )}
            </div>

            {result && cfg && (
              <div
                style={{
                  ...styles.resultBox,
                  background: cfg.bg,
                  border: `2px solid ${cfg.border}`,
                }}
                className="animate-scale-in"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: cfg.border + "22",
                      border: `2px solid ${cfg.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      color: cfg.color,
                      flexShrink: 0,
                    }}
                  >
                    {cfg.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontFamily: "var(--sans)",
                        color: cfg.color,
                        letterSpacing: "0.08em",
                        fontWeight: 700,
                      }}
                    >
                      {result.status.replace("_", " ")}
                    </div>
                    <div
                      style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}
                    >
                      {result.message}
                    </div>
                  </div>
                </div>
                {result.status === "NOT_PAID" && result.id && (
                  <button
                    onClick={() => markPaid(result.id!)}
                    style={styles.markPaidBtn}
                  >
                    Mark as Paid & Admit
                  </button>
                )}
                {result.status !== "VALID" && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setCode("");
                      codeRef.current?.focus();
                    }}
                    style={styles.clearBtn}
                  >
                    Clear & Scan Next
                  </button>
                )}
              </div>
            )}

            <div style={styles.hint}>
              Type a code like{" "}
              <span
                style={{ fontFamily: "var(--sans)", color: "var(--accent)" }}
              >
                MKD-XXXXXX
              </span>{" "}
              and press Enter, or use the camera scanner.
            </div>
          </div>
        )}

        {tab === "walkin" && (
          <div style={styles.tabContent} className="animate-fade-in">
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 0 }}>
              Register a walk-in attendee and assign them a code manually.
            </p>
            <form
              onSubmit={submitWalkin}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div>
                <label style={styles.label}>Name</label>
                <input
                  placeholder="Full name"
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={styles.label}>Phone</label>
                <input
                  placeholder="Phone number"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  id="paid"
                  checked={walkinPaid}
                  onChange={(e) => setWalkinPaid(e.target.checked)}
                  style={{
                    width: 20,
                    height: 20,
                    accentColor: "var(--accent)",
                  }}
                />
                <label
                  htmlFor="paid"
                  style={{ fontSize: 15, cursor: "pointer" }}
                >
                  Mark as Paid
                </label>
              </div>
              {walkinError && <div style={styles.errorBox}>{walkinError}</div>}
              {walkinResult && (
                <div style={styles.successBox}>✓ {walkinResult}</div>
              )}
              <button
                type="submit"
                className="btn-primary"
                disabled={walkinLoading}
              >
                {walkinLoading ? (
                  <span className="animate-spin" style={{ marginRight: 8 }}>
                    ⟳
                  </span>
                ) : null}
                {walkinLoading ? "Creating..." : "Create Walk-in Entry"}
              </button>
            </form>
          </div>
        )}

        {tab === "entries" && (
          <div
            style={styles.tabContent}
            className="animate-fade-in"
            onTouchMove={(e) => {
              if (e.touches[0].clientY < 50 && !pulling) handlePullRefresh();
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 14, color: "var(--muted)" }}>
                {pulling ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  `${entries.length} entries`
                )}
              </div>
              <button
                onClick={loadEntries}
                className="btn-secondary"
                style={{ width: "auto", padding: "10px 16px", fontSize: 13 }}
              >
                ↻ Refresh
              </button>
            </div>
            {entriesLoading ? (
              <EntriesSkeleton />
            ) : entries.length === 0 ? (
              <div
                style={{
                  color: "var(--muted)",
                  textAlign: "center",
                  padding: 32,
                }}
              >
                No entries found
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: "60vh",
                  overflowY: "auto",
                  paddingBottom: 20,
                }}
              >
                {entries.map((e) => (
                  <div
                    key={e.id}
                    className="glass-card"
                    style={{
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: 12,
                          color: "var(--accent)",
                          marginTop: 2,
                        }}
                      >
                        {e.code}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        {e.phone}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        alignItems: "flex-end",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: e.paid
                            ? "var(--green-dim)"
                            : "var(--red-dim)",
                          color: e.paid ? "var(--green)" : "var(--red)",
                          fontWeight: 600,
                        }}
                      >
                        {e.paid ? "PAID" : "UNPAID"}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: e.used
                            ? "var(--red-dim)"
                            : "var(--surface)",
                          color: e.used ? "var(--red)" : "var(--muted)",
                          fontWeight: 600,
                        }}
                      >
                        {e.used ? "USED" : "UNUSED"}
                      </span>
                      {e.walkin && (
                        <span style={{ fontSize: 10, color: "var(--muted)" }}>
                          walk-in
                        </span>
                      )}
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "20px 12px",
    paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
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
  adminCard: {
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
  logo: {
    width: 100,
    height: 100,
    objectFit: "contain",
    marginBottom: 8,
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
  logoText: {
    fontFamily: "var(--mono)",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "var(--text)",
    marginBottom: 4,
    textAlign: "center",
  },
  logoSubtext: {
    fontSize: 11,
    color: "var(--muted)",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: "0.05em",
  },
  adminHeader: {
    padding: "16px 16px 0",
    borderBottom: "1px solid var(--border)",
  },
  tagline: {
    fontFamily: "var(--mono)",
    fontSize: 10,
    letterSpacing: "0.2em",
    color: "var(--accent)",
    marginBottom: 10,
    fontWeight: 700,
  },
  title: { fontSize: 28, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.2 },
  tabs: { display: "flex", gap: 0, marginTop: 4, paddingBottom: 2 },
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
  tabContent: { padding: "22px 18px" },
  verifyInputRow: { display: "flex", flexDirection: "column", gap: 0 },
  resultBox: {
    borderRadius: "var(--radius)",
    padding: "16px 18px",
    marginTop: 18,
  },
  hint: {
    marginTop: 18,
    fontSize: 12,
    color: "var(--muted)",
    lineHeight: 1.6,
    opacity: 0.7,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--muted)",
    letterSpacing: "0.05em",
    display: "block",
    marginBottom: 6,
  },
  errorBox: {
    background: "var(--red-dim)",
    border: "1px solid var(--red)",
    color: "var(--red)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    fontSize: 14,
  },
  successBox: {
    background: "var(--green-dim)",
    border: "1px solid var(--green)",
    color: "var(--green)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    fontSize: 14,
    fontFamily: "var(--sans)",
  },
  scannerSection: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  scannerContainer: {
    width: "100%",
    maxWidth: 300,
    borderRadius: "var(--radius)",
    overflow: "hidden",
    border: "2px solid var(--border)",
  },
  cameraLoading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    color: "var(--muted)",
    fontSize: 14,
  },
  markPaidBtn: {
    marginTop: 14,
    background: "var(--accent)",
    color: "#fff",
    fontWeight: 700,
    padding: "12px 18px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    width: "100%",
    transition: "all var(--transition-fast)",
  },
  clearBtn: {
    marginTop: 10,
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
