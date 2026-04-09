"use client";
import "./globals.css";
import { useState, useEffect } from "react";

type Result = {
  name: string;
  code: string;
  qrDataUrl: string;
};

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadQR() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.qrDataUrl;
    a.download = `entry-${result.code}.png`;
    a.click();
  }

  function reset() {
    setResult(null);
    setName("");
    setPhone("");
    setError("");
  }

  if (!mounted) return null;

  if (result) {
    return (
      <div style={styles.page}>
        <div style={styles.card} className="animate-scale-in">
          <img
            src="/logo.png"
            alt="Logo"
            style={styles.logo}
            className="animate-slide-down"
          />
          <div style={styles.logoText}>MARKET DAY</div>
          <div style={styles.logoSubtext}>Fast-Track Entry System</div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field} className="animate-slide-up">
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div style={styles.field} className="animate-slide-up">
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 0700123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
              />
            </div>

            {error && (
              <div style={styles.errorBox} className="animate-slide-down">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !name.trim() || !phone.trim()}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <span style={styles.loadingWrapper}>
                  <span className="animate-spin" style={{ marginRight: 8 }}>
                    ⟳
                  </span>
                  Registering...
                </span>
              ) : (
                "Register & Get QR Code →"
              )}
            </button>
          </form>

          <div style={styles.footer}>
            Already registered? Bring your QR code or entry code to the gate.
          </div>
        </div>
      </div>
    );
  }

  // Registration form (when no result yet)
  return (
    <div style={styles.page}>
      <div style={styles.card} className="animate-slide-up">
        <img
          src="/logo.png"
          alt="Logo"
          style={styles.logo}
          className="animate-slide-down"
        />
        <div style={styles.logoText}>MARKET DAY</div>
        <div style={styles.logoSubtext}>Fast-Track Entry System</div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field} className="animate-slide-up">
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div style={styles.field} className="animate-slide-up">
            <label style={styles.label}>Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 0700123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </div>

          {error && (
            <div style={styles.errorBox} className="animate-slide-down">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !name.trim() || !phone.trim()}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <span style={styles.loadingWrapper}>
                <span className="animate-spin" style={{ marginRight: 8 }}>
                  ⟳
                </span>
                Registering...
              </span>
            ) : (
              "Register & Get QR Code →"
            )}
          </button>
        </form>

        <div style={styles.footer}>
          Already registered? Bring your QR code or entry code to the gate.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 16px",
    paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
    background: "var(--bg)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "var(--glass)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "var(--radius)",
    padding: "36px 28px",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-lg)",
  },
  logo: {
    width: 120,
    height: 120,
    objectFit: "contain",
    marginBottom: 8,
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
  logoText: {
    fontFamily: "var(--mono)",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "var(--text)",
    marginBottom: 4,
    textAlign: "center",
  },
  logoSubtext: {
    fontSize: 12,
    color: "var(--muted)",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: "0.05em",
  },
  header: { marginBottom: 0 },
  tagline: {
    fontFamily: "var(--mono)",
    fontSize: 11,
    letterSpacing: "0.2em",
    color: "var(--accent)",
    marginBottom: 12,
    fontWeight: 700,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    margin: "0 0 8px",
    lineHeight: 1.2,
  },
  subtitle: { fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--muted)",
    letterSpacing: "0.04em",
  },
  errorBox: {
    background: "var(--red-dim)",
    border: "1px solid var(--red)",
    color: "var(--red)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    fontSize: 14,
  },
  footer: {
    marginTop: 24,
    fontSize: 13,
    color: "var(--muted)",
    textAlign: "center",
    lineHeight: 1.5,
  },
  successBadge: {
    display: "inline-block",
    background: "var(--green-dim)",
    color: "var(--green)",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "var(--mono)",
    letterSpacing: "0.1em",
    padding: "6px 14px",
    borderRadius: 20,
    marginBottom: 16,
  },
  nameHeading: {
    fontSize: 26,
    fontWeight: 800,
    margin: "0 0 8px",
  },
  instruction: {
    fontSize: 14,
    color: "var(--muted)",
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  qrWrapper: {
    background: "#fff",
    borderRadius: "var(--radius)",
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  qrImage: { width: "100%", maxWidth: 280, display: "block" },
  codeBox: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "14px 20px",
    marginBottom: 24,
    textAlign: "center",
  },
  codeLabel: {
    fontFamily: "var(--mono)",
    fontSize: 10,
    letterSpacing: "0.2em",
    color: "var(--muted)",
    marginBottom: 6,
  },
  codeText: {
    fontFamily: "var(--mono)",
    fontSize: 24,
    fontWeight: 700,
    color: "var(--accent)",
    letterSpacing: "0.08em",
  },
  buttonGroup: { display: "flex", flexDirection: "column" },
  loadingWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
