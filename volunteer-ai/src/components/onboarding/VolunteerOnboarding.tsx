import React, { useState } from 'react'
import type { VolunteerProfile } from '../../types'
import { defaultVolunteerProfile } from '../../types'
import { DigitalCredentialBadge } from './DigitalCredentialBadge'

interface VolunteerOnboardingProps {
  initialProfile?: VolunteerProfile
  onComplete: (profile: VolunteerProfile) => void
  onCancel: () => void
}

const AVAILABLE_LANGUAGES = ['Marathi', 'Hindi', 'English', 'Gujarati', 'Marwari', 'Kannada', 'Telugu']

const AVAILABLE_SKILLS = [
  'First Aid & CPR',
  'Sakhi Women Assistance',
  'Crowd Wayfinding',
  'Lost & Found Reunification',
  'Senior & Wheelchair Mobility',
  'Water & Ghat Safety',
  'De-escalation & Calm Guidance',
  'Language Interpretation',
]

const SECTORS_POSTS = [
  { zone: 'Ramkund Gate', desc: 'Central holy ghat snan area, highest pilgrim footfall', req: 'Languages & First Aid' },
  { zone: 'Panchavati North', desc: 'Mandir circuit and transit corridor', req: 'Wayfinding & Crowd flow' },
  { zone: 'Tapovan Transit', desc: 'Major shuttle and parking hub connecting highways', req: 'Mobility & Logistics' },
  { zone: 'Godavari Riverfront', desc: 'Bridges and river walkways', req: 'Water Safety & Elder Care' },
]

const SHIFTS = [
  { id: 'Morning (06:00 - 14:00)', label: 'Morning Shahi Snan', hours: '06:00 – 14:00', note: 'Peak ghat rush & early arrival queue' },
  { id: 'Afternoon (14:00 - 22:00)', label: 'Afternoon & Deepotsav', hours: '14:00 – 22:00', note: 'Family movement & evening river aarti' },
  { id: 'Night Snan Special (22:00 - 06:00)', label: 'Night Transit & Rest Care', hours: '22:00 – 06:00', note: 'Overnight shuttle arrivals & welfare watch' },
]

