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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  upload: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  download: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  refresh: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
  arrowRight: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  arrowCurve: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <polyline points="22 2 22 8 16 8" />
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
    owner: "Ryan",
    descriptionJSX: true,
    description: [],
    icon: icons.rocket,
    accent: "#4f46e5",
    accentLight: "#eef2ff",
    statKey: "contacts",
    statLabel: "contacts in database",
    step: 1,
  },
  {
    id: "upload-revisions",
    title: "Upload Revisions",
    owner: "Ryan",
    description: [
      "Updates campaign database with corrections then emails campaign team that the campaign is ready for Salesloft upload",
    ],
    icon: icons.upload,
    accent: "#0891b2",
    accentLight: "#ecfeff",
    statKey: "assignments",
    statLabel: "active assignments",
    step: 2,
  },
  {
    id: "download-salesloft",
    title: "Download to Salesloft",
    owner: "Campaign Team",
    description: [
      "Exports updated campaign database in Salesloft format",
    ],
    icon: icons.download,
    accent: "#059669",
    accentLight: "#ecfdf5",
    statKey: "campaigns",
    statLabel: "campaigns",
    step: 3,
  },
  {
    id: "upload-bounce",
    title: "Upload Bounce Folder",
    owner: "Ryan",
    description: [
      "Prompts upload of bounced emails folder then Claude scrubs LinkedIn, ZoomInfo, etc. to find new companies, titles, and emails for contacts and updates the campaign database",
    ],
    icon: icons.refresh,
    accent: "#d97706",
    accentLight: "#fffbeb",
    statKey: "bounces",
    statLabel: "pending bounces",
    step: 4,
  },
];

/* ── Step 1 structured description ───────────────────────── */

function StartCampaignDesc({ compact = false }) {
  const fs = compact ? 12 : 14;
  const ol = { margin: 0, paddingLeft: compact ? 16 : 20, listStyleType: "decimal" };
  const li = { marginBottom: compact ? 3 : 5, lineHeight: compact ? 1.55 : 1.65 };
  const sub = { margin: "3px 0 0", paddingLeft: compact ? 14 : 18, listStyleType: "lower-alpha" };
  return (
    <div style={{ fontSize: fs, color: "var(--color-text-secondary)" }}>
      <ol style={ol}>
        <li style={li}>Downloads latest contact list from Salesforce</li>
        <li style={li}>
          Analyzes data:
          <ol style={sub}>
            <li style={li}>Autopopulates distributions/methods/contacts from previous campaign</li>
            <li style={li}>Suggests distribution and method for new contacts</li>
            <li style={li}>Downloads an editable Excel for review</li>
          </ol>
        </li>
      </ol>
    </div>
  );
}

/* ── Arrow connector between steps ───────────────────────── */

function StepArrow({ cycle = false }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-text-tertiary)",
      flexShrink: 0,
      padding: "0 2px",
    }}>
      {cycle ? icons.arrowCurve : icons.arrowRight}
    </div>
  );
}

/* ── Connection badge ────────────────────────────────────── */

