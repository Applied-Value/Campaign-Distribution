import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import {
  getContactCount,
  getCampaignCount,
  getBounceCount,
  getCampaignContactCount,
  checkConnection,
} from "./lib/db";

/* ── Icons (inline SVG, no deps) ─────────────────────────── */

const icons = {
  rocket: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  upload: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  download: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  refresh: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  arrowLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  database: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
};

const ACTIONS = [
  {
    id: "start-campaign",
    title: "Start Campaign",
    description: "(1) Pulls latest data from Salesforce for new contacts and (2) Downloads last database of contacts and assigned campaigns, distribution, and outreach methods",
    icon: icons.rocket,
    accent: "#4f46e5",
    accentLight: "#eef2ff",
    statKey: "contacts",
    statLabel: "contacts in database",
  },
  {
    id: "upload-revisions",
    title: "Upload Revisions",
    description: "Upload new contact assignments to be integrated into database",
    icon: icons.upload,
    accent: "#0891b2",
    accentLight: "#ecfeff",
    statKey: "assignments",
    statLabel: "active assignments",
  },
  {
    id: "download-salesloft",
    title: "Download to Salesloft",
    description: "Exports refreshed database in Salesloft format",
    icon: icons.download,
    accent: "#059669",
    accentLight: "#ecfdf5",
    statKey: "campaigns",
    statLabel: "campaigns",
  },
  {
    id: "upload-bounce",
    title: "Upload Bounce Folder",
    description: "Upload bounced emails for Claude to scrub LinkedIn and ZoomInfo to find new companies, emails, etc.",
    icon: icons.refresh,
    accent: "#d97706",
    accentLight: "#fffbeb",
    statKey: "bounces",
    statLabel: "pending bounces",
  },
];

/* ── Components ──────────────────────────────────────────── */

