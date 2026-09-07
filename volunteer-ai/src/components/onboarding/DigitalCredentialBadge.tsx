import React from 'react'
import type { DashboardRole } from '../../types'

interface DigitalCredentialBadgeProps {
  role: DashboardRole
  name: string
  badgeId: string
  title: string
  subtext: string
  metaItems: { label: string; value: string }[]
  tags?: string[]
  onProceed?: () => void
  proceedText?: string
}

export const DigitalCredentialBadge: React.FC<DigitalCredentialBadgeProps> = ({
  role,
  name,
  badgeId,
  title,
  subtext,
  metaItems,
  tags = [],
  onProceed,
  proceedText = 'Proceed to Dashboard',
}) => {
  const getRoleTheme = () => {
    switch (role) {
      case 'Volunteer':
        return {
          headerBg: 'linear-gradient(135deg, #b34a2e 0%, #87331f 100%)',
          ribbonColor: '#e08455',
          kicker: 'SEVASETU OFFICIAL VOLUNTEER PASS',
          accent: '#b34a2e',
        }
      case 'Zonal administrator':
        return {
          headerBg: 'linear-gradient(135deg, #2b4c59 0%, #1a323c 100%)',
          ribbonColor: '#4f9c69',
          kicker: 'ZONAL SECTOR COMMAND CREDENTIAL',
          accent: '#2b4c59',
        }
      case 'Central administrator':
        return {
          headerBg: 'linear-gradient(135deg, #42284c 0%, #291730 100%)',
          ribbonColor: '#d59631',
          kicker: 'DISTRICT APEX AUTHORITY CLEARANCE',
          accent: '#42284c',
        }
    }
  }

  const theme = getRoleTheme()
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="credential-badge-container">
      <div className="credential-card">
        {/* Holographic / Authority Header */}
        <div className="credential-header" style={{ background: theme.headerBg }}>
          <div className="badge-emblem">
            <span className="badge-om">🕉</span>
            <div>
              <span className="badge-kicker">{theme.kicker}</span>
              <strong className="badge-festival">SIMHASTHA NASHIK 2027</strong>
            </div>
          </div>
          <span className="badge-status-chip">VERIFIED</span>
        </div>

        {/* Main Body */}
        <div className="credential-body">
          <div className="credential-profile-row">
            <div className="badge-avatar-wrap">
              <div className="badge-avatar" style={{ borderColor: theme.accent }}>
                <span>{initials}</span>
              </div>
              <div className="badge-hologram">SEVA</div>
            </div>

            <div className="badge-identity">
              <h3 className="badge-name">{name}</h3>
              <p className="badge-title">{title}</p>
              <small className="badge-subtext">{subtext}</small>
            </div>

            {/* QR Matrix Code simulation */}
            <div className="badge-qr-box" title={`Verified Security Token: ${badgeId}`}>
              <svg width="72" height="72" viewBox="0 0 72 72" className="badge-qr-svg">
                <rect width="72" height="72" fill="#fff" rx="4" />
                {/* Corner markers */}
                <rect x="6" y="6" width="18" height="18" fill="#203641" rx="2" />
                <rect x="9" y="9" width="12" height="12" fill="#fff" />
                <rect x="12" y="12" width="6" height="6" fill="#203641" />

                <rect x="48" y="6" width="18" height="18" fill="#203641" rx="2" />
                <rect x="51" y="9" width="12" height="12" fill="#fff" />
                <rect x="54" y="12" width="6" height="6" fill="#203641" />

                <rect x="6" y="48" width="18" height="18" fill="#203641" rx="2" />
                <rect x="9" y="51" width="12" height="12" fill="#fff" />
                <rect x="12" y="54" width="6" height="6" fill="#203641" />

                {/* Data dots */}
                <rect x="28" y="8" width="4" height="4" fill="#203641" />
                <rect x="36" y="14" width="6" height="4" fill="#203641" />
                <rect x="30" y="22" width="4" height="6" fill="#203641" />
                <rect x="10" y="30" width="8" height="4" fill="#203641" />
                <rect x="22" y="34" width="4" height="6" fill="#203641" />
                <rect x="32" y="34" width="8" height="4" fill="#203641" />
                <rect x="46" y="30" width="6" height="6" fill="#203641" />
                <rect x="58" y="34" width="6" height="4" fill="#203641" />
                <rect x="30" y="46" width="4" height="8" fill="#203641" />
                <rect x="40" y="48" width="6" height="4" fill="#203641" />
                <rect x="50" y="54" width="8" height="4" fill="#203641" />
                <rect x="44" y="62" width="4" height="4" fill="#203641" />
                <rect x="34" y="58" width="4" height="6" fill="#203641" />
              </svg>
              <span className="badge-qr-caption">SCAN TO VERIFY</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="badge-meta-grid">
            <div className="badge-meta-item">
              <span className="meta-label">PASS ID</span>
              <strong className="meta-value id-code">{badgeId}</strong>
            </div>
            {metaItems.map((item, idx) => (
              <div className="badge-meta-item" key={idx}>
                <span className="meta-label">{item.label}</span>
                <strong className="meta-value">{item.value}</strong>
              </div>
            ))}
          </div>

          {/* Capabilities or Tags */}
          {tags.length > 0 && (
            <div className="badge-tags-section">
              <span className="meta-label">AUTHORIZATIONS & SKILLS</span>
              <div className="badge-tags-list">
                {tags.map((tag) => (
                  <span className="badge-tag-pill" key={tag}>
                    ✓ {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Security & Verification Footer */}
          <div className="badge-security-footer">
            <div className="security-notice">
              <span className="sec-dot"></span>
              <span>Encrypted Nashik Civil Command Token · Consented Shift Validity</span>
            </div>
            <span className="sec-validity">Valid for Simhastha 2027</span>
          </div>
        </div>
      </div>

      {onProceed && (
        <div className="badge-action-bar">
          <button
            type="button"
            className="badge-print-btn"
            onClick={() => window.print()}
            title="Print or save PDF credential"
          >
            🖨 Save / Print Credential
          </button>
          <button type="button" className="badge-launch-btn" onClick={onProceed}>
            {proceedText} <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}
