import { useState } from 'react'
import './App.css'
import NashikMap from './NashikMap'
import { LandingPage } from './components/landing/LandingPage'
import { OnboardingFlow } from './components/onboarding/OnboardingFlow'
import { DigitalCredentialBadge } from './components/onboarding/DigitalCredentialBadge'
import type {
  AppView,
  DashboardRole,
  VolunteerStatus,
  MissionStatus,
  VolunteerProfile,
  ZonalAdminProfile,
  CentralAdminProfile,
} from './types'
import {
  defaultVolunteerProfile,
  defaultZonalProfile,
  defaultCentralProfile,
} from './types'

type Volunteer = {
  name: string
  role: string
  language: string
  post: string
  status: VolunteerStatus
  lastSeen: string
}

const initialVolunteers: Volunteer[] = [
  { name: 'Meera Patil', role: 'First aid lead', language: 'Marathi, Hindi', post: 'Ramkund Gate', status: 'On post', lastSeen: '2 min ago' },
  { name: 'Aarav Kulkarni', role: 'Post lead', language: 'Marathi, Hindi', post: 'Ramkund Gate', status: 'On post', lastSeen: '2 min ago' },
  { name: 'Rohan Jadhav', role: 'Wayfinding', language: 'Marathi, Hindi', post: 'Panchavati North', status: 'En route', lastSeen: '8 min ago' },
  { name: 'Sana Sheikh', role: 'Family support', language: 'Hindi, Urdu', post: 'Panchavati North', status: 'On post', lastSeen: '5 min ago' },
  { name: 'Vivek More', role: 'Parking guide', language: 'Marathi', post: 'Tapovan Transit', status: 'No show', lastSeen: '31 min ago' },
  { name: 'Ananya Deshmukh', role: 'Wayfinding', language: 'Marathi, Hindi', post: 'Tapovan Transit', status: 'On post', lastSeen: '3 min ago' },
]

const initialZones = [
  { name: 'Ramkund Gate', district: 'Panchavati', present: 38, required: 42, tone: 'amber', note: '4 volunteers needed' },
  { name: 'Panchavati North', district: 'Panchavati', present: 28, required: 28, tone: 'green', note: 'Fully covered' },
  { name: 'Tapovan Transit', district: 'Tapovan', present: 17, required: 24, tone: 'red', note: '7 volunteers needed' },
]

const taskItems = [
  { title: 'Restock first-aid kits', owner: 'Meera Patil', post: 'Ramkund Gate', due: 'Due in 18 min', tone: 'amber' },
  { title: 'Guide family group to shuttle', owner: 'Sana Sheikh', post: 'Panchavati North', due: 'In progress', tone: 'green' },
  { title: 'Cover missed 09:00 shift', owner: 'Roster Agent', post: 'Tapovan Transit', due: 'Needs attention', tone: 'red' },
  { title: 'Confirm evening handover', owner: 'Aarav Kulkarni', post: 'Ramkund Gate', due: 'Due at 17:30', tone: 'blue' },
]

const sopItems = [
  { title: 'Missing volunteer response', category: 'Attendance', updated: 'Updated yesterday', icon: '!', steps: ['Check the roster and last-seen time.', 'Call the volunteer once and send the post location.', 'Notify the post lead after 10 minutes without a response.', 'Log the gap and request a replacement in the deployment board.'] },
  { title: 'Family reunification protocol', category: 'Visitor support', updated: 'Updated 3 days ago', icon: '+', steps: ['Move the family to the nearest marked support point.', 'Ask for the missing person’s name, clothing, and last known location.', 'Share the description only with the assigned search team.', 'Keep the reporting family updated every 10 minutes.'] },
  { title: 'Heat and hydration checks', category: 'Welfare', updated: 'Updated 1 week ago', icon: 'o', steps: ['Check water, shade, and rest access at the post.', 'Ask each volunteer about dizziness, headache, or unusual fatigue.', 'Move anyone unwell to shade and call the welfare lead.', 'Record the check before the next shift handover.'] },
  { title: 'Incident escalation matrix', category: 'Safety', updated: 'Updated 2 weeks ago', icon: '>', steps: ['Make the area safe and keep bystanders clear.', 'Call the post lead for routine incidents.', 'Call emergency services first for immediate danger or medical emergencies.', 'Record what happened, who responded, and the handover time.'] },
]