function ConnectionBadge({ loading, configured, connected, stats }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 12px",
    borderRadius: 99,
    whiteSpace: "nowrap",
  };
  const dot = (color) => (
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
  );

  if (loading) {
    return (
      <div style={{ ...base, background: "var(--color-background-secondary)", border: "1px solid var(--color-border-primary)", color: "var(--color-text-secondary)" }}>
        {dot("#d1d5db")}
        <span>Connecting...</span>
      </div>
    );
  }
  if (configured && connected) {
    return (
      <div style={{ ...base, background: "var(--color-background-success)", border: "1px solid var(--color-border-success)", color: "var(--color-text-success)" }}>
        {dot("#22c55e")}
        <span>Connected &middot; {stats.contacts ?? 0} contacts &middot; {stats.campaigns ?? 0} campaigns</span>
      </div>
    );
  }
  return (
    <div style={{ ...base, background: "var(--color-background-danger)", border: "1px solid var(--color-border-danger)", color: "var(--color-text-danger)" }}>
      {dot("#ef4444")}
      <span>{configured ? "Disconnected" : "Not configured"}</span>
    </div>
  );
}

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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1.5rem 3rem" }}>
      <style>{`
        .step-card {
          position: relative;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-primary);
          border-radius: var(--border-radius-xl);
          padding: 1.25rem 1.25rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .step-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          border-radius: var(--border-radius-xl) var(--border-radius-xl) 0 0;
          transition: height 0.2s ease;
        }
        .step-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-card-hover);
          border-color: var(--color-border-secondary);
        }
        .step-card:hover::before { height: 4px; }
        .step-card:active { transform: translateY(-1px); }

        .pipeline-row {
          display: flex;
          align-items: stretch;
          gap: 0;
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

        .fade-in { animation: fadeInUp 0.4s ease both; }
        .fade-in-1 { animation-delay: 0.0s; }
        .fade-in-2 { animation-delay: 0.07s; }
        .fade-in-3 { animation-delay: 0.14s; }
        .fade-in-4 { animation-delay: 0.21s; }

        @media (max-width: 900px) {
          .pipeline-row {
            flex-direction: column;
            gap: 0;
          }
          .pipeline-arrow-h { display: none !important; }
          .pipeline-arrow-v { display: flex !important; }
        }
        @media (min-width: 901px) {
          .pipeline-arrow-v { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem", animation: "fadeIn 0.5s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 2px", letterSpacing: "-0.02em", color: "var(--color-text-primary)" }}>
              Sales Campaign AI Tool
            </h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Campaign management pipeline — follow each step in sequence.
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
          marginBottom: "1.5rem",
          lineHeight: 1.7,
          animation: "fadeIn 0.4s ease",
        }}>
          <strong style={{ color: "var(--color-text-primary)" }}>Setup required</strong>{" — "}
          Create a free project at{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener" style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: 500 }}>supabase.com</a>,
          run the migration SQL in the SQL Editor, then add your project URL and anon key to <code style={{ fontSize: 12, background: "var(--color-background-secondary)", padding: "2px 6px", borderRadius: 4 }}>.env</code> and restart the dev server.
        </div>
      )}

      {/* ── Pipeline: cards + arrows ── */}
      {!activeAction && (
        <>
          <div className="pipeline-row">
            {ACTIONS.map((action, i) => {
              const count = stats[action.statKey];
              const isLast = i === ACTIONS.length - 1;
              return (
                <div key={action.id} style={{ display: "contents" }}>
                  {/* Card */}
                  <div
                    className={`step-card fade-in fade-in-${i + 1}`}
                    onClick={() => setActiveAction(action.id)}
                  >
                    {/* Accent bar */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: action.accent, borderRadius: "var(--border-radius-xl) var(--border-radius-xl) 0 0" }} />

                    {/* Step number + icon */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 38, height: 38,
                        borderRadius: "var(--border-radius-md)",
                        background: action.accentLight,
                        color: action.accent,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {action.icon}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: action.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        Step {action.step}
                      </span>
                    </div>

                    {/* Title */}
                    <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "var(--color-text-primary)" }}>
                      {action.title}
                    </p>

                    {/* Owner */}
                    <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Owner: {action.owner}
                    </p>

                    {/* Description */}
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, flex: 1 }}>
                      {action.descriptionJSX ? (
                        <StartCampaignDesc compact />
                      ) : (
                        action.description.map((line, j) => (
                          <div key={j} style={{ marginBottom: j < action.description.length - 1 ? 2 : 0 }}>{line}</div>
                        ))
                      )}
                    </div>

                    {/* Stats */}
                    {connected && count !== null && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 11, color: "var(--color-text-tertiary)",
                        margin: "12px 0 0",
                        paddingTop: 10,
                        borderTop: "1px solid var(--color-border-primary)",
                      }}>
                        {icons.database}
                        <span>{count} {action.statLabel}</span>
                      </div>
                    )}
                  </div>

                  {/* Horizontal arrow (desktop) */}
                  {!isLast && (
                    <div className="pipeline-arrow-h" style={{ display: "flex", alignItems: "center", padding: "0 6px", flexShrink: 0 }}>
                      <StepArrow />
                    </div>
                  )}

                  {/* Vertical arrow (mobile) */}
                  {!isLast && (
                    <div className="pipeline-arrow-v" style={{ display: "none", justifyContent: "center", padding: "6px 0", transform: "rotate(90deg)" }}>
                      <StepArrow />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cycle arrow: step 4 → step 1 */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 20,
            color: "var(--color-text-tertiary)",
            fontSize: 12,
            animation: "fadeIn 0.6s ease 0.3s both",
          }}>
            {icons.arrowCurve}
            <span>Cycle repeats — updated contacts feed back into the next campaign</span>
          </div>
        </>
      )}

      {/* ── Active action detail ── */}
      {activeAction && active && (
        <div style={{ animation: "fadeInUp 0.3s ease" }}>
          <button className="btn-back" onClick={() => setActiveAction(null)}>
            {icons.arrowLeft}
            Back to pipeline
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

            {/* Step badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: active.accent,
              background: active.accentLight,
              padding: "4px 14px",
              borderRadius: 99,
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Step {active.step}
            </div>

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

            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
              {active.title}
            </p>

            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-tertiary)", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Owner: {active.owner}
            </p>

            <div style={{
              fontSize: 14, color: "var(--color-text-secondary)",
              margin: "0 auto 24px", maxWidth: 500, lineHeight: 1.7,
              textAlign: "left",
            }}>
              {active.descriptionJSX ? (
                <StartCampaignDesc />
              ) : (
                active.description.map((line, j) => (
                  <div key={j} style={{ marginBottom: j < active.description.length - 1 ? 2 : 0 }}>{line}</div>
                ))
              )}
            </div>

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
