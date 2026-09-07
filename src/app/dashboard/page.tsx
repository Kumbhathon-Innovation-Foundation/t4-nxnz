"use client";

import { useCallback, useEffect, useState } from "react";
import "./dashboard.css";
import type { DashboardStats } from "@/lib/stats";

const CAT_COLORS: Record<string, string> = {
  safety: "linear-gradient(90deg, #e66a1f, #b7410e)",
  medical: "linear-gradient(90deg, #d9534f, #6e1423)",
  language: "linear-gradient(90deg, #e7c26a, #c99a2e)",
  crowd: "linear-gradient(90deg, #f4a83a, #e66a1f)",
  logistics: "linear-gradient(90deg, #8a9a5b, #5b6d3a)",
  technical: "linear-gradient(90deg, #6a7fb5, #2d2a4a)",
  teaching: "linear-gradient(90deg, #b58ad4, #6a4a8a)",
  other: "linear-gradient(90deg, #c4a68a, #8a7466)",
};

function Bars({ data, color, unit = "" }: { data: Array<{ name: string; count: number }>; color?: string; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (!data.length) return <div className="empty">No data yet</div>;
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d.name}>
          <span className="name" title={d.name}>{d.name}</span>
          <div className="bar-track">
            <div className={`bar-fill${color ? " " + color : ""}`} style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
          <span className="val">{d.count}{unit}</span>
        </div>
      ))}
    </div>
  );
}

function Funnel({ stages }: { stages: DashboardStats["funnel"] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="funnel">
      {stages.map((s) => (
        <div className="funnel-step" key={s.stage}>
          <span className="name" style={{ fontWeight: 600 }}>{s.label}</span>
          <div className="funnel-track">
            <div className="funnel-fill" style={{ width: `${(s.count / max) * 100}%` }} />
          </div>
          <span className="val" style={{ color: "var(--muted)", textAlign: "right" }}>{s.count}</span>
        </div>
      ))}
    </div>
  );
}