export const VolunteerOnboarding: React.FC<VolunteerOnboardingProps> = ({
  initialProfile = defaultVolunteerProfile,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<VolunteerProfile>(() => ({
    ...initialProfile,
    badgeId: initialProfile.badgeId || `SS-NSK-2027-VOL-${Date.now().toString().slice(-4)}`,
  }))
  const [errorMsg, setErrorMsg] = useState('')

  const toggleLanguage = (lang: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }))
  }

  const toggleSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  const validateStep = (currentStep: number): boolean => {
    setErrorMsg('')
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setErrorMsg('Please enter your full legal name.')
        return false
      }
      if (!formData.phone.trim() || formData.phone.length < 8) {
        setErrorMsg('Please enter a valid mobile phone number.')
        return false
      }
      if (!formData.emergencyContact.trim() || !formData.emergencyPhone.trim()) {
        setErrorMsg('Emergency contact details are mandatory for field deployment safety.')
        return false
      }
    } else if (currentStep === 2) {
      if (formData.languages.length === 0) {
        setErrorMsg('Please select at least one language you can communicate in.')
        return false
      }
      if (formData.skills.length === 0) {
        setErrorMsg('Please pick at least one skill or capability.')
        return false
      }
    } else if (currentStep === 3) {
      if (!formData.preferredPost) {
        setErrorMsg('Please choose your preferred Nashik post or sector.')
        return false
      }
    } else if (currentStep === 4) {
      if (!formData.consentLocationDuringShift) {
        setErrorMsg('Consented shift-only location sharing is required for safe mission dispatch.')
        return false
      }
      if (!formData.privacyPledgeAccepted) {
        setErrorMsg('You must agree to the Pilgrim Privacy and Dignity Pledge.')
        return false
      }
      if (!formData.govtIdNumber.trim()) {
        setErrorMsg('Please provide your Govt ID number for civil authority verification.')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5))
    }
  }

  const handleBack = () => {
    setErrorMsg('')
    setStep((prev) => Math.max(prev - 1, 1))
  }

  return (
    <div className="onboarding-flow-container">
      {/* Wizard Header */}
      <div className="wizard-header">
        <div className="wizard-breadcrumb">
          <button type="button" className="wizard-cancel-btn" onClick={onCancel}>
            ← Back
          </button>
          <span className="wizard-role-tag">Volunteer Onboarding</span>
        </div>
        <h2>Join SevaSetu Simhastha 2027</h2>
        <p className="wizard-subtitle">
          Help 100,000+ pilgrims navigate Nashik safely with purposeful, AI-assisted missions.
        </p>

        {/* Stepper Indicator */}
        <div className="stepper-bar">
          {[
            { num: 1, label: 'Identity' },
            { num: 2, label: 'Skills' },
            { num: 3, label: 'Post & Shift' },
            { num: 4, label: 'Privacy & ID' },
            { num: 5, label: 'Seva Pass' },
          ].map((s) => (
            <div
              key={s.num}
              className={`step-bubble ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}
              onClick={() => {
                if (step > s.num) setStep(s.num)
              }}
            >
              <div className="step-circle">{step > s.num ? '✓' : s.num}</div>
              <span className="step-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {errorMsg && <div className="wizard-error-banner">⚠️ {errorMsg}</div>}

      {/* Step Content */}
      <div className="wizard-step-body">
        {step === 1 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 1 OF 5 · PERSONAL READINESS</span>
            <h3>Volunteer Identity & Emergency Contact</h3>
            <p className="step-desc">
              Your details are used by zonal coordinators for team muster and safety support during live shifts.
            </p>

            <div className="form-grid">
              <label className="field-label">
                Full Name (as per Govt ID) *
                <input
                  type="text"
                  placeholder="e.g. Meera Sunil Patil"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>

              <label className="field-label">
                Mobile Number (WhatsApp enabled) *
                <input
                  type="tel"
                  placeholder="+91 98230 XXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </label>

              <label className="field-label">
                Home City / District *
                <input
                  type="text"
                  placeholder="e.g. Nashik, Pune, Mumbai, Nagpur"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </label>

              <label className="field-label">
                Emergency Contact Name & Relation *
                <input
                  type="text"
                  placeholder="e.g. Sunil Patil (Father / Spouse)"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
              </label>

              <label className="field-label">
                Emergency Contact Phone *
                <input
                  type="tel"
                  placeholder="+91 98230 XXXXX"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 2 OF 5 · CAPABILITY & MATCHING</span>
            <h3>Languages & Specialized Skills</h3>
            <p className="step-desc">
              SevaSetu matches missions by language and verified abilities — not simply closest distance.
            </p>

            <div className="chips-section">
              <label className="group-title">Languages Spoken Fluently (Select all that apply) *</label>
              <div className="chips-grid">
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const selected = formData.languages.includes(lang)
                  return (
                    <button
                      type="button"
                      key={lang}
                      className={`chip-button ${selected ? 'selected' : ''}`}
                      onClick={() => toggleLanguage(lang)}
                    >
                      <span>{selected ? '✓' : '+'}</span> {lang}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="chips-section" style={{ marginTop: '24px' }}>
              <label className="group-title">Specialized Skills & Certifications *</label>
              <p className="group-helper">
                Sakhi volunteers provide dedicated support for women, children, and elderly pilgrims.
              </p>
              <div className="chips-grid">
                {AVAILABLE_SKILLS.map((skill) => {
                  const selected = formData.skills.includes(skill)
                  return (
                    <button
                      type="button"
                      key={skill}
                      className={`chip-button ${selected ? 'selected' : ''}`}
                      onClick={() => toggleSkill(skill)}
                    >
                      <span>{selected ? '✓' : '+'}</span> {skill}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 3 OF 5 · FIELD ASSIGNMENT</span>
            <h3>Preferred Post & Shift Schedule</h3>
            <p className="step-desc">
              Select where you can report and the shift window where you will be on active duty.
            </p>

            <div className="card-selector-section">
              <label className="group-title">Nashik Operating Sector / Post *</label>
              <div className="sector-cards-grid">
                {SECTORS_POSTS.map((sec) => {
                  const selected = formData.preferredPost === sec.zone
                  return (
                    <div
                      key={sec.zone}
                      className={`selector-card ${selected ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, preferredPost: sec.zone, preferredZone: sec.zone })}
                    >
                      <div className="card-top">
                        <strong>{sec.zone}</strong>
                        <span className="radio-dot">{selected ? '●' : '○'}</span>
                      </div>
                      <p>{sec.desc}</p>
                      <small className="card-req">Priority: {sec.req}</small>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card-selector-section" style={{ marginTop: '24px' }}>
              <label className="group-title">Shift Timing Preference *</label>
              <div className="shift-cards-grid">
                {SHIFTS.map((s) => {
                  const selected = formData.preferredShift === s.id
                  return (
                    <div
                      key={s.id}
                      className={`selector-card shift-card ${selected ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, preferredShift: s.id })}
                    >
                      <div className="card-top">
                        <div>
                          <strong>{s.label}</strong>
                          <span className="shift-time">{s.hours}</span>
                        </div>
                        <span className="radio-dot">{selected ? '●' : '○'}</span>
                      </div>
                      <p>{s.note}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 4 OF 5 · SAFETY & DIGNITY</span>
            <h3>Privacy Boundaries & Civil Authority Check</h3>
            <p className="step-desc">
              Simhastha 2027 mandates strict adherence to human dignity, safety, and non-commercial service.
            </p>

            <div className="consent-box-group">
              <label className="consent-check-item">
                <input
                  type="checkbox"
                  checked={formData.consentLocationDuringShift}
                  onChange={(e) => setFormData({ ...formData, consentLocationDuringShift: e.target.checked })}
                />
                <div>
                  <strong>Consented Shift-Only Location Sharing</strong>
                  <p>
                    My location will be accessed <em>only</em> while actively checked-in on an assigned shift for safe
                    routing and nearest assistance. Location sharing terminates immediately upon shift checkout.
                  </p>
                </div>
              </label>

              <label className="consent-check-item">
                <input
                  type="checkbox"
                  checked={formData.privacyPledgeAccepted}
                  onChange={(e) => setFormData({ ...formData, privacyPledgeAccepted: e.target.checked })}
                />
                <div>
                  <strong>Pilgrim Dignity & Privacy Pledge</strong>
                  <p>
                    I pledge never to photograph vulnerable or lost pilgrims for social media. I will escort lost persons
                    exclusively to authorized SevaSetu reunification booths or police posts.
                  </p>
                </div>
              </label>
            </div>

            <div className="form-grid" style={{ marginTop: '20px' }}>
              <label className="field-label">
                Government Identity Document Type
                <select
                  value={formData.govtIdType}
                  onChange={(e) => setFormData({ ...formData, govtIdType: e.target.value })}
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Voter ID Card">Voter ID (EPIC)</option>
                  <option value="Passport">Passport</option>
                  <option value="College / NGO ID">College / NGO Issued ID</option>
                </select>
              </label>

              <label className="field-label">
                Govt ID Number (for Civil Verification) *
                <input
                  type="text"
                  placeholder="e.g. 8492-3849-XXXX"
                  value={formData.govtIdNumber}
                  onChange={(e) => setFormData({ ...formData, govtIdNumber: e.target.value })}
                />
              </label>
            </div>

            <div className="mock-verification-notice">
              <span className="verified-badge-icon">🛡</span>
              <div>
                <strong>Instant Police & Municipal Verification Simulation</strong>
                <p>Civil database pre-clearance will link this pass to Simhastha Command wireless records.</p>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 5 OF 5 · OFFICIAL CREDENTIAL</span>
            <h3>Your Verified SevaSetu Digital Pass</h3>
            <p className="step-desc">
              Congratulations! Your volunteer registration is verified. Present this digital badge at your sector
              deployment post for shift muster.
            </p>

            <DigitalCredentialBadge
              role="Volunteer"
              name={formData.name}
              badgeId={formData.badgeId}
              title="Registered Seva Volunteer"
              subtext={`Assigned: ${formData.preferredPost} · ${formData.city}`}
              metaItems={[
                { label: 'ASSIGNED POST', value: formData.preferredPost },
                { label: 'SHIFT', value: formData.preferredShift.split(' ')[0] },
                { label: 'LANGUAGES', value: formData.languages.join(', ') },
                { label: 'CONTACT', value: formData.phone },
              ]}
              tags={formData.skills}
              onProceed={() => onComplete(formData)}
              proceedText="Launch Volunteer Dashboard"
            />
          </div>
        )}
      </div>

      {/* Navigation Footer for Steps 1-4 */}
      {step < 5 && (
        <div className="wizard-nav-footer">
          {step > 1 ? (
            <button type="button" className="ghost-button" onClick={handleBack}>
              ← Previous Step
            </button>
          ) : (
            <button type="button" className="ghost-button" onClick={onCancel}>
              Cancel
            </button>
          )}

          <div className="wizard-footer-right">
            <span className="step-counter">Step {step} of 5</span>
            <button type="button" className="approve-button" onClick={handleNext}>
              {step === 4 ? 'Verify & Generate Pass' : 'Continue'} <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
