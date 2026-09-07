import React, { useState } from 'react'
import type {
  DashboardRole,
  VolunteerProfile,
  ZonalAdminProfile,
  CentralAdminProfile,
} from '../../types'
import { VolunteerOnboarding } from './VolunteerOnboarding'
import { ZonalAdminOnboarding } from './ZonalAdminOnboarding'
import { CentralAdminOnboarding } from './CentralAdminOnboarding'
import './Onboarding.css'

interface OnboardingFlowProps {
  initialRole?: DashboardRole
  volunteerProfile: VolunteerProfile
  zonalProfile: ZonalAdminProfile
  centralProfile: CentralAdminProfile
  onCompleteVolunteer: (profile: VolunteerProfile) => void
  onCompleteZonal: (profile: ZonalAdminProfile) => void
  onCompleteCentral: (profile: CentralAdminProfile) => void
  onExit: () => void
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialRole = 'Volunteer',
  volunteerProfile,
  zonalProfile,
  centralProfile,
  onCompleteVolunteer,
  onCompleteZonal,
  onCompleteCentral,
  onExit,
}) => {
  const [selectedRole, setSelectedRole] = useState<DashboardRole>(initialRole)

  return (
    <div className="onboarding-page-shell">
      <header className="onboarding-top-nav">
        <div className="onboarding-brand" onClick={onExit} style={{ cursor: 'pointer' }}>
          <span className="brand-badge">S</span>
          <div>
            <strong>SEVASETU</strong>
            <small>Simhastha 2027 · Nashik</small>
          </div>
        </div>

        {/* Quick Role Switcher Tabs */}
        <div className="onboarding-role-pills">
          <span className="pills-label">ONBOARDING ROLE:</span>
          {(['Volunteer', 'Zonal administrator', 'Central administrator'] as DashboardRole[]).map((role) => (
            <button
              type="button"
              key={role}
              className={`role-pill-btn ${selectedRole === role ? 'active' : ''}`}
              onClick={() => setSelectedRole(role)}
            >
              {role === 'Volunteer' && '🤝 Volunteer'}
              {role === 'Zonal administrator' && '🛡 Zonal Commander'}
              {role === 'Central administrator' && '🏛 Central Apex'}
            </button>
          ))}
        </div>

        <button type="button" className="onboarding-exit-btn" onClick={onExit}>
          Return to Home ✕
        </button>
      </header>

      <main className="onboarding-main-viewport">
        {selectedRole === 'Volunteer' && (
          <VolunteerOnboarding
            initialProfile={volunteerProfile}
            onComplete={onCompleteVolunteer}
            onCancel={onExit}
          />
        )}

        {selectedRole === 'Zonal administrator' && (
          <ZonalAdminOnboarding
            initialProfile={zonalProfile}
            onComplete={onCompleteZonal}
            onCancel={onExit}
          />
        )}

        {selectedRole === 'Central administrator' && (
          <CentralAdminOnboarding
            initialProfile={centralProfile}
            onComplete={onCompleteCentral}
            onCancel={onExit}
          />
        )}
      </main>
    </div>
  )
}