const trainingResources = [
  { title: 'Welcome to Nashik field operations', type: 'Video', duration: '08:42', category: 'Orientation', tone: 'terracotta', detail: 'A calm walkthrough of how remote volunteers plug into the local command structure.', mediaUrl: 'https://loremflickr.com/900/520/nashik,india?lock=21', sourceUrl: 'https://www.youtube.com/results?search_query=Nashik+volunteer+orientation' },
  { title: 'First response: what to do first', type: 'Video', duration: '12:18', category: 'Safety', tone: 'blue', detail: 'The first five minutes of a visitor incident, explained by the field medical team.', mediaUrl: 'https://loremflickr.com/900/520/nashik,india,river?lock=22', sourceUrl: 'https://www.youtube.com/results?search_query=Nashik+first+aid+volunteer+training' },
  { title: 'Post map and visual signals', type: 'Image guide', duration: '6 panels', category: 'Wayfinding', tone: 'sage', detail: 'A quick visual reference for signs, colors, and the hand signals used on deployment.', mediaUrl: 'https://loremflickr.com/900/520/nashik,india,temple?lock=23', sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Nashik' },
  { title: 'Ramkund ghats: arrival reference', type: 'Image guide', duration: '4 panels', category: 'Orientation', tone: 'terracotta', detail: 'Recognize the riverfront, entry points, and the calmest approach for first-time volunteers.', mediaUrl: 'https://loremflickr.com/900/520/nashik,india,ghat?lock=24', sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Ram_Kund' },
  { title: 'Panchavati route landmarks', type: 'Image guide', duration: '5 panels', category: 'Wayfinding', tone: 'blue', detail: 'Landmark cues that help remote volunteers match the map to the street when they arrive.', mediaUrl: 'https://loremflickr.com/900/520/nashik,india,street?lock=25', sourceUrl: 'https://commons.wikimedia.org/wiki/Category:Panchavati' },
]

const bulletins = [
  { id: 'tapovan-gap', tone: 'critical', label: 'COVERAGE ALERT', title: 'Tapovan Transit is below cover', detail: '7 volunteers have not checked in for the 09:00 shift.', action: 'Review roster' },
  { id: 'sakhi-request', tone: 'support', label: 'SUPPORT REQUEST', title: 'Sakhi volunteer requested at Ramkund Gate', detail: 'Mission Captain needs women-specific assistance. Response due in 12 min.', action: 'Open mission' },
  { id: 'route-update', tone: 'route', label: 'ROUTE UPDATE', title: 'Crowd density changed near Panchavati North', detail: 'A safer route is available for the team moving to the north post.', action: 'View map' },
]

type Mission = {
  id: string
  title: string
  type: string
  zone: string
  captain: string
  assignee: string
  status: MissionStatus
  progress: number
  eta: string
  support: string
  steps: string[]
}

const initialMissions: Mission[] = [
  { id: 'family-ramkund', title: 'Reunite family at Ramkund Gate', type: 'Bhasha support', zone: 'Ramkund Gate', captain: 'Sana Sheikh', assignee: 'Meera Patil', status: 'Support requested', progress: 55, eta: '6 min', support: 'Hindi-speaking volunteer requested', steps: ['Confirm the family at the support point', 'Record the last known location', 'Search the approved nearby route', 'Confirm reunion with the requester'] },
  { id: 'tapovan-cover', title: 'Restore Tapovan Transit cover', type: 'Manpower', zone: 'Tapovan Transit', captain: 'Aarav Kulkarni', assignee: 'Rohan Jadhav', status: 'In progress', progress: 35, eta: '11 min', support: '2 additional wayfinding volunteers needed', steps: ['Check in at the transit post', 'Review the current crowd direction', 'Guide arrivals to the open queue', 'Handover to the evening lead'] },
  { id: 'hydration-post', title: 'Hydration check at Panchavati North', type: 'Welfare', zone: 'Panchavati North', captain: 'Meera Patil', assignee: 'Ananya Deshmukh', status: 'Needs acceptance', progress: 0, eta: '9 min', support: 'No support requested', steps: ['Accept the welfare check mission', 'Inspect water and shade access', 'Log any volunteer welfare concern', 'Close with captain confirmation'] },
]

function OperationalView({ view, volunteers, onRoster, onEditVolunteer }: { view: string; volunteers: Volunteer[]; onRoster: () => void; onEditVolunteer: (volunteer: Volunteer) => void }) {
  const [openSop, setOpenSop] = useState<typeof sopItems[number] | null>(null)
  const [completedSops, setCompletedSops] = useState<string[]>([])
  if (view === 'Unused') {
    return <section className="operational-view"><div className="view-heading"><div><p className="section-kicker">PEOPLE DIRECTORY</p><h2>Volunteers</h2><p className="muted">Find people by role, language, post, and current availability.</p></div><button className="approve-button" onClick={onRoster}>Open live roster <span>-&gt;</span></button></div><div className="metric-grid compact-metrics"><article className="metric-card primary"><div className="metric-head"><span>REGISTERED</span><span className="metric-icon">U</span></div><strong>94</strong><p>Across 14 active posts</p></article><article className="metric-card"><div className="metric-head"><span>LANGUAGES</span><span className="metric-icon">=</span></div><strong>6</strong><p>Marathi, Hindi, English and more</p></article><article className="metric-card"><div className="metric-head"><span>FIRST AID</span><span className="metric-icon">+</span></div><strong>12</strong><p>Certified volunteers on duty</p></article><article className="metric-card"><div className="metric-head"><span>AVAILABLE</span><span className="metric-icon">O</span></div><strong>11</strong><p>Ready for reassignment</p></article></div><div className="volunteer-directory">{volunteers.map((volunteer) => <article className="volunteer-card" key={volunteer.name}><span className="directory-avatar">{volunteer.name.split(' ').map((part) => part[0]).join('')}</span><div><strong>{volunteer.name}</strong><small>{volunteer.role} · {volunteer.language}</small></div><div className="directory-meta"><span>{volunteer.post}</span><em className={volunteer.status === 'En route' ? 'en-route' : volunteer.status === 'No show' ? 'no-show' : ''}>{volunteer.status}</em></div></article>)}</div></section>
  }

  if (view === 'Volunteers') {
      return <section className="operational-view"><div className="view-heading"><div><p className="section-kicker">PEOPLE DIRECTORY</p><h2>Volunteers</h2><p className="muted">Find people by role, language, post, and current availability.</p></div><button className="approve-button" onClick={onRoster}>Open deployment board <span>-&gt;</span></button></div><div className="metric-grid compact-metrics"><article className="metric-card primary"><div className="metric-head"><span>REGISTERED</span><span className="metric-icon">U</span></div><strong>94</strong><p>Across 14 active posts</p></article><article className="metric-card"><div className="metric-head"><span>LANGUAGES</span><span className="metric-icon">=</span></div><strong>6</strong><p>Marathi, Hindi, English and more</p></article><article className="metric-card"><div className="metric-head"><span>FIRST AID</span><span className="metric-icon">+</span></div><strong>12</strong><p>Certified volunteers on duty</p></article><article className="metric-card"><div className="metric-head"><span>AVAILABLE</span><span className="metric-icon">O</span></div><strong>11</strong><p>Ready for reassignment</p></article></div><div className="volunteer-directory">{volunteers.map((volunteer) => <article className="volunteer-card" key={volunteer.name}><span className="directory-avatar">{volunteer.name.split(' ').map((part) => part[0]).join('')}</span><div><strong>{volunteer.name}</strong><small>{volunteer.role} · {volunteer.language}</small></div><div className="directory-meta"><span>{volunteer.post}</span><em className={volunteer.status === 'En route' ? 'en-route' : volunteer.status === 'No show' ? 'no-show' : ''}>{volunteer.status}</em></div><button className="edit-button" onClick={() => onEditVolunteer(volunteer)}>Edit</button></article>)}</div></section>
  }

  if (view === 'Deployment board') {
    return <section className="operational-view">
      <div className="view-heading"><div><p className="section-kicker">LIVE COVERAGE</p><h2>Deployment board</h2><p className="muted">Monitor every active post as the field picture changes.</p></div><button className="approve-button" onClick={onRoster}>Open full roster <span>-&gt;</span></button></div>
      <div className="metric-grid compact-metrics"><article className="metric-card primary"><div className="metric-head"><span>ACTIVE NOW</span><span className="metric-icon">O</span></div><strong>83 <small>/ 94</small></strong><p><b>88%</b> coverage across 14 posts</p></article><article className="metric-card"><div className="metric-head"><span>ON POST</span><span className="metric-icon">+</span></div><strong>76</strong><p><span className="dot green"></span> Checked in and verified</p></article><article className="metric-card"><div className="metric-head"><span>EN ROUTE</span><span className="metric-icon">&gt;</span></div><strong>7</strong><p><span className="dot amber"></span> Moving to an assignment</p></article><article className="metric-card"><div className="metric-head"><span>NO SHOW</span><span className="metric-icon">!</span></div><strong>7</strong><p><span className="dot red"></span> Replacement needed</p></article></div>
      <div className="table-panel"><div className="panel-heading"><div><p className="section-kicker">ASSIGNMENTS</p><h2>Current deployment</h2></div><button className="outline-button">Filter: All posts <span>v</span></button></div><div className="table-wrap"><table><thead><tr><th>Volunteer</th><th>Role</th><th>Post</th><th>Status</th><th>Last seen</th><th>Action</th></tr></thead><tbody>{volunteers.map((volunteer) => <tr key={volunteer.name}><td><strong>{volunteer.name}</strong><small>{volunteer.language}</small></td><td>{volunteer.role}</td><td>{volunteer.post}</td><td><span className={`table-status ${volunteer.status.toLowerCase().replace(' ', '-')}`}>{volunteer.status}</span></td><td>{volunteer.lastSeen}</td><td><button className="edit-button" onClick={() => onEditVolunteer(volunteer)}>Assign / edit</button></td></tr>)}</tbody></table></div></div>
    </section>
  }

  if (view === 'Tasks') return <section className="operational-view"><div className="view-heading"><div><p className="section-kicker">FIELD WORK QUEUE</p><h2>Tasks</h2><p className="muted">Keep small actions moving before they become coverage gaps.</p></div><button className="approve-button">Create task <span>+</span></button></div><div className="task-list">{taskItems.map((task) => <article className="task-row" key={task.title}><span className={`task-marker ${task.tone}`}></span><div className="task-copy"><strong>{task.title}</strong><p>{task.post} · {task.owner}</p></div><span className={`task-due ${task.tone}`}>{task.due}</span><button className="more-button" aria-label={`More options for ${task.title}`}>...</button></article>)}</div></section>

  return <section className="operational-view"><div className="view-heading"><div><p className="section-kicker">FIELD PLAYBOOK</p><h2>SOP library</h2><p className="muted">Quick, trusted guidance for the moments volunteers need it most.</p></div><span className="pending-tag">{completedSops.length} of {sopItems.length} reviewed</span></div><div className="sop-grid">{sopItems.map((item) => <article className={`sop-card ${completedSops.includes(item.title) ? 'sop-complete' : ''}`} key={item.title}><span className="sop-icon">{completedSops.includes(item.title) ? 'ok' : item.icon}</span><div><span className="zone-code">{item.category.toUpperCase()}</span><h3>{item.title}</h3><p>{completedSops.includes(item.title) ? 'Reviewed for this shift' : item.updated}</p><button className="activity-link" onClick={() => setOpenSop(item)}>{completedSops.includes(item.title) ? 'Review procedure' : 'Read procedure'} <span>-&gt;</span></button></div></article>)}</div>{openSop && <div className="modal-backdrop" role="presentation" onClick={() => setOpenSop(null)}><section className="modal sop-modal" role="dialog" aria-modal="true" aria-labelledby="sop-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="section-kicker">{openSop.category.toUpperCase()} · FIELD PROCEDURE</p><h2 id="sop-title">{openSop.title}</h2><p className="muted">Use these steps as the live handover checklist.</p></div><button className="close-alert" onClick={() => setOpenSop(null)} aria-label="Close procedure">x</button></div><ol className="sop-steps">{openSop.steps.map((step) => <li key={step}>{step}</li>)}</ol><div className="modal-footer"><span>Last reviewed by the field team · {openSop.updated.replace('Updated ', '')}</span><button className="approve-button" onClick={() => { setCompletedSops((current) => current.includes(openSop.title) ? current : [...current, openSop.title]); setOpenSop(null) }}>Mark as reviewed <span>ok</span></button></div></section></div>}</section>
}

function MissionsView() {
  const [missions, setMissions] = useState(initialMissions)
  const [selectedId, setSelectedId] = useState(initialMissions[0].id)
  const [reinforcementApproved, setReinforcementApproved] = useState(false)
  const selectedMission = missions.find((mission) => mission.id === selectedId) ?? missions[0]
  const updateMission = (status: MissionStatus, progress = selectedMission.progress) => setMissions((current) => current.map((mission) => mission.id === selectedMission.id ? { ...mission, status, progress } : mission))

  return <section className="operational-view missions-view">
    <div className="view-heading"><div><p className="section-kicker">CLOSED-LOOP OPERATIONS</p><h2>Mission control</h2><p className="muted">Keep every assignment visible until it is resolved or escalated.</p></div><span className="pending-tag">{missions.filter((mission) => !['Resolved', 'Escalated'].includes(mission.status)).length} active missions</span></div>
    <div className="mission-metrics"><article><span className="section-kicker">OPEN</span><strong>{missions.filter((mission) => !['Resolved', 'Escalated'].includes(mission.status)).length}</strong><small>needs live attention</small></article><article><span className="section-kicker">SUPPORT REQUESTS</span><strong>{missions.filter((mission) => mission.status === 'Support requested').length}</strong><small>awaiting reinforcement</small></article><article><span className="section-kicker">RESOLVED TODAY</span><strong>{missions.filter((mission) => mission.status === 'Resolved').length}</strong><small>confirmed outcomes</small></article></div>
    <div className="mission-layout"><div className="mission-list">{missions.map((mission) => <button className={mission.id === selectedId ? 'mission-list-item active' : 'mission-list-item'} key={mission.id} onClick={() => { setSelectedId(mission.id); setReinforcementApproved(false) }}><span className={`mission-status-dot ${mission.status.toLowerCase().replaceAll(' ', '-')}`}></span><span><strong>{mission.title}</strong><small>{mission.zone} · {mission.type}</small></span><em>{mission.status}</em></button>)}</div><article className="mission-detail"><div className="mission-detail-head"><div><span className="zone-code">{selectedMission.type.toUpperCase()} · {selectedMission.zone.toUpperCase()}</span><h3>{selectedMission.title}</h3><p>Captain <strong>{selectedMission.captain}</strong> · Assigned to <strong>{selectedMission.assignee}</strong></p></div><span className={`mission-pill ${selectedMission.status.toLowerCase().replaceAll(' ', '-')}`}>{selectedMission.status}</span></div><div className="mission-progress-label"><span>Mission progress</span><b>{selectedMission.progress}%</b></div><div className="progress mission-progress"><span style={{ width: `${selectedMission.progress}%` }}></span></div><div className="mission-columns"><div><span className="section-kicker">CAPTAIN CHECKLIST</span><ol className="mission-steps">{selectedMission.steps.map((step, index) => <li className={index < Math.floor(selectedMission.progress / 25) ? 'done' : ''} key={step}><span>{index < Math.floor(selectedMission.progress / 25) ? 'ok' : index + 1}</span>{step}</li>)}</ol></div><div className="mission-support"><span className="section-kicker">NEED SUPPORT</span><strong>{selectedMission.support}</strong><p>Fastest suitable reinforcement is ranked using capability, language, workload, zone coverage, and safe ETA.</p><div className="reinforcement-row"><span className="directory-avatar">VK</span><div><strong>Vivek More</strong><small>Marathi · wayfinding · 8 min ETA</small></div><b>{reinforcementApproved ? 'Approved' : '92% match'}</b></div><button className={reinforcementApproved ? 'ghost-button' : 'approve-button'} onClick={() => setReinforcementApproved(true)}>{reinforcementApproved ? 'Reinforcement approved' : 'Approve reinforcement'} <span>{reinforcementApproved ? 'ok' : '-&gt;'}</span></button></div></div><div className="mission-actions"><span>Safely reachable route · ETA {selectedMission.eta}</span><div><button className="ghost-button" onClick={() => updateMission('Escalated')}>Escalate</button>{selectedMission.status === 'Needs acceptance' ? <button className="approve-button" onClick={() => updateMission('In progress', 15)}>Accept mission <span>-&gt;</span></button> : <button className="approve-button" onClick={() => updateMission('Resolved', 100)}>{selectedMission.status === 'Resolved' ? 'Resolved' : 'Mark resolved'} <span>ok</span></button>}</div></div></article></div>
  </section>
}

function VolunteerDashboard({ profile }: { profile: VolunteerProfile }) {
  const [missionState, setMissionState] = useState<'Assigned' | 'Accepted' | 'Checked in' | 'Completed'>('Assigned')
  const [supportRequested, setSupportRequested] = useState(false)
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const nextAction = missionState === 'Assigned' ? 'Accept mission' : missionState === 'Accepted' ? 'Check in for shift' : missionState === 'Checked in' ? 'Complete mission' : 'Mission completed'
  const advanceMission = () => setMissionState((current) => current === 'Assigned' ? 'Accepted' : current === 'Accepted' ? 'Checked in' : current === 'Checked in' ? 'Completed' : current)

  const firstName = profile.name.split(' ')[0]

  return (
    <section className="operational-view role-dashboard">
      <div className="view-heading">
        <div>
          <p className="section-kicker">VOLUNTEER DASHBOARD · {profile.preferredPost.toUpperCase()}</p>
          <h2>Good morning, {firstName}</h2>
          <p className="muted">Your next shift, assigned post, route, and verified Seva badge are all in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="button" className="outline-button" onClick={() => setShowBadgeModal(true)}>
            💳 View My Seva Pass
          </button>
          <span className="pending-tag">{missionState}</span>
        </div>
      </div>

      <div className="role-grid">
        <article className="role-card role-primary">
          <span className="section-kicker">NEXT LIVE MISSION</span>
          <h3>Reunite family at {profile.preferredPost}</h3>
          <p>Assigned by Sana Sheikh · Priority: {profile.skills[0] || 'Wayfinding'}</p>
          <div className="role-meta">
            <span>{profile.preferredPost}</span>
            <span>ETA 6 min</span>
          </div>
          <button className={missionState === 'Completed' ? 'ghost-button' : 'approve-button'} onClick={advanceMission}>
            {nextAction} <span>{missionState === 'Completed' ? 'ok' : '->'}</span>
          </button>
        </article>

        <article className="role-card">
          <span className="section-kicker">ASSIGNED SHIFT</span>
          <strong className="role-number" style={{ fontSize: '18px' }}>{profile.preferredShift}</strong>
          <p>{profile.preferredPost} · Languages: {profile.languages.slice(0, 2).join(', ')}</p>
          <div className="role-checklist">
            <span className={missionState !== 'Assigned' ? 'done' : ''}>ok</span> Training ready
          </div>
          <div className="role-checklist">
            <span className={missionState === 'Checked in' || missionState === 'Completed' ? 'done' : ''}>ok</span> Shift check-in
          </div>
        </article>

        <article className="role-card">
          <span className="section-kicker">FIELD REINFORCEMENT</span>
          <h3>Need help in the field?</h3>
          <p>Request manpower, Sakhi women escort, bhasha translation, or first aid dispatch.</p>
          <button className={supportRequested ? 'ghost-button' : 'outline-button'} onClick={() => setSupportRequested(true)}>
            {supportRequested ? 'Support request broadcasted' : 'Request support'} <span>{supportRequested ? 'ok' : '+'}</span>
          </button>
        </article>
      </div>

      <div className="role-section">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">READINESS & CAPABILITIES</p>
            <h2>Verified volunteer status</h2>
          </div>
          <button className="activity-link" onClick={() => setShowBadgeModal(true)}>
            Open digital badge <span>-&gt;</span>
          </button>
        </div>
        <div className="readiness-row">
          <div>
            <strong>Pass ID: {profile.badgeId} · {profile.skills.join(' · ')}</strong>
            <p>Consented shift-only location active · Emergency Contact: {profile.emergencyContact}</p>
          </div>
          <div className="progress"><span style={{ width: '85%' }}></span></div>
          <b>85% Ready</b>
        </div>
      </div>

      {showBadgeModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowBadgeModal(false)}>
          <section className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '640px', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div>
                <p className="section-kicker">OFFICIAL CREDENTIAL</p>
                <h2>Verified Volunteer Seva Pass</h2>
              </div>
              <button className="close-alert" onClick={() => setShowBadgeModal(false)} aria-label="Close pass">✕</button>
            </div>
            <DigitalCredentialBadge
              role="Volunteer"
              name={profile.name}
              badgeId={profile.badgeId}
              title="Registered Seva Volunteer"
              subtext={`Assigned: ${profile.preferredPost} · ${profile.city}`}
              metaItems={[
                { label: 'ASSIGNED POST', value: profile.preferredPost },
                { label: 'SHIFT', value: profile.preferredShift.split(' ')[0] },
                { label: 'LANGUAGES', value: profile.languages.join(', ') },
                { label: 'CONTACT', value: profile.phone },
              ]}
              tags={profile.skills}
              onProceed={() => setShowBadgeModal(false)}
              proceedText="Return to Tasks"
            />
          </section>
        </div>
      )}
    </section>
  )
}

function CentralDashboard({ profile }: { profile: CentralAdminProfile }) {
  const [approved, setApproved] = useState(false)
  return (
    <section className="operational-view role-dashboard">
      <div className="view-heading">
        <div>
          <p className="section-kicker">APEX COMMAND · {profile.agency.toUpperCase()}</p>
          <h2>Where does Nashik need intervention?</h2>
          <p className="muted">Command Director: <strong>{profile.name}</strong> · Clearance: <strong>{profile.clearanceCode}</strong></p>
        </div>
        <span className="pending-tag">Live district grid · {profile.totalMonitoredZones} Sectors</span>
      </div>
      <div className="central-metrics">
        <article><span className="section-kicker">ACTIVE SECTORS</span><strong>{profile.totalMonitoredZones}</strong><small>10 covered · 4 need attention</small></article>
        <article><span className="section-kicker">UNRESOLVED MISSIONS</span><strong>18</strong><small>3 escalated in the last hour</small></article>
        <article><span className="section-kicker">REINFORCEMENT DEMAND</span><strong>7</strong><small>highest at Tapovan Transit</small></article>
        <article><span className="section-kicker">RESOLUTION RATE</span><strong>88%</strong><small className="trend up">up 6% vs yesterday</small></article>
      </div>
      <div className="central-grid">
        <article className="table-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">INTERVENTION QUEUE</p>
              <h2>Sectors needing action</h2>
            </div>
            <span className="pending-tag">4 alerts</span>
          </div>
          <div className="central-zone">
            <span className="zone-alert red"></span>
            <div><strong>Tapovan Transit</strong><small>7 volunteers short · 3 support requests</small></div>
            <b>Critical</b>
            <button className="text-button">Rebalance <span>-&gt;</span></button>
          </div>
          <div className="central-zone">
            <span className="zone-alert amber"></span>
            <div><strong>Ramkund Gate</strong><small>4 volunteers short · language support needed</small></div>
            <b>Needs cover</b>
            <button className="text-button">Review <span>-&gt;</span></button>
          </div>
          <div className="central-zone">
            <span className="zone-alert blue"></span>
            <div><strong>Panchavati North</strong><small>Fully covered · crowd density rising</small></div>
            <b>Monitor</b>
            <button className="text-button">Open map <span>-&gt;</span></button>
          </div>
          <button className={approved ? 'ghost-button' : 'approve-button'} onClick={() => setApproved(true)}>
            {approved ? 'District rebalance order approved' : 'Approve district plan'} <span>{approved ? 'ok' : '->'}</span>
          </button>
        </article>

        <article className="table-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">AI POLICY & OPERATIONAL LEARNING</p>
              <h2>Algorithmic guardrails</h2>
            </div>
          </div>
          <div className="central-stat">
            <span>Matching policy weights</span>
            <strong>{profile.matchingWeights.languageMatch}% Lang / {profile.matchingWeights.skillMatch}% Skill / {profile.matchingWeights.safeEta}% Safe ETA</strong>
            <small>Guarantees safe reachable dispatch over straight-line distance</small>
          </div>
          <div className="central-stat">
            <span>Human-in-the-loop veto</span>
            <strong>{profile.mandatoryHumanApproval ? 'Active (Strict)' : 'Bypassed'}</strong>
            <small>Zero dispatches occur without authorized coordinator approval</small>
          </div>
          <div className="central-stat">
            <span>Degraded telecom fallbacks</span>
            <strong>{profile.telecomFallbacks.smsGateway ? 'SMS Standby' : 'Disabled'} · {profile.telecomFallbacks.ivrDispatch ? 'IVR Active' : 'Off'}</strong>
            <small>Ensures continuity during peak 4G/5G mobile tower saturation</small>
          </div>
          <div className="central-stat">
            <span>Mission resolution time</span>
            <strong>14 min</strong>
            <small>down 3 min from yesterday</small>
          </div>
        </article>
      </div>
    </section>
  )
}

function SignInView({
  onSignIn,
  onReturnToLanding,
  onGoToOnboarding,
}: {
  onSignIn: (role?: DashboardRole) => void
  onReturnToLanding: () => void
  onGoToOnboarding: (role: DashboardRole) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const demoEmail = 'devv@sevasetu.in'
  const demoPassword = 'sevasetu123'

  const handleSubmit = () => {
    if (email.trim().toLowerCase() !== demoEmail || password !== demoPassword) {
      setError('Use the demo credentials shown below, or click a Quick Demo role.')
      return
    }
    onSignIn('Zonal administrator')
  }

  return (
    <main className="signin-page">
      <div className="signin-art" aria-hidden="true">
        <span className="art-sun"></span>
        <span className="art-figure figure-left">✦</span>
        <span className="art-figure figure-center">◉</span>
        <span className="art-figure figure-right">✧</span>
        <span className="art-wave wave-one"></span>
        <span className="art-wave wave-two"></span>
      </div>

      <section className="signin-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <button
            type="button"
            className="text-button"
            style={{ margin: 0, color: '#7c281b', fontSize: '11px', fontWeight: 600 }}
            onClick={onReturnToLanding}
          >
            ← Back to Home
          </button>
          <span style={{ fontSize: '9px', fontWeight: 800, color: '#a16551', letterSpacing: '0.8px' }}>SIMHASTHA 2027</span>
        </div>

        <div className="signin-brand">
          <span className="signin-mark">S</span>
          <div>
            <strong>SEVASETU</strong>
            <small>Volunteer operations</small>
          </div>
        </div>

        <div className="signin-copy">
          <span className="section-kicker">SIMHASTHA 2027 · NASHIK</span>
          <h1>Serve with purpose.</h1>
          <p>Sign in to prepare, deploy, and support volunteers across the field.</p>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); handleSubmit() }}>
          <label className="field-label">
            Email address
            <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError('') }} placeholder="devv@sevasetu.in" required />
          </label>
          <label className="field-label">
            Password
            <input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError('') }} placeholder="sevasetu123" required />
          </label>
          <div className="signin-options">
            <label><input type="checkbox" defaultChecked /> Keep me signed in</label>
            <button type="button" className="text-button">Forgot password?</button>
          </div>
          {error && <p className="signin-error" role="alert">{error}</p>}
          <button className="signin-submit" type="submit">Sign in <span>-&gt;</span></button>
        </form>

        <div className="demo-credentials">
          <strong>Demo credentials</strong>
          <span>Email: {demoEmail}</span>
          <span>Password: {demoPassword}</span>
        </div>

        {/* Quick Demo Shortcuts */}
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e7c6ad' }}>
          <span style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: '#704b3d', letterSpacing: '0.8px', marginBottom: '8px' }}>
            QUICK DEMO PREVIEWS:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ghost-button"
              style={{ fontSize: '10px', background: '#f6e4d6', color: '#7c281b', padding: '6px 10px' }}
              onClick={() => onSignIn('Volunteer')}
            >
              Volunteer
            </button>
            <button
              type="button"
              className="ghost-button"
              style={{ fontSize: '10px', background: '#f6e4d6', color: '#7c281b', padding: '6px 10px' }}
              onClick={() => onSignIn('Zonal administrator')}
            >
              Zonal Admin
            </button>
            <button
              type="button"
              className="ghost-button"
              style={{ fontSize: '10px', background: '#f6e4d6', color: '#7c281b', padding: '6px 10px' }}
              onClick={() => onSignIn('Central administrator')}
            >
              Central Apex
            </button>
          </div>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', color: '#875d4e' }}>Need a new badge? </span>
          <button
            type="button"
            className="text-button"
            style={{ fontSize: '10px', color: '#b9482f', textDecoration: 'underline' }}
            onClick={() => onGoToOnboarding('Volunteer')}
          >
            Start Onboarding Flow →
          </button>
        </div>
      </section>
    </main>
  )
}

