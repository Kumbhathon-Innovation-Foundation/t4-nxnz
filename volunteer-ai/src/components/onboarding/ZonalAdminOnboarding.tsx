import React, { useState } from 'react'
import type { ZonalAdminProfile } from '../../types'
import { defaultZonalProfile } from '../../types'
import { DigitalCredentialBadge } from './DigitalCredentialBadge'

interface ZonalAdminOnboardingProps {
  initialProfile?: ZonalAdminProfile
  onComplete: (profile: ZonalAdminProfile) => void
  onCancel: () => void
}

const ZONAL_SECTORS = [
  {
    name: 'Ramkund Gate',
    district: 'Panchavati District',
    description: 'Central holy ghat snan sector. Critical crowd confluence point.',
    subPosts: ['Ramkund Gate Main', 'Godavari Snan Steps', 'Gandhi Smarak Post', 'Dharamsala Corridor'],
  },
  {
    name: 'Panchavati North',
    district: 'Panchavati Mandir District',
    description: 'Ancient temple pedestrian circuit. High wayfinding and elderly support demand.',
    subPosts: ['Kalaram Mandir Chowk', 'Sita Gumpha Corridor', 'Panchavati North Bus Drop', 'Tilak Path Link'],
  },
  {
    name: 'Tapovan Transit',
    district: 'Tapovan Logistics District',
    description: 'Primary bus transit & parking interchange. Shuttles from Trimbak and Mumbai highway.',
    subPosts: ['Tapovan Bus Terminus', 'Holding Camp Alpha', 'Medical First Aid Post 3', 'Ring Road Diverter'],
  },
]

const MANDATORY_SOPS = [
  { id: 'Missing volunteer response', label: 'Missing Volunteer & Roster Gap Protocol' },
  { id: 'Family reunification protocol', label: 'Lost Person & Child Reunification SOP' },
  { id: 'Heat and hydration checks', label: 'Extreme Heat & Hydration Watch Protocol' },
  { id: 'Incident escalation matrix', label: 'Crowd Surge & Police Inter-Agency Escalation' },
]

