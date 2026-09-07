import type { SkillCategory } from "./types";

export type NeedStatus = "open" | "allocated" | "in_progress" | "resolved" | "cancelled";
export type NeedUrgency = "critical" | "high" | "medium" | "low";
export type AssignmentStatus = "allocated" | "checked_in" | "completed" | "no_show";

/** A demand signal from any consumer app: an incident, a shift gap, a surge. */
export interface Need {
  need_id: string;
  title: string;
  description: string;
  category: SkillCategory;
  required_skills: string[];
  languages_required: string[];
  min_score: number;
  people_needed: number;
  urgency: NeedUrgency;
  location_name: string;
  lat: number;
  lng: number;
  radius_m: number;
  time_window: { start: string; end: string };
  status: NeedStatus;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  source: string;
}

export interface MatchBreakdown {
  volunteer_id: string;
  name: string;
  skill_score: number;
  base_score: number;
  distance_m: number;
  available: boolean;
  language_match: boolean;
  embedding_similarity: number;
  final_score: number;
  reasons: string[];
  warnings: string[];
}

export interface Assignment {
  assignment_id: string;
  need_id: string;
  volunteer_id: string;
  volunteer_name: string;
  status: AssignmentStatus;
  match_score: number;
  distance_m: number;
  allocated_at: string;
  checked_in_at?: string;
  completed_at?: string;
  skill: string;
  skill_category: SkillCategory;
}

export interface AllocationResult {
  need_id: string;
  allocated: Assignment[];
  unfilled: number;
  candidates: MatchBreakdown[];
}