function TrainingView() {
  const [filter, setFilter] = useState('All resources')
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const filters = ['All resources', 'Videos', 'Image guides']
  const visibleResources = trainingResources.filter((resource) => filter === 'All resources' || (filter === 'Videos' ? resource.type === 'Video' : resource.type === 'Image guide'))

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setUploadedFiles((current) => [...current, ...files.map((file) => file.name)])
    event.target.value = ''
  }

  return <section className="operational-view training-view">
    <div className="view-heading"><div><p className="section-kicker">REMOTE VOLUNTEER ACADEMY</p><h2>Training hub</h2><p className="muted">Help volunteers feel ready before they arrive in the field.</p></div><label className="approve-button upload-button">Add training media <span>+</span><input type="file" accept="video/*,image/*" multiple onChange={handleUpload} /></label></div>
    <div className="training-hero"><div><span className="section-kicker">START HERE</span><h3>Learn the local picture from anywhere.</h3><p>Short, practical lessons for volunteers joining from outside Nashik. Watch a briefing, scan a visual guide, and arrive with the basics already covered.</p><div className="training-progress"><span style={{ width: '62%' }}></span></div><small>2 of 5 core lessons completed · 38 min remaining</small></div><div className="training-hero-art"><span className="play-mark">▶</span><span>FIELD BRIEFING</span></div></div>
    <div className="training-toolbar"><div><strong>Training library</strong><span>Curated by the field team</span></div><div className="training-filters">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
    <div className="training-grid">{visibleResources.map((resource) => <article className="training-card" key={resource.title}><a className={`training-thumb ${resource.tone}`} href={resource.sourceUrl} target="_blank" rel="noreferrer" style={{ backgroundImage: `linear-gradient(rgba(50, 35, 30, .2), rgba(50, 35, 30, .38)), url(${resource.mediaUrl})` }} aria-label={`Open ${resource.title}`}><span>{resource.type === 'Video' ? '▶' : '▧'}</span><small>{resource.duration}</small></a><div className="training-card-copy"><div><span className="zone-code">{resource.category.toUpperCase()}</span><span className="resource-type">{resource.type}</span></div><h3>{resource.title}</h3><p>{resource.detail}</p><a className="activity-link" href={resource.sourceUrl} target="_blank" rel="noreferrer">{resource.type === 'Video' ? 'Watch Nashik reference' : 'Open Nashik image guide'} <span>-&gt;</span></a></div></article>)}</div>
    {uploadedFiles.length > 0 && <div className="upload-confirmation"><strong>Added to your draft library</strong><span>{uploadedFiles.join(', ')}</span></div>}
  </section>
}

