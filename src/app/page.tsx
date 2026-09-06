"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { STORY_PROMPTS, NASHIK_LOCATIONS, TIME_SLOTS, KUMBH_ROLE_SUGGESTIONS, LANGUAGES, INTEREST_CHIPS } from "@/lib/meta";

type Lang = "en" | "mr";

const T = {
  appTagline: { en: "Kumbh 2027 · Nashik Volunteer Platform", mr: "कुंभ २०२७ · नाशिक सेवादार मंच" },
  cta: { en: "Sign up to Sevā", mr: "सेवेसाठी नोंदणी करा" },
  hero: {
    en: "One registration. Serve millions of pilgrims. Your skills, languages and time — matched to where the Kumbh needs you most.",
    mr: "एकदा नोंदणी. लाखो भक्तांची सेवा. तुमचे कौशल्य, भाषा आणि वेळ — कुंभाला जिथे सर्वाधर गरज आहे तिथे जुळवले जातील.",
  },
  stepOf: (n: number, total: number) => ({ en: `Step ${n} of ${total}`, mr: `पायरी ${n} / ${total}` }),
};

const TOTAL_STEPS = 8;

interface ExtractedProfile {
  languages_spoken: Array<{ language: string; proficiency: string; evidence_quote?: string }>;
  skills: Array<{ name: string; category: string; confidence: number; evidence_quote?: string }>;
  recommended_roles: string[];
  summary: string;
  personality_traits: string[];
  [k: string]: unknown;
}