function ConnectionBadge({ loading, configured, connected, stats }) {
  if (loading) {
    return (
      <div style={badgeStyle}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d1d5db", display: "inline-block", animation: "pulse 1.5s infinite" }} />
        <span>Connecting...</span>
      </div>
    );
  }
  if (configured && connected) {
    return (
      <div style={{ ...badgeStyle, background: "var(--color-background-success)", border: "1px solid var(--color-border-success)" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span style={{ color: "var(--color-text-success)" }}>
          Connected &middot; {stats.contacts ?? 0} contacts &middot; {stats.campaigns ?? 0} campaigns
        </span>
      </div>
    );
  }
  return (
    <div style={{ ...badgeStyle, background: "var(--color-background-danger)", border: "1px solid var(--color-border-danger)" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
      <span style={{ color: "var(--color-text-danger)" }}>
        {configured ? "Disconnected" : "Not configured"}
      </span>
    </div>
  );
}

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 500,
  padding: "4px 12px",
  borderRadius: 99,
  background: "var(--color-background-secondary)",
  border: "1px solid var(--color-border-primary)",
  color: "var(--color-text-secondary)",
  whiteSpace: "nowrap",
};

/* ── Main App ────────────────────────────────────────────── */

export default function App() {
  const [activeAction, setActiveAction] = useState(null);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({ contacts: null, campaigns: null, assignments: null, bounces: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const ok = await checkConnection();
      if (cancelled) return;
      setConnected(ok);
      if (ok) {
        const [contacts, campaigns, assignments, bounces] = await Promise.all([
          getContactCount(), getCampaignCount(), getCampaignContactCount(), getBounceCount(),
        ]);
        if (!cancelled) setStats({ contacts, campaigns, assignments, bounces });
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [activeAction]);

  const active = ACTIONS.find((a) => a.id === activeAction);
  const configured = !!supabase;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2.5rem 1.5rem 3rem" }}>
      <style>{`
        .action-card {
          position: relative;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-primary);
          border-radius: var(--border-radius-xl);
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }
        .action-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          border-radius: var(--border-radius-xl) var(--border-radius-xl) 0 0;
          transition: height 0.2s ease;
        }
        .action-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-card-hover);
          border-color: var(--color-border-secondary);
        }
        .action-card:hover::before {
          height: 4px;
        }
        .action-card:active {
          transform: translateY(-1px);
        }
        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 13px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: var(--border-radius-md);
          border: 1px solid var(--color-border-primary);
          background: var(--color-background-primary);
          color: var(--color-text-secondary);
          box-shadow: var(--shadow-sm);
          transition: all 0.15s ease;
        }
        .btn-back:hover {
          background: var(--color-background-secondary);
          color: var(--color-text-primary);
          box-shadow: var(--shadow-md);
        }
        .cards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 600px) {
          .cards-grid { grid-template-columns: 1fr; }
        }
        .fade-in { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation-delay: 0.0s; }
        .fade-in-2 { animation-delay: 0.07s; }
        .fade-in-3 { animation-delay: 0.14s; }
        .fade-in-4 { animation-delay: 0.21s; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem", animation: "fadeIn 0.5s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 2px", letterSpacing: "-0.02em", color: "var(--color-text-primary)" }}>
              CEO Sales Outreach
            </h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Campaign management — select an action to get started.
            </p>
          </div>
          <ConnectionBadge loading={loading} configured={configured} connected={connected} stats={stats} />
        </div>
      </div>

      {/* ── Setup banner ── */}
      {!configured && !activeAction && (
        <div style={{
          background: "var(--color-background-info)",
          border: "1px solid var(--color-border-info)",
          borderRadius: "var(--border-radius-lg)",
          padding: "14px 18px",
          fontSize: 13,
          color: "var(--color-text-secondary)",
          marginBottom: "1.25rem",
          lineHeight: 1.7,
          animation: "fadeIn 0.4s ease",
        }}>
          <strong style={{ color: "var(--color-text-primary)" }}>Setup required</strong>{" — "}
          Create a free project at{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener" style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: 500 }}>supabase.com</a>,
          run the migration SQL in the SQL Editor, then add your project URL and anon key to <code style={{ fontSize: 12, background: "var(--color-background-secondary)", padding: "2px 6px", borderRadius: 4 }}>.env</code> and restart the dev server.
        </div>
      )}

      {/* ── Action cards ── */}
      {!activeAction && (
        <div className="cards-grid">
          {ACTIONS.map((action, i) => {
            const count = stats[action.statKey];
            return (
              <div
                key={action.id}
                className={`action-card fade-in fade-in-${i + 1}`}
                onClick={() => setActiveAction(action.id)}
                style={{ "--card-accent": action.accent }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: action.accent, borderRadius: "var(--border-radius-xl) var(--border-radius-xl) 0 0" }} />

                {/* Icon */}
                <div style={{
                  width: 44, height: 44,
                  borderRadius: "var(--border-radius-md)",
                  background: action.accentLight,
                  color: action.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14,
                }}>
                  {action.icon}
                </div>

                {/* Title */}
                <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
                  {action.title}
                </p>

                {/* Description */}
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.55 }}>
                  {action.description}
                </p>

                {/* Stats */}
                {connected && count !== null && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 12, color: "var(--color-text-tertiary)",
                    margin: "14px 0 0",
                    paddingTop: 12,
                    borderTop: "1px solid var(--color-border-primary)",
                  }}>
                    {icons.database}
                    <span>{count} {action.statLabel}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Active action detail ── */}
      {activeAction && active && (
        <div style={{ animation: "fadeInUp 0.3s ease" }}>
          <button className="btn-back" onClick={() => setActiveAction(null)}>
            {icons.arrowLeft}
            Back
          </button>

          <div style={{
            background: "var(--color-background-primary)",
            border: "1px solid var(--color-border-primary)",
            borderRadius: "var(--border-radius-xl)",
            padding: "3rem 2rem",
            textAlign: "center",
            marginTop: "1rem",
            boxShadow: "var(--shadow-md)",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Accent bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: active.accent }} />

            {/* Large icon */}
            <div style={{
              width: 64, height: 64,
              borderRadius: "var(--border-radius-lg)",
              background: active.accentLight,
              color: active.accent,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <div style={{ transform: "scale(1.5)" }}>{active.icon}</div>
            </div>

            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
              {active.title}
            </p>
            <p style={{
              fontSize: 14, color: "var(--color-text-secondary)",
              margin: "0 auto 20px", maxWidth: 460, lineHeight: 1.6,
            }}>
              {active.description}
            </p>

            {connected && stats[active.statKey] !== null && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 14, fontWeight: 600, color: active.accent,
                background: active.accentLight,
                padding: "6px 16px", borderRadius: 99,
                marginBottom: 20,
              }}>
                {icons.database}
                {stats[active.statKey]} {active.statLabel}
              </div>
            )}

            <div style={{
              display: "inline-block",
              fontSize: 12, fontWeight: 500,
              color: "var(--color-text-tertiary)",
              background: "var(--color-background-secondary)",
              padding: "6px 14px", borderRadius: 99,
            }}>
              Coming soon — under development
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        textAlign: "center",
        marginTop: "3rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid var(--color-border-primary)",
        fontSize: 11,
        color: "var(--color-text-tertiary)",
        animation: "fadeIn 0.6s ease",
      }}>
        Powered by Supabase &middot; Built with Claude
      </div>
    </div>
  );
}
