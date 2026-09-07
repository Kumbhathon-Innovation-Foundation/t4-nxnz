"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./dispatch.css";
import type { Need, Assignment, MatchBreakdown } from "@/lib/dispatch-types";
import { getJson, postJson, patchJson } from "@/lib/client-fetch";

const ADMIN = { Authorization: "Bearer sevasetu-admin-key" };
const JSONH = { ...ADMIN, "Content-Type": "application/json" };

interface NeedWithMeta extends Need {
  assignments?: Assignment[];
  filled?: number;
}

const URGENCY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const URGENCY_COLOR: Record<string, string> = { critical: "#c81e3c", high: "#e66a1f", medium: "#c99a2e", low: "#6b8f3d" };
const STATUS_LABEL: Record<string, string> = {
  open: "open", allocated: "team assigned", in_progress: "on site", resolved: "resolved", cancelled: "cancelled",
};

const NASHIK_CENTER: [number, number] = [73.79, 19.972];

/** Light basemaps to try in order — all keyless. */
const BASEMAPS = [
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  "https://tiles.openfreemap.org/styles/positron",
];

const GODAVARI_PATH = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "LineString" as const,
    coordinates: [
      [73.7160, 20.0290], [73.7400, 20.0180], [73.7650, 20.0110],
      [73.7900, 20.0080], [73.8110, 20.0010], [73.8260, 19.9880],
      [73.8480, 19.9900], [73.8800, 19.9930], [73.9060, 19.9945],
    ],
  },
};