export const ZonalAdminOnboarding: React.FC<ZonalAdminOnboardingProps> = ({
  initialProfile = defaultZonalProfile,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<ZonalAdminProfile>(() => ({
    ...initialProfile,
    badgeId: initialProfile.badgeId || `SS-ZONAL-SECTOR-${Date.now().toString().slice(-3)}`,
  }))
  const [errorMsg, setErrorMsg] = useState('')

  const toggleSubPost = (post: string) => {
    setFormData((prev) => ({
      ...prev,
      subPosts: prev.subPosts.includes(post)
        ? prev.subPosts.filter((p) => p !== post)
        : [...prev.subPosts, post],
    }))
  }

  const toggleSop = (sopId: string) => {
    setFormData((prev) => ({
      ...prev,
      verifiedSops: prev.verifiedSops.includes(sopId)
        ? prev.verifiedSops.filter((s) => s !== sopId)
        : [...prev.verifiedSops, sopId],
    }))
  }

  const handleZoneSelect = (zoneName: string) => {
    const selected = ZONAL_SECTORS.find((z) => z.name === zoneName)
    setFormData((prev) => ({
      ...prev,
      assignedZone: zoneName,
      subPosts: selected ? selected.subPosts : prev.subPosts,
    }))
  }

  const validateStep = (currentStep: number): boolean => {
    setErrorMsg('')
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setErrorMsg('Officer legal name is required.')
        return false
      }
      if (!formData.designation.trim()) {
        setErrorMsg('Official operational designation is required.')
        return false
      }
      if (!formData.phone.trim() || formData.phone.length < 8) {
        setErrorMsg('Valid direct mobile number is required.')
        return false
      }
    } else if (currentStep === 2) {
      if (!formData.assignedZone) {
        setErrorMsg('Please select an operational sector.')
        return false
      }
      if (formData.subPosts.length === 0) {
        setErrorMsg('Select at least one active sub-post within this sector.')
        return false
      }
    } else if (currentStep === 3) {
      if (formData.minCoverageThreshold < 60 || formData.minCoverageThreshold > 99) {
        setErrorMsg('Coverage alarm threshold must be between 60% and 99%.')
        return false
      }
    } else if (currentStep === 4) {
      if (formData.verifiedSops.length < 2) {
        setErrorMsg('Please confirm review of at least two mandatory operational SOPs.')
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

  const currentSectorData = ZONAL_SECTORS.find((z) => z.name === formData.assignedZone) || ZONAL_SECTORS[0]

  return (
    <div className="onboarding-flow-container">
      {/* Wizard Header */}
      <div className="wizard-header">
        <div className="wizard-breadcrumb">
          <button type="button" className="wizard-cancel-btn" onClick={onCancel}>
            ← Back
          </button>
          <span className="wizard-role-tag zonal">Zonal Administrator Onboarding</span>
        </div>
        <h2>Sector Command & Operations Setup</h2>
        <p className="wizard-subtitle">
          Configure real-time headcount, post oversight, AI roster assistant, and SOP execution for your sector.
        </p>

        {/* Stepper Indicator */}
        <div className="stepper-bar">
          {[
            { num: 1, label: 'Credentials' },
            { num: 2, label: 'Sector Geometry' },
            { num: 3, label: 'Thresholds' },
            { num: 4, label: 'Local SOPs' },
            { num: 5, label: 'Command Pass' },
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
            <span className="section-kicker">STEP 1 OF 5 · COMMAND OFFICER CREDENTIALS</span>
            <h3>Officer Identity & Agency Affiliation</h3>
            <p className="step-desc">
              Zonal administrators manage live post muster, approve reinforcements, and communicate with emergency services.
            </p>

            <div className="form-grid">
              <label className="field-label">
                Officer Full Name *
                <input
                  type="text"
                  placeholder="e.g. Devv Kulkarni"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>

              <label className="field-label">
                Operational Designation *
                <input
                  type="text"
                  placeholder="e.g. Zonal Sector Commander, NGO Sector Lead"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </label>

              <label className="field-label">
                Affiliated Department / Organization *
                <input
                  type="text"
                  placeholder="e.g. Nashik Municipal Corp, Seva Bharati, Scout & Guides"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </label>

              <label className="field-label">
                Direct Mobile Contact *
                <input
                  type="tel"
                  placeholder="+91 94222 XXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </label>

              <label className="field-label">
                Simhastha Wireless Radio Channel
                <input
                  type="text"
                  placeholder="CH-04 (Simhastha North VHF)"
                  value={formData.emergencyRadioChannel}
                  onChange={(e) => setFormData({ ...formData, emergencyRadioChannel: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 2 OF 5 · GEOGRAPHIC JURISDICTION</span>
            <h3>Sector Allocation & Active Sub-Posts</h3>
            <p className="step-desc">
              Select the primary geographic zone you are commanding and confirm the active posts under your watch.
            </p>

            <div className="card-selector-section">
              <label className="group-title">Primary Sector Command *</label>
              <div className="sector-cards-grid">
                {ZONAL_SECTORS.map((sec) => {
                  const selected = formData.assignedZone === sec.name
                  return (
                    <div
                      key={sec.name}
                      className={`selector-card ${selected ? 'selected' : ''}`}
                      onClick={() => handleZoneSelect(sec.name)}
                    >
                      <div className="card-top">
                        <strong>{sec.name}</strong>
                        <span className="radio-dot">{selected ? '●' : '○'}</span>
                      </div>
                      <small className="card-district">{sec.district}</small>
                      <p>{sec.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="chips-section" style={{ marginTop: '24px' }}>
              <label className="group-title">Active Sub-Posts Under Your Sector *</label>
              <p className="group-helper">Toggle the specific check-in locations active for this deployment shift:</p>
              <div className="chips-grid">
                {currentSectorData.subPosts.map((post) => {
                  const selected = formData.subPosts.includes(post)
                  return (
                    <button
                      type="button"
                      key={post}
                      className={`chip-button ${selected ? 'selected' : ''}`}
                      onClick={() => toggleSubPost(post)}
                    >
                      <span>{selected ? '✓' : '+'}</span> {post}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="slider-box" style={{ marginTop: '24px' }}>
              <div className="slider-header">
                <label className="group-title">Target Volunteer Post Capacity</label>
                <strong className="slider-value">{formData.targetCapacity} Volunteers</strong>
              </div>
              <input
                type="range"
                min="30"
                max="160"
                step="2"
                value={formData.targetCapacity}
                onChange={(e) => setFormData({ ...formData, targetCapacity: Number(e.target.value) })}
                className="range-input"
              />
              <div className="slider-limits">
                <span>30 (Minimal Post)</span>
                <span>94 (Standard Shift)</span>
                <span>160 (Shahi Snan Peak)</span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 3 OF 5 · OPERATIONAL THRESHOLDS</span>
            <h3>Alert Triggers & AI Roster Assistant</h3>
            <p className="step-desc">
              Define the sensitivity for automated gap detection and AI roster rebalancing suggestions.
            </p>

            <div className="slider-box">
              <div className="slider-header">
                <label className="group-title">Coverage Alarm Threshold</label>
                <strong className="slider-value">{formData.minCoverageThreshold}%</strong>
              </div>
              <p className="group-helper">
                Alert the sector lead whenever post check-in drops below this percentage of required muster.
              </p>
              <input
                type="range"
                min="60"
                max="95"
                step="5"
                value={formData.minCoverageThreshold}
                onChange={(e) => setFormData({ ...formData, minCoverageThreshold: Number(e.target.value) })}
                className="range-input"
              />
              <div className="slider-limits">
                <span>60% (Permissive)</span>
                <span>85% (Recommended Standard)</span>
                <span>95% (High Consequence)</span>
              </div>
            </div>

            <div className="slider-box" style={{ marginTop: '24px' }}>
              <div className="slider-header">
                <label className="group-title">Max Reachable ETA Tolerance for Reinforcements</label>
                <strong className="slider-value">{formData.maxEtaToleranceMinutes} Minutes</strong>
              </div>
              <p className="group-helper">
                AI will prioritize nearest reachable reserves who can arrive within this crowd-adjusted travel window.
              </p>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={formData.maxEtaToleranceMinutes}
                onChange={(e) => setFormData({ ...formData, maxEtaToleranceMinutes: Number(e.target.value) })}
                className="range-input"
              />
            </div>

            <div className="consent-box-group" style={{ marginTop: '24px' }}>
              <label className="consent-check-item">
                <input
                  type="checkbox"
                  checked={formData.autoRosterEnabled}
                  onChange={(e) => setFormData({ ...formData, autoRosterEnabled: e.target.checked })}
                />
                <div>
                  <strong>Enable Roster Agent Suggestions (Human-Controlled)</strong>
                  <p>
                    Roster Agent proposes volunteer shifts to close coverage gaps based on crowd density and language demand.
                    No reassignments occur without your explicit click approval.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 4 OF 5 · STANDARD OPERATING PROCEDURES</span>
            <h3>Field Playbook & Emergency Protocols</h3>
            <p className="step-desc">
              Verify your team's compliance with approved Nashik civil SOPs before taking active command.
            </p>

            <div className="sop-checklist">
              {MANDATORY_SOPS.map((sop) => {
                const checked = formData.verifiedSops.includes(sop.id)
                return (
                  <label key={sop.id} className={`sop-check-row ${checked ? 'checked' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleSop(sop.id)} />
                    <div className="sop-info">
                      <strong>{sop.label}</strong>
                      <span>Review step-by-step checklist and handover escalation criteria</span>
                    </div>
                    <span className="sop-state-tag">{checked ? 'VERIFIED' : 'PENDING'}</span>
                  </label>
                )
              })}
            </div>

            <div className="mock-verification-notice" style={{ marginTop: '20px' }}>
              <span className="verified-badge-icon">📻</span>
              <div>
                <strong>Inter-Agency Wireless Handshake Active</strong>
                <p>Connected to Nashik City Police Control (Dial 112) and 108 Emergency Medical Command.</p>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 5 OF 5 · COMMAND PASS</span>
            <h3>Zonal Sector Command Credentials</h3>
            <p className="step-desc">
              Your sector command post is authorized. You are ready to open the live Deployment Board and Mission Control.
            </p>

            <DigitalCredentialBadge
              role="Zonal administrator"
              name={formData.name}
              badgeId={formData.badgeId}
              title={formData.designation}
              subtext={`${formData.assignedZone} Sector · ${formData.organization}`}
              metaItems={[
                { label: 'SECTOR', value: formData.assignedZone },
                { label: 'TARGET ROSTER', value: `${formData.targetCapacity} Volunteers` },
                { label: 'ALERT THRESHOLD', value: `< ${formData.minCoverageThreshold}%` },
                { label: 'RADIO CHANNEL', value: formData.emergencyRadioChannel },
              ]}
              tags={[...formData.subPosts.slice(0, 3), `${formData.verifiedSops.length} SOPs Verified`]}
              onProceed={() => onComplete(formData)}
              proceedText="Enter Zonal Command Dashboard"
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
              {step === 4 ? 'Issue Command Pass' : 'Continue'} <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
