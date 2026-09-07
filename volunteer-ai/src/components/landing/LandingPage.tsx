import React from 'react'
import type { DashboardRole } from '../../types'
import './LandingPage.css'

interface LandingPageProps {
  onStartOnboarding: (role: DashboardRole) => void
  onOpenDashboard: (role: DashboardRole) => void
  onOpenSignIn: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onOpenDashboard,
  onOpenSignIn,
}) => {
  return (
    <div className="landing-container">
      {/* Top Navigation */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <span className="brand-symbol">S</span>
            <div>
              <strong>SEVASETU</strong>
              <small>Simhastha 2027 · Nashik</small>
            </div>
          </div>

          <nav className="landing-menu">
            <a href="#roles">Platform Roles</a>
            <a href="#operational-loop">Operational Loop</a>
            <a href="#guardrails">Safety Guardrails</a>
            <a href="#telecom">Field Fallbacks</a>
          </nav>

          <div className="landing-nav-actions">
            <button type="button" className="landing-signin-btn" onClick={onOpenSignIn}>
              Sign In
            </button>
            <button
              type="button"
              className="landing-cta-btn"
              onClick={() => onStartOnboarding('Volunteer')}
            >
              Start Onboarding <span>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-tag-pill">
            <span className="om-icon">🕉</span>
            <span>SIMHASTHA 2027 · NASHIK CIVIC MOBILIZATION</span>
          </div>

          <h1 className="hero-title">
            Right volunteer. Right place. <br />
            Right route. Right support. <br />
            <em className="highlight-text">Verified outcome.</em>
          </h1>

          <p className="hero-description">
            SevaSetu is an AI-assisted, human-controlled volunteer operations platform engineered for 100,000+ pilgrims.
            Every assignment is a closed-loop live mission that never stops at publishing a static roster.
          </p>

          <div className="hero-cta-group">
            <div className="dropdown-cta-wrap">
              <button
                type="button"
                className="hero-primary-cta"
                onClick={() => onStartOnboarding('Volunteer')}
              >
                Start Volunteer Onboarding <span>→</span>
              </button>
            </div>

            <button
              type="button"
              className="hero-secondary-cta"
              onClick={() => onOpenDashboard('Zonal administrator')}
            >
              Explore Live Operations (Demo) <span>↗</span>
            </button>
          </div>

          {/* Real-Time Operational Telemetry Strip */}
          <div className="telemetry-strip">
            <div className="telemetry-card">
              <span className="telemetry-val">14</span>
              <span className="telemetry-label">Monitored Sectors</span>
              <small>Ramkund, Tapovan & Ghats</small>
            </div>
            <div className="telemetry-card">
              <span className="telemetry-val">88%</span>
              <span className="telemetry-label">Real-Time Coverage</span>
              <small>83 of 94 volunteers checked in</small>
            </div>
            <div className="telemetry-card">
              <span className="telemetry-val">6.2 min</span>
              <span className="telemetry-label">Reachable Safe ETA</span>
              <small>Crowd-aware routing vs straight-line</small>
            </div>
            <div className="telemetry-card">
              <span className="telemetry-val">100%</span>
              <span className="telemetry-label">Human Override</span>
              <small>Zero automated life-safety dispatches</small>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars: Role Portals */}
      <section id="roles" className="roles-section">
        <div className="section-head">
          <span className="section-kicker">STAKEHOLDER ARCHITECTURE</span>
          <h2>Three Pillars of Nashik Field Operations</h2>
          <p className="section-desc">
            Each dashboard is tuned for a distinct operational question, from ground execution to district apex coordination.
          </p>
        </div>

        <div className="role-portals-grid">
          {/* Volunteer Portal */}
          <div className="portal-card volunteer-portal">
            <div className="portal-badge">FIELD SEVA</div>
            <div className="portal-icon">🤝</div>
            <span className="portal-kicker">GROUND FORCE</span>
            <h3>The Volunteer</h3>
            <p className="portal-question">Answers: <em>“What do I need to do?”</em></p>
            <ul className="portal-bullets">
              <li>✓ Verified capability & multilingual readiness</li>
              <li>✓ Dynamic shift check-in & safe crowd-aware routes</li>
              <li>✓ Single-tap requests: Sakhi (women support), first aid, bhasha</li>
              <li>✓ Captain handover checklist & verified digital Seva badge</li>
              <li>✓ Consented shift-only privacy without surveillance</li>
            </ul>

            <div className="portal-actions">
              <button
                type="button"
                className="portal-onboard-btn"
                onClick={() => onStartOnboarding('Volunteer')}
              >
                Volunteer Onboarding <span>→</span>
              </button>
              <button
                type="button"
                className="portal-direct-btn"
                onClick={() => onOpenDashboard('Volunteer')}
              >
                View Dashboard
              </button>
            </div>
          </div>

          {/* Zonal Administrator Portal */}
          <div className="portal-card zonal-portal featured">
            <div className="portal-badge popular">SECTOR COMMAND</div>
            <div className="portal-icon">🛡</div>
            <span className="portal-kicker">SECTOR GUARDIAN</span>
            <h3>Zonal Administrator</h3>
            <p className="portal-question">Answers: <em>“Is my zone functioning?”</em></p>
            <ul className="portal-bullets">
              <li>✓ Live post headcount & coverage deficit alarms (&lt;85%)</li>
              <li>✓ Real-time interactive Deployment Board</li>
              <li>✓ Closed-loop Mission Control & escalation handling</li>
              <li>✓ Roster Agent AI recommendations with mandatory coordinator approval</li>
              <li>✓ Standard Operating Procedure (SOP) verified execution</li>
            </ul>

            <div className="portal-actions">
              <button
                type="button"
                className="portal-onboard-btn zonal-btn"
                onClick={() => onStartOnboarding('Zonal administrator')}
              >
                Zonal Lead Onboarding <span>→</span>
              </button>
              <button
                type="button"
                className="portal-direct-btn"
                onClick={() => onOpenDashboard('Zonal administrator')}
              >
                View Dashboard
              </button>
            </div>
          </div>

          {/* Central Administrator Portal */}
          <div className="portal-card central-portal">
            <div className="portal-badge">DISTRICT APEX</div>
            <div className="portal-icon">🏛</div>
            <span className="portal-kicker">APEX COMMAND</span>
            <h3>Central Administrator</h3>
            <p className="portal-question">Answers: <em>“Where does Nashik need intervention?”</em></p>
            <ul className="portal-bullets">
              <li>✓ District-wide visibility across all 14 Nashik sectors</li>
              <li>✓ Dynamic cross-zone capacity rebalancing queue</li>
              <li>✓ Critical shortage alerts & crowd surge mitigation</li>
              <li>✓ AI reinforcement weights & life-safety police veto policy</li>
              <li>✓ Resilient telecom fallbacks (SMS gateway, automated IVR)</li>
            </ul>

            <div className="portal-actions">
              <button
                type="button"
                className="portal-onboard-btn central-btn"
                onClick={() => onStartOnboarding('Central administrator')}
              >
                Central Apex Onboarding <span>→</span>
              </button>
              <button
                type="button"
                className="portal-direct-btn"
                onClick={() => onOpenDashboard('Central administrator')}
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Loop Visualization */}
      <section id="operational-loop" className="loop-section">
        <div className="section-head">
          <span className="section-kicker">CLOSED-LOOP MISSION ORCHESTRATION</span>
          <h2>The Closed Field Operational Loop</h2>
          <p className="section-desc">
            A successful dispatch is not the same as a successful outcome. SevaSetu tracks every task until verified completion.
          </p>
        </div>

        <div className="loop-steps-container">
          <div className="loop-step-card">
            <div className="step-badge">01</div>
            <h4>DEMAND</h4>
            <p>A post gap, lost pilgrim, or medical need is flagged at Ramkund or Tapovan.</p>
            <span className="step-source">Source: Ground Lead or Crowd Telemetry</span>
          </div>

          <div className="loop-arrow">→</div>

          <div className="loop-step-card">
            <div className="step-badge">02</div>
            <h4>MATCH</h4>
            <p>AI ranks candidates by Language, Sakhi skill, safe route reachability, and fatigue.</p>
            <span className="step-source">AI Multi-Factor Ranking</span>
          </div>

          <div className="loop-arrow">→</div>

          <div className="loop-step-card">
            <div className="step-badge highlight">03</div>
            <h4>DISPATCH</h4>
            <p>Authorized human coordinator reviews match and gives explicit click approval.</p>
            <span className="step-source human">Human Coordinator Control</span>
          </div>

          <div className="loop-arrow">→</div>

          <div className="loop-step-card">
            <div className="step-badge">04</div>
            <h4>SUPPORT</h4>
            <p>Volunteers request bhasha, first-aid, or Sakhi assistance while en route.</p>
            <span className="step-source">Field Reinforcement</span>
          </div>

          <div className="loop-arrow">→</div>

          <div className="loop-step-card">
            <div className="step-badge">05</div>
            <h4>RESOLVE</h4>
            <p>Step-by-step captain checklist verified. Escalate to Police if life-safety issue.</p>
            <span className="step-source">Verified Handover</span>
          </div>

          <div className="loop-arrow">→</div>

          <div className="loop-step-card">
            <div className="step-badge">06</div>
            <h4>LEARN</h4>
            <p>Post-shift operational analytics inform next day's district staging plans.</p>
            <span className="step-source">Continuous Improvement</span>
          </div>
        </div>
      </section>

      {/* Safety & Field Guardrails */}
      <section id="guardrails" className="guardrails-section">
        <div className="section-head">
          <span className="section-kicker">SAFETY & PRIVACY BOUNDARIES</span>
          <h2>Ethical Guardrails Built for the Field</h2>
          <p className="section-desc">
            Simhastha requires reverence, dignity, and absolute human accountability.
          </p>
        </div>

        <div className="guardrails-grid">
          <div className="guardrail-card">
            <span className="guardrail-icon">🛑</span>
            <h4>Human Override Is Absolute</h4>
            <p>
              AI estimates reachability and recommends matches, but authorized human coordinators retain absolute authority
              over sensitive dispatches and deployments.
            </p>
          </div>

          <div className="guardrail-card">
            <span className="guardrail-icon">🔒</span>
            <h4>Consented, Shift-Only Privacy</h4>
            <p>
              Volunteer location sharing is active <em>only</em> during checked-in shift windows. Zero 24/7 background tracking.
              No unnecessary photography of vulnerable pilgrims.
            </p>
          </div>

          <div className="guardrail-card">
            <span className="guardrail-icon">🧭</span>
            <h4>Crowd-Aware Safe Routing</h4>
            <p>
              Volunteers are never routed by Euclidean straight-line distance. The routing engine considers barricades,
              one-way pedestrian river corridors, and bottleneck density.
            </p>
          </div>

          <div className="guardrail-card">
            <span className="guardrail-icon">📻</span>
            <h4>Police & Health Primacy</h4>
            <p>
              Police and 108 Emergency Medical channels maintain direct primacy for all life-safety incidents. SevaSetu
              bridges volunteers as civic support, never replacing command law.
            </p>
          </div>
        </div>
      </section>

      {/* Resilient Telecom & Fallbacks */}
      <section id="telecom" className="telecom-section">
        <div className="telecom-inner">
          <div className="telecom-copy">
            <span className="section-kicker">FIELD REALITIES</span>
            <h3>Engineered for Network Congestion & 2G Fallback</h3>
            <p>
              During Shahi Snan days with 500,000+ pilgrims on the ghats, 4G/5G mobile towers often saturate.
              SevaSetu maintains operations through degraded fallbacks:
            </p>
            <div className="telecom-features">
              <div>
                <strong>NIC SMS Dispatch Gateway</strong>
                <span>Instant dispatch alerts delivered over standard 2G SMS networks.</span>
              </div>
              <div>
                <strong>Automated IVR Voice Trunks</strong>
                <span>Urgent sector rebalance orders spoken in Marathi and Hindi to post leads.</span>
              </div>
              <div>
                <strong>Physical Printable Rosters & SOPs</strong>
                <span>One-click CSV/PDF exports for physical field binders at command posts.</span>
              </div>
            </div>
          </div>

          <div className="telecom-card">
            <div className="telecom-badge-box">
              <span className="radio-icon">📡</span>
              <div>
                <strong>Simhastha Telemetry Gateway</strong>
                <small>Nashik District Command Node 01</small>
              </div>
            </div>
            <div className="telecom-stat-row">
              <span>Primary Link:</span>
              <b className="status-live">● MapLibre GeoJSON Online</b>
            </div>
            <div className="telecom-stat-row">
              <span>SMS Gateway:</span>
              <b className="status-standby">● Active Standby (NIC)</b>
            </div>
            <div className="telecom-stat-row">
              <span>Physical SOPs:</span>
              <b className="status-ready">✓ 14 Sector Binders Staged</b>
            </div>
            <div className="telecom-foot">
              <button
                type="button"
                className="hero-primary-cta"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onOpenDashboard('Zonal administrator')}
              >
                Launch Field System <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-symbol">S</span>
            <div>
              <strong>SEVASETU</strong>
              <small>Simhastha Nashik 2027 · Civic Operations</small>
            </div>
          </div>

          <div className="footer-links">
            <button type="button" onClick={() => onStartOnboarding('Volunteer')}>
              Volunteer Onboarding
            </button>
            <button type="button" onClick={() => onStartOnboarding('Zonal administrator')}>
              Zonal Onboarding
            </button>
            <button type="button" onClick={() => onStartOnboarding('Central administrator')}>
              Central Onboarding
            </button>
            <button type="button" onClick={onOpenSignIn}>
              Coordinator Sign In
            </button>
          </div>

          <div className="footer-cred">
            <span>SevaSetu · Right volunteer. Right place. Right route. Right support. Verified outcome.</span>
            <small>Built with reverence for Simhastha Kumbh Mela 2027 · Nashik, Maharashtra</small>
          </div>
        </div>
      </footer>
    </div>
  )
}
