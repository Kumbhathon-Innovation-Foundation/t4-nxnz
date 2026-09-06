export type LanguageProficiency = "basic" | "conversational" | "fluent" | "native";

export interface LanguageSkill {
  language: string;
  code?: string;
  proficiency: LanguageProficiency;
  evidence_quote?: string;
  source: "voice_story" | "form" | "manual_edit" | "seed";
}

export type SkillCategory =
  | "safety"
  | "medical"
  | "language"
  | "crowd"
  | "logistics"
  | "technical"
  | "teaching"
  | "other";

export interface Skill {
  name: string;
  category: SkillCategory;
  confidence: number;
  evidence_quote?: string;
  source: "voice_story" | "form" | "document" | "manual_edit" | "seed";
  certified?: boolean;
}

export interface Availability {
  dates: string[];
  time_slots: string[];
  locations: string[];
}

export interface Certification {
  id: string;
  title: string;
  category?: string;
  filename: string;
  mimetype: string;
  uploaded_at: string;
  extracted_text?: string;
}

export interface ScoreEvent {
  id: string;
  skill: string;
  points: number;
  reason: string;
  multiplier?: number;
  created_at: string;
}

export interface ExtractedProfile {
  languages_spoken: Array<{ language: string; proficiency: LanguageProficiency; evidence_quote?: string }>;
  skills: Array<{ name: string; category: SkillCategory; confidence: number; evidence_quote?: string }>;
  interests: string[];
  availability_signals: string[];
  prior_volunteer_experience: string;
  personality_traits: string[];
  recommended_roles: string[];
  red_flags: string[];
  summary: string;
  extracted_by: string;
}

export interface Volunteer {
  volunteer_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  city: string;
  areas_nashik: string[];
  kyc_verified: boolean;
  aadhaar_number_masked: string;
  aadhaar_verified: boolean;
  police_verification_status: "pending" | "clear" | "flagged";
  languages: LanguageSkill[];
  skills: Skill[];
  interests: string[];
  availability: Availability;
  certifications: Certification[];
  transcript_text: string;
  story_media_type: "video" | "audio" | "none";
  extracted_profile: ExtractedProfile | null;
  score_total: number;
  skill_scores: Record<string, number>;
  score_events: ScoreEvent[];
  documents: Certification[];
  onboarding_status: "started" | "identity_pending" | "story_pending" | "details_pending" | "complete";
  consent_flags: string[];
}

export interface Partner {
  partner_id: string;
  name: string;
  api_key: string;
  scopes: string[];
  created_at: string;
  revoked: boolean;
}
