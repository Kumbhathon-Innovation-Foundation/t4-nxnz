export type AppView = 'landing' | 'onboarding' | 'signin' | 'dashboard'

export type DashboardRole = 'Volunteer' | 'Zonal administrator' | 'Central administrator'

export type VolunteerStatus = 'On post' | 'En route' | 'No show'
export type MissionStatus = 'Needs acceptance' | 'In progress' | 'Support requested' | 'Resolved' | 'Escalated'

export interface VolunteerProfile {
  name: string
  phone: string
  city: string
  emergencyContact: string
  emergencyPhone: string
  languages: string[]
  skills: string[]
  preferredZone: string
  preferredPost: string
  preferredShift: string
  consentLocationDuringShift: boolean
  privacyPledgeAccepted: boolean
  govtIdType: string
  govtIdNumber: string
  badgeId: string
  joinedAt: string
}

export interface ZonalAdminProfile {
  name: string
  designation: string
  organization: string
  phone: string
  badgeId: string
  assignedZone: string
  subPosts: string[]
  targetCapacity: number
  minCoverageThreshold: number
  maxEtaToleranceMinutes: number
  autoRosterEnabled: boolean
  emergencyRadioChannel: string
  verifiedSops: string[]
  joinedAt: string
}

export interface CentralAdminProfile {
  name: string
  designation: string
  agency: string
  clearanceCode: string
  badgeId: string
  totalMonitoredZones: number
  matchingWeights: {
    languageMatch: number
    skillMatch: number
    safeEta: number
    sourceZoneStability: number
  }
  mandatoryHumanApproval: boolean
  policeLifeSafetyVeto: boolean
  telecomFallbacks: {
    smsGateway: boolean
    ivrDispatch: boolean
    printedRosters: boolean
  }
  joinedAt: string
}

export const defaultVolunteerProfile: VolunteerProfile = {
  name: 'Meera Patil',
  phone: '+91 98230 44120',
  city: 'Nashik',
  emergencyContact: 'Sunil Patil (Father)',
  emergencyPhone: '+91 98230 44101',
  languages: ['Marathi', 'Hindi', 'English'],
  skills: ['First Aid & CPR', 'Sakhi Women Assistance', 'Wayfinding'],
  preferredZone: 'Panchavati',
  preferredPost: 'Ramkund Gate',
  preferredShift: 'Morning (06:00 - 14:00)',
  consentLocationDuringShift: true,
  privacyPledgeAccepted: true,
  govtIdType: 'Aadhaar Card',
  govtIdNumber: 'XXXX-XXXX-4912',
  badgeId: 'SS-NSK-2027-VOL-842',
  joinedAt: '04 Sep 2026',
}

export const defaultZonalProfile: ZonalAdminProfile = {
  name: 'Devv Kulkarni',
  designation: 'Zonal Sector Commander',
  organization: 'Nashik Simhastha Seva Directorate',
  phone: '+91 94222 18902',
  badgeId: 'SS-ZONAL-PANCHAVATI-01',
  assignedZone: 'Ramkund Gate',
  subPosts: ['Ramkund Gate', 'Panchavati North', 'Godavari Ghats Walkway', 'Tapovan Transit'],
  targetCapacity: 94,
  minCoverageThreshold: 85,
  maxEtaToleranceMinutes: 10,
  autoRosterEnabled: true,
  emergencyRadioChannel: 'CH-04 (Simhastha North)',
  verifiedSops: ['Missing volunteer response', 'Family reunification protocol', 'Heat and hydration checks', 'Incident escalation matrix'],
  joinedAt: '01 Sep 2026',
}

export const defaultCentralProfile: CentralAdminProfile = {
  name: 'Arjun Deshmukh',
  designation: 'Central Command Director',
  agency: 'Nashik District Collectorate / Apex Kumbh Authority',
  clearanceCode: 'NSK-CMD-ALPHA-2027',
  badgeId: 'SS-APEX-CENTRAL-01',
  totalMonitoredZones: 14,
  matchingWeights: {
    languageMatch: 35,
    skillMatch: 30,
    safeEta: 25,
    sourceZoneStability: 10,
  },
  mandatoryHumanApproval: true,
  policeLifeSafetyVeto: true,
  telecomFallbacks: {
    smsGateway: true,
    ivrDispatch: true,
    printedRosters: true,
  },
  joinedAt: '15 Aug 2026',
}