function ReportsView() {
  const downloadReport = () => {
    const rows = [['Zone', 'Present', 'Required', 'Coverage'], ...initialZones.map((zone) => [zone.name, String(zone.present), String(zone.required), `${Math.round((zone.present / zone.required) * 100)}%`])]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'sevasetu-coverage-report.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <section className="operational-view"><div className="view-heading"><div><p className="section-kicker">PERFORMANCE SNAPSHOT</p><h2>Reports</h2><p className="muted">Review coverage trends and download the current field picture.</p></div><button className="approve-button" onClick={downloadReport}>Download CSV <span>-&gt;</span></button></div><div className="report-grid"><article className="report-card report-highlight"><span className="section-kicker">TODAY'S COVERAGE</span><strong>88%</strong><p>83 of 94 volunteers checked in across 14 active posts.</p><div className="progress"><span style={{ width: '88%' }}></span></div><small className="trend up">up 6% vs yesterday</small></article><article className="report-card"><span className="section-kicker">WELFARE CHECKS</span><strong>96%</strong><p>140 checks completed with 6 still pending for the evening shift.</p><div className="report-stat"><span>Completed</span><b>140</b></div></article><article className="report-card"><span className="section-kicker">TASK COMPLETION</span><strong>74%</strong><p>18 open tasks remain in the current deployment window.</p><div className="report-stat"><span>Completed today</span><b>51</b></div></article></div><div className="table-panel report-table"><div className="panel-heading"><div><p className="section-kicker">ZONE BREAKDOWN</p><h2>Coverage by post</h2></div><span className="pending-tag">Updated 2 min ago</span></div><div className="table-wrap"><table><thead><tr><th>Zone</th><th>Present</th><th>Required</th><th>Coverage</th><th>Signal</th></tr></thead><tbody>{initialZones.map((zone) => <tr key={zone.name}><td><strong>{zone.name}</strong><small>{zone.district}</small></td><td>{zone.present}</td><td>{zone.required}</td><td>{Math.round((zone.present / zone.required) * 100)}%</td><td><span className={`table-status ${zone.tone === 'green' ? 'on-post' : zone.tone === 'amber' ? 'en-route' : 'no-show'}`}>{zone.tone === 'green' ? 'Covered' : zone.tone === 'amber' ? 'Needs cover' : 'Critical gap'}</span></td></tr>)}</tbody></table></div></div></section>
}

function SettingsView() {
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [autoRoster, setAutoRoster] = useState(true)

  return <section className="operational-view"><div className="view-heading"><div><p className="section-kicker">WORKSPACE PREFERENCES</p><h2>Settings</h2><p className="muted">Tune how SevaSetu keeps you informed during a live deployment.</p></div><button className={saved ? 'approve-button approved' : 'approve-button'} onClick={() => setSaved(true)}>{saved ? 'Changes saved' : 'Save changes'} <span>{saved ? 'ok' : '-&gt;'}</span></button></div><div className="settings-grid"><article className="settings-card"><div><span className="section-kicker">NOTIFICATIONS</span><h3>Stay ahead of field changes</h3><p>Choose which operational updates reach your coordinator account.</p></div><label className="setting-row"><span><strong>Coverage alerts</strong><small>Notify me when a post falls below required cover.</small></span><input type="checkbox" checked={notifications} onChange={(event) => { setNotifications(event.target.checked); setSaved(false) }} /><i></i></label><label className="setting-row"><span><strong>Roster suggestions</strong><small>Show replacement recommendations from Roster Agent.</small></span><input type="checkbox" checked={autoRoster} onChange={(event) => { setAutoRoster(event.target.checked); setSaved(false) }} /><i></i></label></article><article className="settings-card"><span className="section-kicker">DEPLOYMENT</span><h3>Active event</h3><p>These details appear in the workspace and exported reports.</p><label className="field-label">Event name<input value="Simhastha 2027" readOnly /></label><label className="field-label">Operating district<input value="Nashik district" readOnly /></label><label className="field-label">Default shift<select defaultValue="Morning · 09:00"><option>Morning · 09:00</option><option>Afternoon · 14:00</option><option>Evening · 17:30</option></select></label></article></div></section>
}

function VolunteerEditor({ volunteer, onClose, onSave }: { volunteer: Volunteer; onClose: () => void; onSave: (volunteer: Volunteer) => void }) {
  const [draft, setDraft] = useState(volunteer)

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="modal editor-modal" role="dialog" aria-modal="true" aria-labelledby="edit-volunteer-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="section-kicker">VOLUNTEER PROFILE</p><h2 id="edit-volunteer-title">Assign volunteer</h2><p className="muted">Update the live deployment record for {volunteer.name}.</p></div><button className="close-alert" onClick={onClose} aria-label="Close editor">x</button></div><div className="editor-grid"><label className="field-label">Role<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label><label className="field-label">Languages<input value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value })} /></label><label className="field-label">Assigned post<select value={draft.post} onChange={(event) => setDraft({ ...draft, post: event.target.value })}><option>Ramkund Gate</option><option>Panchavati North</option><option>Tapovan Transit</option></select></label><label className="field-label">Mission status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as VolunteerStatus })}><option>On post</option><option>En route</option><option>No show</option></select></label></div><div className="modal-footer"><span>Assignment changes stay under coordinator control.</span><button className="approve-button" onClick={() => { onSave(draft); onClose() }}>Save assignment <span>-&gt;</span></button></div></section></div>
}

function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing')
  const [activeOnboardingRole, setActiveOnboardingRole] = useState<DashboardRole>('Volunteer')
  const [activeView, setActiveView] = useState('Overview')
  const [dashboardRole, setDashboardRole] = useState<DashboardRole>('Zonal administrator')

  // User profiles created from onboarding or defaults
  const [volunteerProfile, setVolunteerProfile] = useState<VolunteerProfile>(defaultVolunteerProfile)
  const [zonalProfile, setZonalProfile] = useState<ZonalAdminProfile>(defaultZonalProfile)
  const [centralProfile, setCentralProfile] = useState<CentralAdminProfile>(defaultCentralProfile)

  const [volunteerList, setVolunteerList] = useState<Volunteer[]>(initialVolunteers)
  const [showRoster, setShowRoster] = useState(false)
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null)
  const [dismissedBulletins, setDismissedBulletins] = useState<string[]>([])
  const [rosterApproved, setRosterApproved] = useState(false)

  const navItems = ['Overview', 'Nashik map', 'Mission control', 'Deployment board', 'Volunteers', 'Tasks', 'SOP library', 'Training hub']

  // Handle onboarding completions
  const handleCompleteVolunteer = (newProfile: VolunteerProfile) => {
    setVolunteerProfile(newProfile)
    setVolunteerList((prev) => {
      const exists = prev.some((v) => v.name.toLowerCase() === newProfile.name.toLowerCase())
      if (exists) return prev
      return [
        {
          name: newProfile.name,
          role: newProfile.skills[0] || 'Seva Volunteer',
          language: newProfile.languages.slice(0, 2).join(', '),
          post: newProfile.preferredPost,
          status: 'On post',
          lastSeen: 'Just now',
        },
        ...prev,
      ]
    })
    setDashboardRole('Volunteer')
    setCurrentView('dashboard')
    setActiveView('Overview')
  }

  const handleCompleteZonal = (newProfile: ZonalAdminProfile) => {
    setZonalProfile(newProfile)
    setDashboardRole('Zonal administrator')
    setCurrentView('dashboard')
    setActiveView('Overview')
  }

  const handleCompleteCentral = (newProfile: CentralAdminProfile) => {
    setCentralProfile(newProfile)
    setDashboardRole('Central administrator')
    setCurrentView('dashboard')
    setActiveView('Overview')
  }

  // Routing View 1: Landing Page
  if (currentView === 'landing') {
    return (
      <LandingPage
        onStartOnboarding={(role) => {
          setActiveOnboardingRole(role)
          setCurrentView('onboarding')
        }}
        onOpenDashboard={(role) => {
          setDashboardRole(role)
          setCurrentView('dashboard')
        }}
        onOpenSignIn={() => setCurrentView('signin')}
      />
    )
  }

  // Routing View 2: Onboarding Flow
  if (currentView === 'onboarding') {
    return (
      <OnboardingFlow
        initialRole={activeOnboardingRole}
        volunteerProfile={volunteerProfile}
        zonalProfile={zonalProfile}
        centralProfile={centralProfile}
        onCompleteVolunteer={handleCompleteVolunteer}
        onCompleteZonal={handleCompleteZonal}
        onCompleteCentral={handleCompleteCentral}
        onExit={() => setCurrentView('landing')}
      />
    )
  }

  // Routing View 3: Sign In
  if (currentView === 'signin') {
    return (
      <SignInView
        onSignIn={(role) => {
          if (role) setDashboardRole(role)
          setCurrentView('dashboard')
        }}
        onReturnToLanding={() => setCurrentView('landing')}
        onGoToOnboarding={(role) => {
          setActiveOnboardingRole(role)
          setCurrentView('onboarding')
        }}
      />
    )
  }

  // Routing View 4: Dashboard Shell
  const currentUserName =
    dashboardRole === 'Volunteer'
      ? volunteerProfile.name
      : dashboardRole === 'Central administrator'
      ? centralProfile.name
      : zonalProfile.name

  const currentUserTitle =
    dashboardRole === 'Volunteer'
      ? `${volunteerProfile.skills[0] || 'Volunteer'} · ${volunteerProfile.preferredPost}`
      : dashboardRole === 'Central administrator'
      ? centralProfile.designation
      : `${zonalProfile.designation} · ${zonalProfile.assignedZone}`

  const currentUserAvatar = currentUserName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div
          className="brand-lockup"
          onClick={() => setCurrentView('landing')}
          style={{ cursor: 'pointer' }}
          title="Return to Landing Page"
        >
          <div className="brand-mark">S</div>
          <div>
            <strong>SEVASETU</strong>
            <span>Volunteer operations</span>
          </div>
        </div>

        <div className="event-switcher">
          <span>ACTIVE DEPLOYMENT</span>
          <strong>Simhastha 2027</strong>
          <small>Nashik district</small>
          <b>v</b>
        </div>

        <nav aria-label="Primary navigation">
          <p className="nav-label">Portals & Navigation</p>
          <button
            type="button"
            className="nav-item home-nav-btn"
            style={{ color: '#b34a2e', fontWeight: 700 }}
            onClick={() => setCurrentView('landing')}
          >
            <span className="nav-icon">⌂</span>
            Landing Page
          </button>
          <button
            type="button"
            className="nav-item onboarding-nav-btn"
            onClick={() => {
              setActiveOnboardingRole(dashboardRole)
              setCurrentView('onboarding')
            }}
          >
            <span className="nav-icon">✦</span>
            Role Onboarding
          </button>

          <p className="nav-label" style={{ marginTop: '18px' }}>Operations</p>
          {navItems.map((item) => (
            <button
              key={item}
              className={activeView === item ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveView(item)}
            >
              <span className="nav-icon">
                {item === 'Overview'
                  ? 'O'
                  : item === 'Nashik map'
                  ? 'M'
                  : item === 'Mission control'
                  ? '!'
                  : item === 'Deployment board'
                  ? 'o'
                  : item === 'Volunteers'
                  ? 'U'
                  : item === 'Tasks'
                  ? '>'
                  : item === 'Training hub'
                  ? '▶'
                  : '='}
              </span>
              {item}
              {item === 'Deployment board' && <em>3</em>}
              {item === 'Mission control' && <em>3</em>}
            </button>
          ))}

          <p className="nav-label lower">Administration</p>
          <button
            className={activeView === 'Reports' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveView('Reports')}
          >
            <span className="nav-icon">D</span>Reports
          </button>
          <button
            className={activeView === 'Settings' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveView('Settings')}
          >
            <span className="nav-icon">S</span>Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot"></div>
          <div>
            <strong>System operational</strong>
            <span>14 Sectors Linked</span>
          </div>
          <button aria-label="Open system status">&gt;</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">TUESDAY, 06 SEPTEMBER 2026</span>
            <h1>
              {activeView === 'Overview'
                ? dashboardRole === 'Volunteer'
                  ? `Good morning, ${volunteerProfile.name.split(' ')[0]}`
                  : dashboardRole === 'Central administrator'
                  ? 'Central command'
                  : `Zone Command · ${zonalProfile.assignedZone}`
                : activeView}
            </h1>
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="outline-button"
              style={{ padding: '7px 12px', fontSize: '10px' }}
              onClick={() => setCurrentView('landing')}
            >
              ⌂ Home
            </button>

            <button
              type="button"
              className="outline-button"
              style={{ padding: '7px 12px', fontSize: '10px', color: '#b34a2e', borderColor: '#e6cdc4' }}
              onClick={() => {
                setActiveOnboardingRole(dashboardRole)
                setCurrentView('onboarding')
              }}
            >
              ✦ New Onboarding
            </button>

            <label className="role-switcher">
              <span>VIEW AS</span>
              <select
                value={dashboardRole}
                onChange={(event) => {
                  setDashboardRole(event.target.value as DashboardRole)
                  setActiveView('Overview')
                }}
              >
                <option value="Volunteer">Volunteer</option>
                <option value="Zonal administrator">Zonal administrator</option>
                <option value="Central administrator">Central administrator</option>
              </select>
            </label>

            <div className="profile">
              <div className="avatar">{currentUserAvatar}</div>
              <div>
                <strong>{currentUserName}</strong>
                <span>{currentUserTitle}</span>
              </div>
              <b>v</b>
            </div>
          </div>
        </header>

        {activeView === 'Overview' && dashboardRole === 'Volunteer' ? (
          <div className="content-wrap">
            <VolunteerDashboard profile={volunteerProfile} />
          </div>
        ) : activeView === 'Overview' && dashboardRole === 'Central administrator' ? (
          <div className="content-wrap">
            <CentralDashboard profile={centralProfile} />
          </div>
        ) : activeView === 'Overview' ? (
          <div className="content-wrap">
            <section className="welcome-row">
              <div>
                <p className="section-kicker">ZONE COMMAND · {zonalProfile.assignedZone.toUpperCase()}</p>
                <h2>Field picture</h2>
                <p className="muted">
                  Live coverage across {zonalProfile.assignedZone} sector posts. Coordinator: <strong>{zonalProfile.name}</strong> <span className="live-pill"><i></i>Live</span>
                </p>
              </div>
              <div className="date-control">
                <span>Today</span>
                <strong>06 Sep 2026</strong>
                <b>v</b>
              </div>
            </section>

            <section className="metric-grid" aria-label="Operations summary">
              <article className="metric-card primary">
                <div className="metric-head">
                  <span>VOLUNTEERS ON DUTY</span>
                  <span className="metric-icon">O</span>
                </div>
                <strong>83 <small>/ {zonalProfile.targetCapacity}</small></strong>
                <div className="progress">
                  <span style={{ width: `${Math.min(100, Math.round((83 / zonalProfile.targetCapacity) * 100))}%` }}></span>
                </div>
                <p>
                  <b>{Math.round((83 / zonalProfile.targetCapacity) * 100)}%</b> coverage (Threshold: {zonalProfile.minCoverageThreshold}%)
                </p>
              </article>
              <article className="metric-card">
                <div className="metric-head">
                  <span>ACTIVE POSTS</span>
                  <span className="metric-icon">+</span>
                </div>
                <strong>12 <small>/ 14</small></strong>
                <p><span className="dot green"></span> 10 fully covered <span className="dot amber"></span> 2 gaps</p>
              </article>
              <article className="metric-card">
                <div className="metric-head">
                  <span>OPEN TASKS</span>
                  <span className="metric-icon">&gt;</span>
                </div>
                <strong>18</strong>
                <p><span className="dot red"></span> 3 need attention <span className="trend down">up 2 since 08:00</span></p>
              </article>
              <article className="metric-card">
                <div className="metric-head">
                  <span>RADIO CHANNEL</span>
                  <span className="metric-icon">o</span>
                </div>
                <strong style={{ fontSize: '20px' }}>{zonalProfile.emergencyRadioChannel.split(' ')[0]}</strong>
                <p>{zonalProfile.emergencyRadioChannel}</p>
              </article>
            </section>

            <section className="bulletin-board" aria-label="Operational bulletins">
              <div className="bulletin-heading">
                <div>
                  <p className="section-kicker">FIELD BULLETIN</p>
                  <h2>What needs attention</h2>
                </div>
                <span className="bulletin-live"><i></i>Live updates</span>
              </div>
              {bulletins
                .filter((bulletin) => !dismissedBulletins.includes(bulletin.id))
                .map((bulletin) => (
                  <article className={`bulletin-item ${bulletin.tone}`} key={bulletin.id}>
                    <div className="alert-symbol">
                      {bulletin.tone === 'route' ? '>' : bulletin.tone === 'support' ? '+' : '!'}
                    </div>
                    <div className="bulletin-copy">
                      <span>{bulletin.label}</span>
                      <strong>{bulletin.title}</strong>
                      <p>{bulletin.detail}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        bulletin.id === 'tapovan-gap'
                          ? setShowRoster(true)
                          : bulletin.id === 'route-update'
                          ? setActiveView('Nashik map')
                          : setActiveView('Mission control')
                      }
                    >
                      {bulletin.action} <span>-&gt;</span>
                    </button>
                    <button
                      className="close-alert"
                      aria-label={`Dismiss ${bulletin.title}`}
                      onClick={() => setDismissedBulletins((current) => [...current, bulletin.id])}
                    >
                      x
                    </button>
                  </article>
                ))}
            </section>

            <div className="section-heading">
              <div>
                <p className="section-kicker">LIVE COVERAGE</p>
                <h2>Zone status</h2>
              </div>
              <button className="outline-button" onClick={() => setShowRoster(true)}>
                View full roster <span>-&gt;</span>
              </button>
            </div>
            <section className="zone-grid">
              {initialZones.map((zone) => (
                <article className={`zone-card ${zone.tone}`} key={zone.name}>
                  <div className="zone-top">
                    <div>
                      <span className="zone-code">{zone.district.toUpperCase()}</span>
                      <h3>{zone.name}</h3>
                    </div>
                    <span className="zone-menu">...</span>
                  </div>
                  <div className="zone-count">
                    <strong>{zone.present}</strong>
                    <span>/ {zone.required} present</span>
                  </div>
                  <div className="zone-progress">
                    <span style={{ width: `${Math.round((zone.present / zone.required) * 100)}%` }}></span>
                  </div>
                  <div className="zone-foot">
                    <span className={`status-tag ${zone.tone}`}>
                      {zone.tone === 'green' ? 'Covered' : zone.tone === 'amber' ? 'Needs cover' : 'Critical gap'}
                    </span>
                    <span>{zone.note}</span>
                  </div>
                </article>
              ))}
            </section>

            <section className="lower-grid">
              <article className="panel roster-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">ROSTER AGENT</p>
                    <h2>Suggested changes</h2>
                  </div>
                  <span className="pending-tag">Pending approval</span>
                </div>
                <div className="suggestion">
                  <div className="suggestion-icon">&gt;</div>
                  <div>
                    <strong>Move 4 volunteers to Ramkund Gate</strong>
                    <p>Based on live headcount and proximity</p>
                    <div className="move-line">
                      <span>Tapovan Transit</span>
                      <b>-&gt;</b>
                      <span>Ramkund Gate</span>
                    </div>
                  </div>
                </div>
                <div className="panel-actions">
                  <button className="ghost-button" onClick={() => setShowRoster(true)}>
                    See details
                  </button>
                  <button
                    className={rosterApproved ? 'approve-button approved' : 'approve-button'}
                    onClick={() => setRosterApproved(true)}
                  >
                    {rosterApproved ? 'Roster approved' : 'Approve roster'} <span>{rosterApproved ? 'ok' : '->'}</span>
                  </button>
                </div>
              </article>

              <article className="panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">RECENT ACTIVITY</p>
                    <h2>What is happening</h2>
                  </div>
                  <button className="more-button" aria-label="More activity options">
                    ...
                  </button>
                </div>
                <div className="activity-list">
                  <div className="activity-item">
                    <span className="activity-avatar blue">AK</span>
                    <p>
                      <strong>Aarav Kulkarni</strong> checked in at <b>Ramkund Gate</b>
                      <small>2 minutes ago</small>
                    </p>
                  </div>
                  <div className="activity-item">
                    <span className="activity-avatar peach">SA</span>
                    <p>
                      <strong>Sana Sheikh</strong> completed task <b>Family support briefing</b>
                      <small>6 minutes ago</small>
                    </p>
                  </div>
                  <div className="activity-item">
                    <span className="activity-avatar mint">AG</span>
                    <p>
                      <strong>Roster Agent</strong> flagged a coverage gap at <b>Tapovan Transit</b>
                      <small>11 minutes ago</small>
                    </p>
                  </div>
                </div>
                <button className="activity-link">View activity log <span>-&gt;</span></button>
              </article>
            </section>
          </div>
        ) : activeView === 'Nashik map' ? (
          <div className="content-wrap map-content-wrap">
            <NashikMap />
          </div>
        ) : (
          <div className="content-wrap">
            {activeView === 'Reports' ? (
              <ReportsView />
            ) : activeView === 'Settings' ? (
              <SettingsView />
            ) : activeView === 'Training hub' ? (
              <TrainingView />
            ) : activeView === 'Mission control' ? (
              <MissionsView />
            ) : (
              <OperationalView
                view={activeView}
                volunteers={volunteerList}
                onRoster={() => setShowRoster(true)}
                onEditVolunteer={setEditingVolunteer}
              />
            )}
          </div>
        )}
      </main>

      {showRoster && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowRoster(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="roster-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="section-kicker">LIVE ROSTER · {volunteerList.length} ACTIVE</p>
                <h2 id="roster-title">Volunteer coverage</h2>
              </div>
              <button className="close-alert" onClick={() => setShowRoster(false)} aria-label="Close roster">x</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Volunteer</th>
                    <th>Role</th>
                    <th>Post</th>
                    <th>Status</th>
                    <th>Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteerList.map((volunteer) => (
                    <tr key={volunteer.name}>
                      <td><strong>{volunteer.name}</strong><small>{volunteer.language}</small></td>
                      <td>{volunteer.role}</td>
                      <td>{volunteer.post}</td>
                      <td><span className={`table-status ${volunteer.status.toLowerCase().replace(' ', '-')}`}>{volunteer.status}</span></td>
                      <td>{volunteer.lastSeen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <span>Changes are suggestions until approved by a coordinator.</span>
              <button className="approve-button" onClick={() => { setRosterApproved(true); setShowRoster(false) }}>
                Approve changes <span>-&gt;</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {editingVolunteer && (
        <VolunteerEditor
          volunteer={editingVolunteer}
          onClose={() => setEditingVolunteer(null)}
          onSave={(updatedVolunteer) =>
            setVolunteerList((current) =>
              current.map((volunteer) =>
                volunteer.name === updatedVolunteer.name ? updatedVolunteer : volunteer
              )
            )
          }
        />
      )}
    </div>
  )
}

export default App