export default function OnboardingWizard() {
  const [lang, setLang] = useState<Lang>("en");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const t = (o: { en: string; mr: string }) => (lang === "en" ? o.en : o.mr);

  // session persistence
  useEffect(() => {
    const saved = localStorage.getItem("sevasetu_session");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.volunteer_id && s.step) {
          setVolunteerId(s.volunteer_id);
          setStep(Math.min(s.step, TOTAL_STEPS - 1));
        }
      } catch { /* ignore */ }
    }
  }, []);
  const persist = useCallback((vid: string | null, s: number) => {
    if (vid) localStorage.setItem("sevasetu_session", JSON.stringify({ volunteer_id: vid, step: s }));
    else localStorage.removeItem("sevasetu_session");
  }, []);

  const goto = (s: number) => { setStep(s); persist(volunteerId, s); window.scrollTo(0, 0); };

  // step 1 state
  const [volunteerId, setVolunteerId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", dob: "", gender: "", phone: "", email: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // step 2/3 state
  const [aadhaar, setAadhaar] = useState("");
  const [kycDone, setKycDone] = useState(false);

  // step 4 state (story)
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<"audio" | "video">("audio");
  const [transcriptOverride, setTranscriptOverride] = useState("");
  const [extracted, setExtracted] = useState<ExtractedProfile | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

  // step 5 (documents)
  const [docFiles, setDocFiles] = useState<FileList | null>(null);
  const [docsSaved, setDocsSaved] = useState(0);

  // step 6 (review chips)
  const [skillChips, setSkillChips] = useState<string[]>([]);
  const [langChips, setLangChips] = useState<string[]>([]);

  // step 7 (details form)
  const [locations, setLocations] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [availDate, setAvailDate] = useState("");

  // step 8 (done)
  const [done, setDone] = useState<{ volunteer_id: string; name: string; score_total: number; summary: string } | null>(null);

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // ---------- Step 1: basic info + OTP ----------
  async function submitBasic() {
    setError("");
    if (!form.name.trim() || !form.dob || form.phone.replace(/\D/g, "").length !== 10) {
      setError(t({ en: "Please fill name, DOB and a valid 10-digit phone number.", mr: "कृपया नाव, जन्मतारीख आणि वैध १० अंकी फोन नंबर भरा." }));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Signup failed");
      setVolunteerId(json.volunteer_id);
      persist(json.volunteer_id, 1);
      setOtpSent(true);
      setInfo(t({ en: "Demo OTP is 123456 (shown in dev banner).", mr: "डेमो OTP १२३४५६ आहे (डेव्ह बॅनरमध्ये दाखवले आहे)." }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  function verifyOtp() {
    if (otp === "123456") {
      setPhoneVerified(true);
      setInfo("");
      persist(volunteerId, 2);
      goto(2);
    } else {
      setError(t({ en: "Wrong OTP. Demo code is 123456.", mr: "चुकीचा OTP. डेमो कोड १२३४५६ आहे." }));
    }
  }

  // ---------- Steps 2-3: KYC + police (placeholder, simulated) ----------
  async function submitIdentity() {
    setError("");
    if (aadhaar.replace(/\D/g, "").length !== 12) {
      setError(t({ en: "Enter a 12-digit Aadhaar number (demo).", mr: "१२ अंकी आधार क्रमांक टाका (डेमो)." }));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteer_id: volunteerId, aadhaar_number: aadhaar }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "KYC failed");
      setKycDone(true);
      persist(volunteerId, 3);
      goto(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "KYC failed");
    } finally {
      setBusy(false);
    }
  }

  // ---------- Step 4: record story ----------
  async function startRecording(withVideo: boolean) {
    setError("");
    // getUserMedia requires a secure context (https:// or localhost).
    // Explain clearly instead of a generic "denied" when accessed over LAN IP.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(t({
        en: "Microphone/camera need a secure connection. Open this page via http://localhost:3000 on this device — or use the typed-story option below.",
        mr: "मायक्रोफोन/कॅमेरासाठी सुरक्षित जोडणी आवश्यक आहे. या डिव्हाइसवर http://localhost:3000 वापरून पृष्ठ उघडा — किंवा खाली टाइप केलेली गोष्ट वापरा.",
      }));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t({
        en: "This browser doesn't support audio/video recording. Use the typed-story option below.",
        mr: "हा ब्राउझर ऑडिओ/व्हिडिओ रेकॉर्डिंगला सपोर्ट करत नाही. खाली टाइप केलेली गोष्ट वापरा.",
      }));
      return;
    }
    try {
      // Request permission first so the browser prompt appears before recorder setup.
      const stream = await navigator.mediaDevices.getUserMedia(withVideo ? { audio: true, video: { facingMode: "user" } } : { audio: true });
      const mime = withVideo ? "video/webm" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported(mime) ? mime : "" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setMediaBlob(new Blob(chunksRef.current, { type: mime }));
        setLiveStream(null);
      };
      rec.start();
      mediaRef.current = rec;
      if (withVideo) setLiveStream(stream);
      setMediaType(withVideo ? "video" : "audio");
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError(t({
          en: "No microphone/camera found on this device. Use the typed-story option below.",
          mr: "या डिव्हाइसवर मायक्रोफोन/कॅमेरा आढळला नाही. खाली टाइप केलेली गोष्ट वापरा.",
        }));
      } else if (name === "NotAllowedError" || name === "SecurityError") {
        setError(t({
          en: "Permission blocked. Click the 🔒 icon in the address bar → allow Microphone/Camera, then tap record again. Or use the typed-story option below.",
          mr: "परवानगी ब्लॉक झाली आहे. पत्यातील 🔴 लॉक आयकॉनवर क्लिक करा → मायक्रोफोन/कॅमेरा परवानगी द्या, नंतर पुन्हा रेकॉर्ड दाबा. किंवा खाली टाइप केलेली गोष्ट वापरा.",
        }));
      } else {
        setError(t({
          en: "Couldn't start recording. You can type your story below instead.",
          mr: "रेकॉर्डिंग सुरू करता आली नाही. तुम्ही खाली तुमची गोष्ट टाइप करू शकता.",
        }));
      }
    }
  }

  // Live camera preview during video recording
  useEffect(() => {
    if (liveStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = liveStream;
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [liveStream]);

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  async function submitStory() {
    setError("");
    setInfo("");
    const hasMedia = mediaBlob && seconds >= 5;
    if (!hasMedia && !transcriptOverride.trim()) {
      setError(t({ en: "Record at least 5 seconds (or type your story).", mr: "किमान ५ सेकंद रेकॉर्ड करा (किंवा तुमची गोष्ट टाइप करा)." }));
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("volunteer_id", volunteerId!);
      if (hasMedia) {
        fd.append("media", mediaBlob!, `story.${mediaType === "video" ? "webm" : "webm"}`);
        fd.append("media_type", mediaType);
      } else {
        fd.append("transcript", transcriptOverride);
      }
      const res = await fetch("/api/onboarding/story", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Story processing failed");
      setExtracted(json.profile);
      setSkillChips((json.skills ?? []).map((s: { name: string }) => s.name));
      setLangChips((json.languages ?? []).map((l: { language: string }) => l.language));
      setInterests((json.profile?.recommended_roles ?? []).slice(0, 4));
      persist(volunteerId, 5);
      goto(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Story processing failed");
    } finally {
      setBusy(false);
    }
  }

  // ---------- Step 5: documents ----------
  async function submitDocs() {
    setError("");
    if (!docFiles || !docFiles.length) { goto(6); return; } // optional step
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("volunteer_id", volunteerId!);
      Array.from(docFiles).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/onboarding/documents", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Upload failed");
      setDocsSaved(json.documents?.length ?? 0);
      persist(volunteerId, 6);
      goto(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  // ---------- Step 6: review ----------
  function saveReview() {
    setInterests((prev) => Array.from(new Set([...prev, ...skillChips.slice(0, 2)])));
    persist(volunteerId, 7);
    goto(7);
  }

  // ---------- Step 7: details ----------
  async function submitDetails() {
    setError("");
    if (!locations.length) {
      setError(t({ en: "Select at least one location.", mr: "किमान एक ठिकाण निवडा." }));
      return;
    }
    if (!slots.length) {
      setError(t({ en: "Select at least one time slot.", mr: "किमान एक वेळ निवडा." }));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteer_id: volunteerId,
          availability: { dates: availDate ? [availDate] : [], time_slots: slots, locations },
          interests,
          interest_free_text: freeText,
          skills: skillChips.map((name) => ({ name, category: guessCategory(name) })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to save details");
      persist(volunteerId, 8);
      goto(8);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save details");
    } finally {
      setBusy(false);
    }
  }

  function guessCategory(name: string): string {
    const n = name.toLowerCase();
    if (/(swim|life.?guard|rescue)/.test(n)) return "safety";
    if (/(first.?aid|medical|health)/.test(n)) return "medical";
    if (/(language|translat|interpret)/.test(n)) return "language";
    if (/(crowd|queue)/.test(n)) return "crowd";
    if (/(tech|computer|app)/.test(n)) return "technical";
    if (/(teach|tutor)/.test(n)) return "teaching";
    return "other";
  }

  // ---------- Step 8: complete ----------
  async function complete() {
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteer_id: volunteerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Completion failed");
      setDone({ volunteer_id: json.volunteer_id, name: json.name, score_total: json.score_total, summary: json.summary });
      persist(null, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Completion failed");
    } finally {
      setBusy(false);
    }
  }

  // ================= RENDER =================
  if (done) {
    return (
      <div className="container">
        <div className="header"><div className="om">🙏</div><h1>SevaSetu</h1><div className="tagline">{t(T.appTagline)}</div></div>
        <div className="id-card">
          <div style={{ fontSize: 40 }}>✨</div>
          <h2>{t({ en: `Welcome, Sevārthī ${done.name}!`, mr: `स्वागत आहे, सेवार्थी ${done.name}!` })}</h2>
          <div className="vid">{done.volunteer_id}</div>
          <div style={{ marginTop: 14 }}>
            <span className="score-badge">🌟 Seva Score: {done.score_total}</span>
          </div>
        </div>
        <div className="card">
          {done.summary && <p style={{ lineHeight: 1.6 }}>{done.summary}</p>}
          <ul className="prompt-list">
            <li>{t({ en: "Your profile is now live in the SevaSetu volunteer repository.", mr: "तुमचे प्रोफाइल आता सेवासेतू रिपॉझिटरीमध्ये जिवंत आहे." })}</li>
            <li>{t({ en: "Partner apps can discover you by skills, language, and location.", mr: "पार्टनर ॲप्स तुम्हाला कौशल्य, भाषा आणि ठिकाणानुसार शोधू शकतात." })}</li>
            <li>{t({ en: "As you volunteer, your Seva Score grows per skill — unlocking priority dispatch.", mr: "तुम्ही सेवा करता तसे तुमचा सेवा स्कोर प्रत्येक कौशल्यानुसार वाढतो — प्राधान्य नेमणुकीसाठी." })}</li>
          </ul>
        </div>
        <button className="btn secondary" onClick={() => window.location.reload()}>
          {t({ en: "Start a new registration", mr: "नवी नोंदणी सुरू करा" })}
        </button>
        <div className="footer-note">SevaSetu · Nashik Kumbh Mela 2027 · Tower 4 Pilgrim Experience</div>
      </div>
    );
  }

  const progressDots = Array.from({ length: TOTAL_STEPS }, (_, i) => (
    <span key={i} className={i <= step ? "done" : ""} />
  ));

  return (
    <div className="container">
      <div className="header">
        <div className="om">ॐ</div>
        <h1>SevaSetu</h1>
        <div className="tagline">{t(T.appTagline)}</div>
      </div>

      <div className="lang-toggle">
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
        <button className={lang === "mr" ? "active" : ""} onClick={() => setLang("mr")}>मराठी</button>
      </div>

      {step > 0 && <div className="progress">{progressDots}</div>}
      {step > 0 && <div className="step-label">{t(T.stepOf(step + 1, TOTAL_STEPS))}</div>}

      {error && <div className="banner warn">{error}</div>}
      {info && <div className="banner info">{info}</div>}

      {/* ---------- STEP 0: landing ---------- */}
      {step === 0 && (
        <div className="card">
          <p style={{ lineHeight: 1.65, fontSize: 15.5 }}>{t(T.hero)}</p>
          <ul className="prompt-list">
            <li>🎙️ {t({ en: "Tell your story — just talk for 1–3 minutes, we do the rest.", mr: "🎙️ तुमची गोष्ट सांगा — फक्त १–३ मिनिटं बोला, बाकी आम्ही करू." })}</li>
            <li>🪪 {t({ en: "Quick identity check (Aadhaar — demo).", mr: "🪪 जलद ओळख तपासणी (आधार — डेमो)." })}</li>
            <li>🌟 {t({ en: "Earn a Seva Score as you serve.", mr: "🌟 सेवा करता करता सेवा स्कोअर कमवा." })}</li>
          </ul>
          <button className="btn" onClick={() => goto(1)}>{t(T.cta)}</button>
        </div>
      )}

      {/* ---------- STEP 1: basic info ---------- */}
      {step === 1 && (
        <div className="card">
          <h2 className="step-title">{t({ en: "About you", mr: "तुमची माहिती" })}</h2>
          <div className="field">
            <label>{t({ en: "Full name", mr: "पूर्ण नाव" })}</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t({ en: "e.g. Rahul Deshmukh", mr: "उदा. राहुल देशमुख" })} />
          </div>
          <div className="field">
            <label>{t({ en: "Date of birth", mr: "जन्मतारीख" })}</label>
            <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div className="field">
            <label>{t({ en: "Gender", mr: "लिंग" })}</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">—</option>
              <option value="female">{t({ en: "Female", mr: "स्त्री" })}</option>
              <option value="male">{t({ en: "Male", mr: "पुरुष" })}</option>
              <option value="other">{t({ en: "Other", mr: "इतर" })}</option>
            </select>
          </div>
          <div className="field">
            <label>{t({ en: "Mobile number", mr: "मोबाईल क्रमांक" })}</label>
            <input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} placeholder="9876543210" />
          </div>
          <div className="field">
            <label>{t({ en: "Email (optional)", mr: "ईमेल (ऐच्छिक)" })}</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {!otpSent ? (
            <button className="btn" disabled={busy} onClick={submitBasic}>{busy ? <span className="spinner" /> : null}{t({ en: "Continue", mr: "पुढे जा" })}</button>
          ) : (
            <>
              <div className="banner info">🔐 {t({ en: "Demo OTP: 123456", mr: "डेमो OTP: १२३४५६" })}</div>
              <div className="field">
                <label>{t({ en: "Enter OTP", mr: "OTP टाका" })}</label>
                <input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
              </div>
              <button className="btn" onClick={verifyOtp}>{t({ en: "Verify & continue", mr: "पडताळा व पुढे" })}</button>
            </>
          )}
        </div>
      )}

      {/* ---------- STEP 2: KYC ---------- */}
      {step === 2 && (
        <div className="card">
          <h2 className="step-title">{t({ en: "Identity check (KYC)", mr: "ओळख तपासणी (केवायसी)" })}</h2>
          <div className="field">
            <label>{t({ en: "Aadhaar number", mr: "आधार क्रमांक" })}</label>
            <input inputMode="numeric" maxLength={12} value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))} placeholder="XXXXXXXXXXXX" />
            <div className="hint">{t({ en: "Demo mode — use any 12 digits. Only last 4 are stored.", mr: "डेमो मोड — कोणतेही १२ अंक वापरा. फक्त शेवटचे ४ साठवले जातात." })}</div>
          </div>
          <div className="banner info">📸 {t({ en: "Video KYC capture would appear here in production. (Demo placeholder)", mr: "उत्पादनात येथे व्हिडिओ केवायसी दिसेल. (डेमो प्लेसहोल्डर)" })}</div>
          <button className="btn" disabled={busy} onClick={submitIdentity}>
            {busy ? <><span className="spinner" />{t({ en: "Verifying…", mr: "पडताळत आहे…" })}</> : t({ en: "Verify identity", mr: "ओळख पडताळा" })}
          </button>
        </div>
      )}

      {/* ---------- STEP 3: police verification ---------- */}
      {step === 3 && (
        <div className="card">
          <h2 className="step-title">{t({ en: "Police verification", mr: "पोलीस पडताळणी" })}</h2>
          <p style={{ lineHeight: 1.6 }}>{t({ en: "A background check keeps every pilgrim safe. This runs automatically — no documents needed from you right now.", mr: "प्रत्येक भक्ताची सुरक्षा म्हणून पार्श्वभूमी तपासणी होते. ही आपोआप चालते — सध्या तुम्हाला कागदपत्रे द्यावी लागणार नाहीत." })}</p>
          {kycDone ? (
            <div className="banner ok">✅ {t({ en: "Verification cleared (demo status).", mr: "पडताळणी पूर्ण (डेमो स्थिती)." })}</div>
          ) : (
            <div className="banner info">⏳ {t({ en: "Status: processing (demo).", mr: "स्थिती: प्रक्रिया सुरू (डेमो)." })}</div>
          )}
          <button className="btn" onClick={() => goto(4)}>{t({ en: "Continue", mr: "पुढे जा" })}</button>
        </div>
      )}

      {/* ---------- STEP 4: story ---------- */}
      {step === 4 && (
        <div className="card">
          <h2 className="step-title">{t({ en: "Tell us your story", mr: "तुमची गोष्ट सांगा" })}</h2>
          <p style={{ lineHeight: 1.6 }}>{t({ en: "Answer these while recording — in any language you like:", mr: "रेकॉर्ड करताना यांची उत्तरे द्या — कोणत्याही भाषेत:" })}</p>
          <ul className="prompt-list">
            {STORY_PROMPTS.map((p) => <li key={p.id}>{p.icon} {lang === "en" ? p.en : p.mr}</li>)}
          </ul>
          <div className="recorder">
            {liveStream && (
              <video
                ref={videoPreviewRef}
                className="live-preview"
                muted
                playsInline
                autoPlay
              />
            )}
            {!recording ? (
              <>
                <div style={{ display: "flex", gap: 14 }}>
                  <button className="rec-dot" aria-label={t({ en: "Record audio", mr: "ऑडिओ रेकॉर्ड" })} onClick={() => startRecording(false)} />
                  <button className="rec-dot" style={{ background: "radial-gradient(circle, var(--indigo) 60%, var(--maroon))" }} aria-label={t({ en: "Record video", mr: "व्हिडिओ रेकॉर्ड" })} onClick={() => startRecording(true)} />
                </div>
                <div className="hint">{t({ en: "Tap circle to record audio · dark circle for video", mr: "ऑडिओसाठी वर्तुळ दाबा · व्हिडिओसाठी गडद वर्तुळ" })}</div>
              </>
            ) : (
              <>
                <button className="rec-dot recording" onClick={stopRecording} aria-label={t({ en: "Stop", mr: "थांबा" })} />
                <div className="timer">● {fmtTime(seconds)} / 03:00</div>
                <button className="btn" onClick={stopRecording}>{t({ en: "Stop recording", mr: "रेकॉर्डिंग थांबवा" })}</button>
              </>
            )}
            {mediaBlob && !recording && (
              <div className="banner ok">🎬 {t({ en: `Recording ready (${fmtTime(seconds)}).`, mr: `रेकॉर्डिंग तयार (${fmtTime(seconds)}).` })}</div>
            )}
          </div>
          <details>
            <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>
              {t({ en: "No mic? Type your story instead", mr: "मायक नाही? ऐवजी टाइप करा" })}
            </summary>
            <div className="field">
              <textarea rows={4} value={transcriptOverride} onChange={(e) => setTranscriptOverride(e.target.value)} placeholder={t({ en: "I speak Marathi and Hindi, I know swimming and first aid, available mornings near Ramkund…", mr: "मला मराठी आणि हिंदी येते, मला पोहणे आणि प्राथमिक उपचार माहीत आहेत, सकाळी रामकुंड जवळ उपलब्ध…" })} />
            </div>
          </details>
          <button className="btn" disabled={busy} onClick={submitStory}>
            {busy ? <><span className="spinner" />{t({ en: "Understanding your story… (transcribe → extract)", mr: "तुमची गोष्ट समजून घेत आहोत… (ट्रान्सक्राइब → एक्स्ट्रॅक्ट)" })}</> : t({ en: "Submit my story", mr: "माझी गोष्ट सबमिट करा" })}
          </button>
        </div>
      )}

      {/* ---------- STEP 5: documents ---------- */}
      {step === 5 && (
        <div className="card">
          <h2 className="step-title">{t({ en: "Add certificates (optional)", mr: "प्रमाणपत्रे जोडा (ऐच्छिक)" })}</h2>
          <p style={{ lineHeight: 1.6 }}>{t({ en: "Swimming, first-aid, NCC, language certificates — these boost your Seva Score.", mr: "पोहणे, प्राथमिक उपचार, एनसीसी, भाषा प्रमाणपत्रे — या तुमचा सेवा स्कोअर वाढवतात." })}</p>
          <div className="field">
            <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setDocFiles(e.target.files)} />
          </div>
          <button className="btn" disabled={busy} onClick={submitDocs}>
            {busy ? <><span className="spinner" />{t({ en: "Uploading…", mr: "अपलोड होत आहे…" })}</> : t({ en: "Upload & continue", mr: "अपलोड करा व पुढे" })}
          </button>
          <button className="btn secondary" onClick={() => goto(6)}>{t({ en: "Skip for now", mr: "आत्ता वगळा" })}</button>
        </div>
      )}

      {/* ---------- STEP 6: review ---------- */}
      {step === 6 && (
        <div className="card">
          <h2 className="step-title">{t({ en: "What we understood", mr: "आम्हाला काय समजले" })}</h2>
          {extracted?.summary && <p style={{ lineHeight: 1.6, marginBottom: 10 }}>{extracted.summary}</p>}
          <div className="step-label">{t({ en: "Your skills — tap to remove wrong ones", mr: "तुमची कौशल्ये — चुकीची दाबून काढा" })}</div>
          <div className="chips">
            {skillChips.map((s) => (
              <button key={s} className="chip selected" onClick={() => setSkillChips(skillChips.filter((x) => x !== s))}>{s} ✕</button>
            ))}
            {!skillChips.length && <span className="hint">{t({ en: "None detected — add in next step.", mr: "आढळले नाही — पुढील पायरीत जोडा." })}</span>}
          </div>
          <div className="step-label">{t({ en: "Your languages", mr: "तुमच्या भाषा" })}</div>
          <div className="chips">
            {langChips.map((l) => (
              <button key={l} className="chip selected" onClick={() => setLangChips(langChips.filter((x) => x !== l))}>{l} ✕</button>
            ))}
            {LANGUAGES.filter((l) => !langChips.includes(l)).slice(0, 6).map((l) => (
              <button key={l} className="chip" onClick={() => setLangChips([...langChips, l])}>+ {l}</button>
            ))}
          </div>
          <button className="btn" onClick={saveReview}>{t({ en: "Looks right — continue", mr: "बरोबर आहे — पुढे" })}</button>
        </div>
      )}

      {/* ---------- STEP 7: details ---------- */}
      {step === 7 && (
        <div className="card">
          <h2 className="step-title">{t({ en: "When & where can you serve?", mr: "केव्हा आणि कुठे सेवा करू शकता?" })}</h2>
          <div className="field">
            <label>{t({ en: "Available date(s)", mr: "उपलब्ध दिवस" })}</label>
            <input type="date" value={availDate} onChange={(e) => setAvailDate(e.target.value)} />
            <div className="hint">{t({ en: "Kumbh 2027 period — pick one or leave for full period.", mr: "कुंभ २०२७ कालावधी — एक निवडा किंवा संपूर्ण काळासाठी सोडा." })}</div>
          </div>
          <div className="step-label">{t({ en: "Time of day", mr: "दिवसाची वेळ" })}</div>
          <div className="chips">
            {TIME_SLOTS.map((s) => (
              <button key={s} className={`chip ${slots.includes(s) ? "selected" : ""}`} onClick={() => toggle(slots, s, setSlots)}>{s}</button>
            ))}
          </div>
          <div className="step-label">{t({ en: "Locations in Nashik", mr: "नाशिकमधील ठिकाणे" })}</div>
          <div className="chips">
            {NASHIK_LOCATIONS.map((l) => (
              <button key={l} className={`chip ${locations.includes(l) ? "selected" : ""}`} onClick={() => toggle(locations, l, setLocations)}>{l}</button>
            ))}
          </div>
          <div className="step-label">{t({ en: "What interests you most?", mr: "कशात स्वारस्य आहे?" })}</div>
          <div className="chips">
            {INTEREST_CHIPS.map((c) => (
              <button key={c} className={`chip ${interests.includes(c) ? "selected" : ""}`} onClick={() => toggle(interests, c, setInterests)}>{c}</button>
            ))}
          </div>
          <div className="field">
            <label>{t({ en: "Anything else? (one line)", mr: "अजून काही? (एक ओळ)" })}</label>
            <input value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder={t({ en: "e.g. I can guide elderly pilgrims in Telugu", mr: "उदा. तेलगूमध्ये वृद्ध भक्तांना मार्गदर्शन करू शकतो" })} />
          </div>
          <button className="btn" disabled={busy} onClick={submitDetails}>
            {busy ? <span className="spinner" /> : null}{t({ en: "Complete registration", mr: "नोंदणी पूर्ण करा" })}
          </button>
        </div>
      )}

      {/* ---------- STEP 8: finish ---------- */}
      {step === 8 && (
        <div className="card" style={{ textAlign: "center" }}>
          <h2 className="step-title">{t({ en: "All set!", mr: "सर्व तयार!" })}</h2>
          <button className="btn" disabled={busy} onClick={complete}>
            {busy ? <span className="spinner" /> : null}{t({ en: "Create my SevaSetu ID", mr: "माझा सेवासेतू आयडी तयार करा" })}
          </button>
        </div>
      )}

      <div className="footer-note">ॐ · SevaSetu · Nashik Kumbh Mela 2027 · Tower 4 Pilgrim Experience</div>
    </div>
  );
}
