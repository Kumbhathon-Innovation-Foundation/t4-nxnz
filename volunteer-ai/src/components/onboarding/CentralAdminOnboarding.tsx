import React, { useState } from 'react'
import type { CentralAdminProfile } from '../../types'
import { defaultCentralProfile } from '../../types'
import { DigitalCredentialBadge } from './DigitalCredentialBadge'

interface CentralAdminOnboardingProps {
  initialProfile?: CentralAdminProfile
  onComplete: (profile: CentralAdminProfile) => void
  onCancel: () => void
}

const DISTRICT_SECTORS = [
  'Ramkund Holy Ghats',
  'Panchavati North',
  'Tapovan Transit Hub',
  'Godavari River Promenade',
  'Trimbakeshwar Highway Corridor',
  'Nashik Road Railway Station Gate',
  'CBS Central Bus Station',
  'Muktidham Transit Camp',
  'Sita Gumpha Cultural Zone',
  'Kapaleshwar Mandir Area',
  'Sadhugram Holding Sector Alpha',
  'Sadhugram Holding Sector Beta',
  'Dwarka Circle Transit Diverter',
  'Gangapur Dam Camp Staging',
]

export const CentralAdminOnboarding: React.FC<CentralAdminOnboardingProps> = ({
  initialProfile = defaultCentralProfile,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<CentralAdminProfile>(() => ({
    ...initialProfile,
    badgeId: initialProfile.badgeId || `SS-APEX-CMD-${Date.now().toString().slice(-3)}`,
  }))
  const [errorMsg, setErrorMsg] = useState('')

  const handleWeightChange = (key: keyof CentralAdminProfile['matchingWeights'], val: number) => {
    setFormData((prev) => ({
      ...prev,
      matchingWeights: {
        ...prev.matchingWeights,
        [key]: val,
      },
    }))
  }

  const validateStep = (currentStep: number): boolean => {
    setErrorMsg('')
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setErrorMsg('Apex Commander name is required.')
        return false
      }
      if (!formData.designation.trim()) {
        setErrorMsg('Official designation is required.')
        return false
      }
      if (!formData.clearanceCode.trim()) {
        setErrorMsg('District security clearance code is required.')
        return false
      }
    } else if (currentStep === 3) {
      if (!formData.mandatoryHumanApproval) {
        setErrorMsg('SevaSetu safety policy strictly requires Human Coordinator Approval to be enabled.')
        return false
      }
      if (!formData.policeLifeSafetyVeto) {
        setErrorMsg('Police and Medical Command priority veto must be acknowledged.')
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
          <span className="wizard-role-tag central">Central Administrator Onboarding</span>
        </div>
        <h2>Nashik District Apex Command Setup</h2>
        <p className="wizard-subtitle">
          Oversee 14 operational sectors, cross-zone reinforcement balance, AI policy guardrails, and inter-agency dispatch.
        </p>

        {/* Stepper Indicator */}
        <div className="stepper-bar">
          {[
            { num: 1, label: 'Apex Authority' },
            { num: 2, label: 'District Matrix' },
            { num: 3, label: 'AI Guardrails' },
            { num: 4, label: 'Telecom Resiliency' },
            { num: 5, label: 'Clearance Pass' },
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
            <span className="section-kicker">STEP 1 OF 5 · APEX AUTHORITY VERIFICATION</span>
            <h3>District Command Verification & Credentials</h3>
            <p className="step-desc">
              Central administrators have district-wide purview over capacity rebalancing, escalated missions, and multi-agency links.
            </p>

            <div className="form-grid">
              <label className="field-label">
                Apex Officer Name *
                <input
                  type="text"
                  placeholder="e.g. Arjun Deshmukh, IAS"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>

              <label className="field-label">
                Official Operational Title *
                <input
                  type="text"
                  placeholder="e.g. Central Command Director / District Collector Liaison"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </label>

              <label className="field-label">
                Command Agency / Directorate *
                <input
                  type="text"
                  placeholder="e.g. Nashik District Collectorate / Simhastha Apex Authority"
                  value={formData.agency}
                  onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                />
              </label>

              <label className="field-label">
                Apex Security Clearance Code *
                <input
                  type="text"
                  placeholder="e.g. NSK-CMD-ALPHA-2027"
                  value={formData.clearanceCode}
                  onChange={(e) => setFormData({ ...formData, clearanceCode: e.target.value })}
                />
              </label>
            </div>

            <div className="mock-verification-notice" style={{ marginTop: '20px' }}>
              <span className="verified-badge-icon">🏛</span>
              <div>
                <strong>Simhastha Kumbh Apex Command Directorate</strong>
                <p>Grants authority to issue district rebalance orders and authorize emergency reinforcements.</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 2 OF 5 · DISTRICT-WIDE SECTOR MATRIX</span>
            <h3>14 Monitored Sectors & Surge Corridors</h3>
            <p className="step-desc">
              Central Command aggregates telemetry across all 14 sectors in Nashik district to identify crowd bottlenecks.
            </p>

            <div className="district-matrix-box">
              <div className="matrix-header">
                <strong>Active Nashik Simhastha Grid</strong>
                <span className="matrix-badge">14 of 14 Sectors Linked</span>
              </div>
              <div className="sectors-list-grid">
                {DISTRICT_SECTORS.map((sector, index) => (
                  <div key={sector} className="sector-pill-item">
                    <span className="sec-num">{index + 1}</span>
                    <span className="sec-title">{sector}</span>
                    <span className="sec-dot green"></span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rebalance-info-card" style={{ marginTop: '20px' }}>
              <span className="rebalance-icon">⚖️</span>
              <div>
                <strong>Dynamic Cross-Zone Rebalancing Engine</strong>
                <p>
                  When Tapovan Transit experiences crowd surges while Panchavati has surplus reserves, Central Command can
                  propose transfer orders with calibrated crowd-safe routes and estimated arrival times.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 3 OF 5 · MATCHING POLICY & ETHICAL GUARDRAILS</span>
            <h3>AI Reinforcement Weights & Human Control</h3>
            <p className="step-desc">
              Fine-tune the algorithm that ranks volunteer reinforcements. Never match purely by straight-line distance.
            </p>

            <div className="policy-sliders-box">
              <div className="slider-row">
                <div className="slider-info">
                  <strong>Language & Dialect Compatibility</strong>
                  <small>Matches Marathi, Hindi, Gujarati, South Indian languages</small>
                </div>
                <div className="slider-ctrl">
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={formData.matchingWeights.languageMatch}
                    onChange={(e) => handleWeightChange('languageMatch', Number(e.target.value))}
                  />
                  <span>{formData.matchingWeights.languageMatch}%</span>
                </div>
              </div>

              <div className="slider-row">
                <div className="slider-info">
                  <strong>Skill & Capability Fit</strong>
                  <small>First Aid CPR, Sakhi Women Care, Wayfinding, Medical</small>
                </div>
                <div className="slider-ctrl">
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={formData.matchingWeights.skillMatch}
                    onChange={(e) => handleWeightChange('skillMatch', Number(e.target.value))}
                  />
                  <span>{formData.matchingWeights.skillMatch}%</span>
                </div>
              </div>

              <div className="slider-row">
                <div className="slider-info">
                  <strong>Crowd-Aware Safe Reachable ETA</strong>
                  <small>Considers barricades, river currents, and congestion vs straight-line distance</small>
                </div>
                <div className="slider-ctrl">
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={formData.matchingWeights.safeEta}
                    onChange={(e) => handleWeightChange('safeEta', Number(e.target.value))}
                  />
                  <span>{formData.matchingWeights.safeEta}%</span>
                </div>
              </div>

              <div className="slider-row">
                <div className="slider-info">
                  <strong>Source Zone Stability Buffer</strong>
                  <small>Prevents depleting a donor sector below 80% coverage</small>
                </div>
                <div className="slider-ctrl">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={formData.matchingWeights.sourceZoneStability}
                    onChange={(e) => handleWeightChange('sourceZoneStability', Number(e.target.value))}
                  />
                  <span>{formData.matchingWeights.sourceZoneStability}%</span>
                </div>
              </div>
            </div>

            <div className="consent-box-group" style={{ marginTop: '24px' }}>
              <label className="consent-check-item">
                <input
                  type="checkbox"
                  checked={formData.mandatoryHumanApproval}
                  onChange={(e) => setFormData({ ...formData, mandatoryHumanApproval: e.target.checked })}
                />
                <div>
                  <strong>Strict Human-in-the-Loop Veto Mandatory</strong>
                  <p>AI may only propose reinforcement candidates. An authorized coordinator must explicitly click approve.</p>
                </div>
              </label>

              <label className="consent-check-item">
                <input
                  type="checkbox"
                  checked={formData.policeLifeSafetyVeto}
                  onChange={(e) => setFormData({ ...formData, policeLifeSafetyVeto: e.target.checked })}
                />
                <div>
                  <strong>Police & Health Command Primacy on Life-Safety</strong>
                  <p>For stampede or major medical emergencies, SevaSetu automatically yields dispatch primacy to Police Control.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 4 OF 5 · TELECOM & DEGRADED-MODE RESILIENCY</span>
            <h3>Field Fallback Dispatch Channels</h3>
            <p className="step-desc">
              During peak Snan days, cellular 4G/5G data networks often experience severe throttling. Configure degraded fallbacks.
            </p>

            <div className="fallback-channels-list">
              <label className="fallback-channel-item">
                <input
                  type="checkbox"
                  checked={formData.telecomFallbacks.smsGateway}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      telecomFallbacks: { ...formData.telecomFallbacks, smsGateway: e.target.checked },
                    })
                  }
                />
                <div className="channel-icon">📱</div>
                <div className="channel-text">
                  <strong>National Informatics Centre (NIC) SMS Broadcast Gateway</strong>
                  <p>Dispatches high-priority shift missions via 2G SMS when mobile data latency exceeds 3000ms.</p>
                </div>
                <span className="channel-status">STANDBY</span>
              </label>

              <label className="fallback-channel-item">
                <input
                  type="checkbox"
                  checked={formData.telecomFallbacks.ivrDispatch}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      telecomFallbacks: { ...formData.telecomFallbacks, ivrDispatch: e.target.checked },
                    })
                  }
                />
                <div className="channel-icon">☎️</div>
                <div className="channel-text">
                  <strong>Automated IVR Voice Dispatch</strong>
                  <p>Places automated Hindi/Marathi voice calls to post leads for critical rebalance orders.</p>
                </div>
                <span className="channel-status">STANDBY</span>
              </label>

              <label className="fallback-channel-item">
                <input
                  type="checkbox"
                  checked={formData.telecomFallbacks.printedRosters}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      telecomFallbacks: { ...formData.telecomFallbacks, printedRosters: e.target.checked },
                    })
                  }
                />
                <div className="channel-icon">🖨</div>
                <div className="channel-text">
                  <strong>Offline Printed Roster & SOP Fallback Packets</strong>
                  <p>Pre-generates physical emergency shift slips at all 14 sector command holding posts.</p>
                </div>
                <span className="channel-status">ACTIVE</span>
              </label>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step-panel animate-fade-in">
            <span className="section-kicker">STEP 5 OF 5 · APEX CLEARANCE</span>
            <h3>District Central Command Clearance Pass</h3>
            <p className="step-desc">
              Clearance confirmed. You have full access to District Overview, Intervention Queue, and Learning Metrics.
            </p>

            <DigitalCredentialBadge
              role="Central administrator"
              name={formData.name}
              badgeId={formData.badgeId}
              title={formData.designation}
              subtext={`Apex Clearance: ${formData.clearanceCode} · ${formData.agency}`}
              metaItems={[
                { label: 'JURISDICTION', value: 'Nashik District (14 Sectors)' },
                { label: 'CLEARANCE', value: formData.clearanceCode },
                { label: 'POLICY', value: 'Human-in-Loop Veto Active' },
                { label: 'FALLBACKS', value: 'SMS + IVR + Physical' },
              ]}
              tags={['District Rebalance', 'SOP Oversight', 'Inter-Agency Police Link']}
              onProceed={() => onComplete(formData)}
              proceedText="Enter Central Command Dashboard"
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
              {step === 4 ? 'Authorize Apex Pass' : 'Continue'} <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