function MediaSplit({ media }: { media: DashboardStats["media"] }) {
  const total = media.video + media.audio + media.typed + media.none;
  if (!total) return <div className="empty">No stories yet</div>;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <>
      <div className="media-split">
        <div style={{ width: seg(media.video), background: "linear-gradient(90deg,#2d2a4a,#6e1423)" }} title={`Video: ${media.video}`} />
        <div style={{ width: seg(media.audio), background: "linear-gradient(90deg,#e66a1f,#f4a83a)" }} title={`Audio: ${media.audio}`} />
        <div style={{ width: seg(media.typed), background: "linear-gradient(90deg,#c99a2e,#e7c26a)" }} title={`Typed: ${media.typed}`} />
        <div style={{ width: seg(media.none), background: "#eadbc8" }} title={`None: ${media.none}`} />
      </div>
      <div className="legend">
        <span><span className="dot" style={{ background: "#6e1423" }} />Video ({media.video})</span>
        <span><span className="dot" style={{ background: "#e66a1f" }} />Audio ({media.audio})</span>
        <span><span className="dot" style={{ background: "#c99a2e" }} />Typed ({media.typed})</span>
        <span><span className="dot" style={{ background: "#eadbc8" }} />None ({media.none})</span>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/v1/admin/stats", {
        headers: { Authorization: "Bearer sevasetu-admin-key" },
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
      }
      setStats(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !stats) {
    return (
      <div className="dash">
        <div className="dash-header"><h1><span className="om">ॐ</span>SevaSetu Dashboard</h1></div>
        <div className="empty">{error || "Loading volunteer metrics…"}</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="dash">
        <div className="dash-header"><h1><span className="om">ॐ</span>SevaSetu Dashboard</h1></div>
        <div className="banner warn">{error}</div>
        <button className="btn" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!stats) return null;

  const maxCat = Math.max(1, ...stats.skillCategories.map((c) => c.count));

  return (
    <div className="dash">
      <div className="dash-header">
        <h1><span className="om">ॐ</span>SevaSetu Dashboard</h1>
        <div className="refresh-row">
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? <span className="spinner" /> : "↻"} Refresh
          </button>
        </div>
      </div>
      <div className="dash-sub">Nashik Kumbh Mela 2027 · Volunteer Repository Metrics</div>

      <div className="stat-grid">
        <div className="stat-card accent"><div className="num">{stats.totals.registered}</div><div className="lbl">Registered<br />Volunteers</div></div>
        <div className="stat-card"><div className="num">{stats.totals.complete}</div><div className="lbl">Fully<br />Onboarded</div></div>
        <div className="stat-card"><div className="num">{stats.totals.inProgress}</div><div className="lbl">In<br />Progress</div></div>
        <div className="stat-card"><div className="num">{stats.totals.kycVerified}</div><div className="lbl">KYC<br />Verified</div></div>
        <div className="stat-card"><div className="num">{stats.totals.policeClear}</div><div className="lbl">Police<br />Clear</div></div>
        <div className="stat-card"><div className="num">{stats.totals.withStory}</div><div className="lbl">Told Their<br />Story</div></div>
        <div className="stat-card"><div className="num">{stats.totals.withCertificates}</div><div className="lbl">With<br />Certificates</div></div>
        <div className="stat-card accent"><div className="num">{stats.scores.totalPointsIssued}</div><div className="lbl">Seva Score<br />Points Issued</div></div>
      </div>

      <div className="dash-grid">
        <div className="panel">
          <h3>🧭 Onboarding Funnel</h3>
          <Funnel stages={stats.funnel} />
        </div>

        <div className="panel">
          <h3>🗣️ Languages Known</h3>
          <Bars data={stats.languages.map((l) => ({ name: l.name, count: l.count }))} color="gold" />
          {stats.languages.length > 0 && (
            <div className="legend" style={{ marginTop: 10 }}>
              <span>Fluent/native: {stats.languages.slice(0, 3).map((l) => `${l.name} ${l.fluentPlus}`).join(" · ")}</span>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>💪 Skill Categories</h3>
          <div className="bars">
            {stats.skillCategories.map((c) => (
              <div className="bar-row" key={c.category}>
                <span className="name">{c.category}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(c.count / maxCat) * 100}%`, background: CAT_COLORS[c.category] }} />
                </div>
                <span className="val">{c.count}</span>
              </div>
            ))}
            {!stats.skillCategories.length && <div className="empty">No data yet</div>}
          </div>
        </div>

        <div className="panel">
          <h3>🎯 Top Skills</h3>
          <Bars data={stats.topSkills} />
        </div>

        <div className="panel">
          <h3>📍 Deployment Locations <span style={{ fontWeight: 400, fontSize: 12 }}>(onboarded only)</span></h3>
          <Bars data={stats.locations} color="maroon" />
        </div>

        <div className="panel">
          <h3>🕐 Availability by Time Slot</h3>
          <Bars data={stats.timeSlots} />
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel wide">
          <h3>🌟 Seva Score Leaderboard</h3>
          {stats.scores.leaderboard.length ? (
            <table className="lb">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Volunteer</th>
                  <th style={{ width: 90 }}>Score</th>
                  <th>Top Skills</th>
                  <th>Languages</th>
                  <th>Locations</th>
                </tr>
              </thead>
              <tbody>
                {stats.scores.leaderboard.map((v, i) => (
                  <tr key={v.volunteer_id}>
                    <td><span className={`rank r${i + 1}`}>{i + 1}</span></td>
                    <td style={{ fontWeight: 600 }}>{v.name}</td>
                    <td className="score">{v.score_total}</td>
                    <td>{v.top_skills.map((s) => <span className="pill" key={s}>{s}</span>)}</td>
                    <td>{v.languages.map((l) => <span className="pill lang" key={l}>{l}</span>)}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{v.locations.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">No volunteers yet</div>}
          <div className="legend" style={{ marginTop: 14 }}>
            <span>Avg score: <b>{stats.scores.avgScore}</b></span>
            <span>Volunteers with score: <b>{stats.scores.volunteersWithScore}</b></span>
            <span>Score events: <b>{stats.scores.scoreEvents}</b></span>
          </div>
        </div>

        <div className="panel">
          <h3>🎙️ Story Media Types</h3>
          <MediaSplit media={stats.media} />
        </div>

        <div className="panel">
          <h3>❤️ Interests (what they want to do)</h3>
          <Bars data={stats.interests} />
        </div>
      </div>

      <div className="panel wide">
        <h3>🆕 Recently Registered</h3>
        {stats.recent.length ? (
          <table className="lb">
            <tbody>
              {stats.recent.map((v) => (
                <tr key={v.volunteer_id}>
                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                  <td><span className="pill">{v.status.replace(/_/g, " ")}</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>
                    {new Date(v.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">No registrations yet</div>}
      </div>

      <div className="dash-footer">ॐ · SevaSetu · Nashik Kumbh Mela 2027 · Tower 4 Pilgrim Experience</div>
    </div>
  );
}