export default function DispatchPage() {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const selectedRef = useRef<string | null>(null);

  const [needs, setNeeds] = useState<NeedWithMeta[] | null>(null);
  const [fatal, setFatal] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<MatchBreakdown[] | null>(null);
  const [busy, setBusy] = useState("");
  const [simLog, setSimLog] = useState<string[]>([]);

  // ---------------- data ----------------
  const loadNeeds = useCallback(async (): Promise<NeedWithMeta[]> => {
    const j = await getJson<{ needs: NeedWithMeta[] }>("/v1/needs", ADMIN);
    const sorted = [...(j.needs ?? [])].sort(
      (a, b) => (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9) || b.created_at.localeCompare(a.created_at),
    );
    setNeeds(sorted);
    return sorted;
  }, []);

  // ---------------- map ----------------
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    let cancelled = false;

    const tryStyle = (idx: number) => {
      if (cancelled || idx >= BASEMAPS.length) return;
      const map = new maplibregl.Map({
        container: mapDivRef.current!,
        style: BASEMAPS[idx],
        center: NASHIK_CENTER,
        zoom: 11.4,
        attributionControl: false,
      });
      const mapAny = map as unknown as { _sevasetuFallback?: boolean };
      mapRef.current = map;
      map.on("error", (e) => {
        void e;
        // style fetch failed → fall back to next basemap (once)
        if (idx + 1 < BASEMAPS.length && !mapAny._sevasetuFallback) {
          mapAny._sevasetuFallback = true;
          map.remove();
          mapRef.current = null;
          tryStyle(idx + 1);
        }
      });
      map.on("load", () => {
        if (cancelled) return;
        map.addSource("godavari", { type: "geojson", data: GODAVARI_PATH as unknown as GeoJSON.Feature });
        map.addLayer({
          id: "godavari-line",
          type: "line",
          source: "godavari",
          paint: { "line-color": "#4d94c4", "line-width": 5, "line-opacity": 0.75, "line-blur": 0.4 },
        });
        map.addLayer({
          id: "godavari-line-glow",
          type: "line",
          source: "godavari",
          paint: { "line-color": "#4d94c4", "line-width": 12, "line-opacity": 0.18, "line-blur": 4 },
        });
        // markers drawn once map is ready
        setNeeds((cur) => { if (cur) drawMarkers(cur); return cur; });
      });
    };
    tryStyle(0);

    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- markers ----------------
  const drawMarkers = useCallback((list: NeedWithMeta[]) => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    for (const n of list) {
      if (n.status === "resolved" || n.status === "cancelled") continue;
      const el = document.createElement("div");
      const color = URGENCY_COLOR[n.urgency] ?? "#e66a1f";
      const isSel = selectedRef.current === n.need_id;
      const size = isSel ? 36 : n.urgency === "critical" ? 28 : 22;
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:linear-gradient(135deg,${color},${color}cc);border:${isSel ? 3 : 2.5}px solid #fff;box-shadow:0 2px 6px rgba(51,36,28,0.4), 0 0 ${n.urgency === "critical" ? "16px" : "6px"} ${color}88;cursor:pointer;display:flex;`;
      const inner = document.createElement("div");
      inner.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);font-size:11px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.4);";
      inner.textContent = `${n.filled ?? 0}/${n.people_needed}`;
      el.appendChild(inner);
      el.title = n.title;
      el.onclick = () => selectNeed(n.need_id);
      markersRef.current.push(new maplibregl.Marker({ element: el }).setLngLat([n.lng, n.lat]).addTo(map));
    }
  }, []);

  useEffect(() => {
    if (needs && mapRef.current?.loaded()) drawMarkers(needs);
  }, [needs, drawMarkers]);

  // ---------------- actions ----------------
  const selectNeed = useCallback(async (id: string) => {
    setSelected(id);
    selectedRef.current = id;
    setCandidates(null);
    const need = needs?.find((n) => n.need_id === id);
    if (need && mapRef.current) {
      mapRef.current.flyTo({ center: [need.lng, need.lat], zoom: 14, speed: 0.9 });
    }
    if (needs) drawMarkers(needs);
    setBusy("match");
    try {
      const j = await postJson<{ candidates: MatchBreakdown[] }>(`/v1/needs/${id}/match`, JSONH, { top_k: 8 });
      setCandidates(j.candidates ?? []);
    } catch (e) {
      setSimLog((l) => [`⚠ ${e instanceof Error ? e.message : "match failed"}`, ...l].slice(0, 5));
    } finally {
      setBusy("");
    }
  }, [needs, drawMarkers]);

  async function allocate(needId: string) {
    setBusy(`alloc-${needId}`);
    try {
      const j = await postJson<{ allocated: Assignment[] }>(`/v1/needs/${needId}/allocate`, JSONH, {});
      const names = (j.allocated ?? []).map((a) => a.volunteer_name).join(", ");
      if (names) setSimLog((l) => [`⚡ Allocated: ${names}`, ...l].slice(0, 5));
      const list = await loadNeeds();
      if (mapRef.current?.loaded()) drawMarkers(list);
      await selectNeed(needId);
    } catch (e) {
      setSimLog((l) => [`⚠ ${e instanceof Error ? e.message : "allocation failed"}`, ...l].slice(0, 5));
    } finally { setBusy(""); }
  }

  async function checkin(a: Assignment) {
    setBusy(`ci-${a.assignment_id}`);
    try {
      await postJson(`/v1/assignments/${a.assignment_id}/checkin`, JSONH, {});
      setSimLog((l) => [`📍 ${a.volunteer_name} checked in`, ...l].slice(0, 5));
      const list = await loadNeeds();
      if (mapRef.current?.loaded()) drawMarkers(list);
      setSelected(null); selectedRef.current = null; setCandidates(null);
    } finally { setBusy(""); }
  }

  async function checkout(a: Assignment) {
    setBusy(`co-${a.assignment_id}`);
    try {
      const j = await postJson<{ reward_note: string; volunteer_score_total: number }>(`/v1/assignments/${a.assignment_id}/checkout`, JSONH, {});
      setSimLog((l) => [`🏆 ${j.reward_note} → ${a.volunteer_name} (total ${j.volunteer_score_total})`, ...l].slice(0, 5));
      const list = await loadNeeds();
      if (mapRef.current?.loaded()) drawMarkers(list);
      setSelected(null); selectedRef.current = null; setCandidates(null);
    } finally { setBusy(""); }
  }

  async function resolveNeed(needId: string) {
    setBusy(`res-${needId}`);
    try {
      await patchJson(`/v1/needs/${needId}`, JSONH, { status: "resolved" });
      setSimLog((l) => [`✅ Case resolved — Seva Scores awarded to the team`, ...l].slice(0, 5));
      const list = await loadNeeds();
      if (mapRef.current?.loaded()) drawMarkers(list);
      setSelected(null); selectedRef.current = null; setCandidates(null);
    } finally { setBusy(""); }
  }

  async function simulateResponse() {
    setBusy("sim");
    try {
      const list = await loadNeeds();
      const open = list.filter((n) => n.status === "open" || n.status === "allocated");
      if (!open.length) {
        setSimLog((l) => ["🎉 All clear — no open cases to respond to", ...l].slice(0, 5));
        return;
      }
      const target = open[0];
      setSimLog((l) => [`🚨 Responding: "${target.title}" @ ${target.location_name}`, ...l].slice(0, 5));
      await selectNeed(target.need_id);
      await new Promise((r) => setTimeout(r, 1100));

      const aj = await postJson<{ allocated: Assignment[] }>(`/v1/needs/${target.need_id}/allocate`, JSONH, {});
      const names = (aj.allocated ?? []).map((a: Assignment) => a.volunteer_name).join(", ");
      setSimLog((l) => [`⚡ AI matched & allocated ${aj.allocated?.length ?? 0}: ${names}`, ...l].slice(0, 5));
      await loadNeeds();

      for (const a of (aj.allocated ?? []).slice(0, 2)) {
        await new Promise((r) => setTimeout(r, 750));
        await postJson(`/v1/assignments/${a.assignment_id}/checkin`, JSONH, {});
        setSimLog((l) => [`📍 ${a.volunteer_name} on site at ${target.location_name}`, ...l].slice(0, 5));
      }
      for (const a of (aj.allocated ?? []).slice(0, 2)) {
        await new Promise((r) => setTimeout(r, 750));
        const co = await postJson<{ reward_note: string; volunteer_score_total: number }>(`/v1/assignments/${a.assignment_id}/checkout`, JSONH, {});
        setSimLog((l) => [`🏆 ${co.reward_note} → total ${co.volunteer_score_total}`, ...l].slice(0, 5));
      }
      await new Promise((r) => setTimeout(r, 900));
      await patchJson(`/v1/needs/${target.need_id}`, JSONH, { status: "resolved" });
      setSimLog((l) => [`✅ "${target.title}" RESOLVED`, ...l].slice(0, 5));
      const list2 = await loadNeeds();
      if (mapRef.current?.loaded()) drawMarkers(list2);
      setSelected(null); selectedRef.current = null; setCandidates(null);
    } catch (e) {
      setSimLog((l) => [`⚠ Simulation hit an error: ${e instanceof Error ? e.message : "unknown"}`, ...l].slice(0, 5));
    } finally {
      setBusy("");
    }
  }

  // ---------------- boot ----------------
  useEffect(() => {
    loadNeeds()
      .then((list) => {
        if (mapRef.current?.loaded()) drawMarkers(list);
      })
      .catch((e) => setFatal(e instanceof Error ? e.message : "Failed to reach SevaSetu API"));
    const t = setInterval(() => {
      if (!busy) loadNeeds().then((l) => { if (mapRef.current?.loaded()) drawMarkers(l); }).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- render ----------------
  if (fatal) {
    return (
      <div className="fullpage">
        <div className="om-big">ॐ</div>
        <h2>SevaSetu Dispatch can&apos;t reach the server</h2>
        <p>{fatal}</p>
        <button className="btn-mini" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const selectedNeed = needs?.find((n) => n.need_id === selected) ?? null;
  const openCount = needs?.filter((n) => n.status === "open" || n.status === "allocated" || n.status === "in_progress").length ?? 0;
  const criticalCount = needs?.filter((n) => n.urgency === "critical" && n.status !== "resolved" && n.status !== "cancelled").length ?? 0;
  const deployed = needs?.reduce((a, n) => a + (n.assignments?.filter((x) => x.status === "allocated" || x.status === "checked_in").length ?? 0), 0) ?? 0;
  const resolvedToday = needs?.filter((n) => n.status === "resolved").length ?? 0;

  return (
    <div className="disp">
      <header className="disp-header">
        <div className="disp-brand">
          <div className="om">ॐ</div>
          <div>
            <h1>SevaSetu Dispatch</h1>
            <div className="sub">Nashik Kumbh Mela 2027 · Command Center</div>
          </div>
        </div>
        <div className="disp-stats">
          <span className="stat-chip">Open <b>{openCount}</b></span>
          <span className="stat-chip crit">Critical <b>{criticalCount}</b></span>
          <span className="stat-chip">Deployed <b>{deployed}</b></span>
          <span className="stat-chip">Resolved <b>{resolvedToday}</b></span>
        </div>
      </header>

      <div className="disp-body">
        <div className="map-wrap">
          <div ref={mapDivRef} className="maplibregl-map" />
          <button className="sim-btn" onClick={simulateResponse} disabled={!!busy || !needs}>
            {busy === "sim" ? "Responding…" : "⚡ Simulate City Response"}
          </button>
          <div className="map-legend">
            <div className="row"><span className="dot" style={{ background: URGENCY_COLOR.critical }} />Critical</div>
            <div className="row"><span className="dot" style={{ background: URGENCY_COLOR.high }} />High</div>
            <div className="row"><span className="dot" style={{ background: URGENCY_COLOR.medium }} />Medium</div>
            <div className="row"><span className="dot" style={{ background: URGENCY_COLOR.low }} />Low</div>
            <div className="row"><span className="river" style={{ background: "#4d94c4" }} />Godavari river</div>
          </div>
          {simLog.length > 0 && (
            <div className="sim-toast">
              {simLog.map((l, i) => <div key={i} style={{ opacity: 1 - i * 0.14 }}>{l}</div>)}
            </div>
          )}
        </div>

        <aside className="sidebar">
          {!needs && <div className="state-note"><span className="big">🕉️</span>Loading live cases from the volunteer repository…</div>}

          {needs && selectedNeed && (
            <>
              <button className="back-btn" onClick={() => { setSelected(null); selectedRef.current = null; setCandidates(null); if (needs) drawMarkers(needs); }}>
                ← All cases
              </button>
              <div className="need-card selected" style={{ cursor: "default" }}>
                <div className="need-top">
                  <div className="need-title">{selectedNeed.title}</div>
                  <span className={`tag urgency-${selectedNeed.urgency}`}>{selectedNeed.urgency}</span>
                </div>
                <div className="need-desc">{selectedNeed.description}</div>
                <div className="need-meta">
                  <span className="tag loc">📍 {selectedNeed.location_name}</span>
                  <span className="tag">{selectedNeed.category}</span>
                  <span className="tag">needs {selectedNeed.people_needed}</span>
                  {selectedNeed.languages_required.map((l) => <span className="tag" key={l}>🗣 {l}</span>)}
                </div>
                <div className="alloc-bar">
                  <span className="count">{selectedNeed.filled}/{selectedNeed.people_needed} staffed</span>
                  <div className="fill-track"><div className="fill" style={{ width: `${((selectedNeed.filled ?? 0) / selectedNeed.people_needed) * 100}%` }} /></div>
                </div>
                <div className="need-meta" style={{ marginTop: 10 }}>
                  {selectedNeed.status !== "resolved" && selectedNeed.status !== "cancelled" && (
                    <button className="btn-mini" onClick={() => allocate(selectedNeed.need_id)} disabled={!!busy}>
                      {busy === `alloc-${selectedNeed.need_id}` ? "Matching…" : "⚡ Auto-allocate team"}
                    </button>
                  )}
                  {selectedNeed.status !== "resolved" && selectedNeed.status !== "cancelled" && (
                    <button className="btn-mini green" onClick={() => resolveNeed(selectedNeed.need_id)} disabled={!!busy}>
                      ✅ Resolve case
                    </button>
                  )}
                  {(selectedNeed.status === "resolved" || selectedNeed.status === "cancelled") && (
                    <span className="tag" style={{ background: "#eceae7" }}>{STATUS_LABEL[selectedNeed.status]} — no further action</span>
                  )}
                </div>
                {selectedNeed.assignments && selectedNeed.assignments.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {selectedNeed.assignments.map((a) => (
                      <div key={a.assignment_id} className="candidate picked">
                        <div className="row1">
                          <span className="c-name">{a.volunteer_name}</span>
                          <span className={`tag status-${a.status === "completed" ? "resolved" : a.status}`}>{(STATUS_LABEL[a.status] ?? a.status).replace("_", " ")}</span>
                        </div>
                        <div className="c-meta">match {a.match_score} · {a.distance_m < 1000 ? `${a.distance_m} m` : `${(a.distance_m / 1000).toFixed(1)} km`} · {a.skill}</div>
                        {a.status === "allocated" && (
                          <button className="pill-assign" onClick={() => checkin(a)} disabled={!!busy}>📍 Volunteer check-in</button>
                        )}
                        {a.status === "checked_in" && (
                          <button className="pill-assign" style={{ background: "linear-gradient(135deg,#3d9960,#2e7d43)" }} onClick={() => checkout(a)} disabled={!!busy}>
                            ✅ Check-out · award Seva Score
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="match-header">
                <span>🧠 AI Match Ranking</span>
                <span className="hint">skills · score · distance · language</span>
              </div>
              {busy === "match" && <div className="state-note" style={{ padding: 14 }}>Scoring volunteers against this need…</div>}
              {candidates?.map((c) => (
                <div className={`candidate${c.available ? "" : " dim"}`} key={c.volunteer_id}>
                  <div className="row1">
                    <span className="c-name">{c.name}</span>
                    <span className="c-score">{c.final_score.toFixed(2)}</span>
                  </div>
                  <div className="c-meta">
                    <span>{c.distance_m < 1000 ? `${c.distance_m} m` : `${(c.distance_m / 1000).toFixed(1)} km`}</span>
                    <span>sim {c.embedding_similarity.toFixed(2)}</span>
                    <span>seva {c.skill_score} pts</span>
                    <span>{c.language_match ? "🗣 ✓" : "🗣 ✗"}</span>
                  </div>
                  {c.reasons.length > 0 && <div className="c-reasons">✓ {c.reasons.join("  ·  ✓ ")}</div>}
                  {c.warnings.length > 0 && <div className="c-warn">⚠ {c.warnings.join("  ·  ")}</div>}
                </div>
              ))}
              {candidates && !candidates.length && <div className="state-note" style={{ padding: 14 }}>No matching volunteers found.</div>}
            </>
          )}

          {needs && !selectedNeed && (
            <>
              <div className="sidebar-heading">Live Cases · {needs.filter((n) => n.status !== "resolved" && n.status !== "cancelled").length} active</div>
              {needs.map((n) => (
                <div className="need-card" key={n.need_id} onClick={() => selectNeed(n.need_id)}>
                  <div className="need-top">
                    <div className="need-title">{n.title}</div>
                    <span className={`tag urgency-${n.urgency}`}>{n.urgency}</span>
                  </div>
                  <div className="need-desc">{n.description}</div>
                  <div className="need-meta">
                    <span className="tag loc">📍 {n.location_name}</span>
                    <span className={`tag status-${n.status}`}>{STATUS_LABEL[n.status] ?? n.status}</span>
                    <span className="tag">{n.filled}/{n.people_needed} staffed</span>
                  </div>
                </div>
              ))}
              <div className="disp-footer-glow">ॐ · SevaSetu · नाशिक कुंभ २०२७</div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
