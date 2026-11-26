export type UserRole = "super_admin" | "admin" | "member";
export type MembershipStatus = "active" | "inactive" | "alumni";
export type EventStatus = "upcoming" | "ongoing" | "completed";
export type AttendanceStatus = "present" | "late" | "excused";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type SyncStatus = "pending" | "synced" | "failed" | "unconfigured";

export type ContributionCategory =
  | "Technical Development"
  | "Hardware & Electrical"
  | "Software Development"
  | "Administration"
  | "Sponsorship"
  | "Public Relations"
  | "Documentation"
  | "Event Management"
  | "Other";

export const CONTRIBUTION_CATEGORIES: ContributionCategory[] = [
  "Technical Development",
  "Hardware & Electrical",
  "Software Development",
  "Administration",
  "Sponsorship",
  "Public Relations",
  "Documentation",
  "Event Management",
  "Other",
];

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Division {
  id: string;
  name: string;
  category: string;
  description: string | null;
  color_hex: string;
  is_active: boolean;
  created_at: string;
}

export interface Member {
  id: string;
  profile_id: string | null;
  nim: string;
  full_name: string;
  email: string;
  phone: string | null;
  angkatan: number;
  division_id: string | null;
  position: string;
  membership_status: MembershipStatus;
  avatar_url: string | null;
  personal_qr_token: string;
  created_at: string;
  updated_at: string;
  divisions?: Division | null;
}

export interface KukangEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  pic_member_id: string | null;
  division_id: string | null;
  status: EventStatus;
  qr_token: string;
  qr_active_from: string;
  qr_active_until: string;
  is_qr_manually_disabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  divisions?: Division | null;
  pic?: { full_name: string; nim: string } | null;
}

export interface AttendanceRecord {
  id: string;
  member_id: string;
  event_id: string;
  nim_snapshot: string;
  member_name_snapshot: string;
  position_snapshot: string;
  division_name_snapshot: string;
  event_title_snapshot: string;
  attendance_date: string;
  check_in_time: string;
  status: AttendanceStatus;
  check_in_method: string;
  excel_sync_status: SyncStatus;
  created_at: string;
}

export interface DocumentationItem {
  id: string;
  contribution_id: string;
  event_id: string;
  member_id: string;
  file_name: string;
  file_type: "image" | "video";
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  public_url: string;
  created_at: string;
}

export interface ContributionRecord {
  id: string;
  attendance_id: string | null;
  member_id: string;
  event_id: string;
  division_id: string | null;
  role_in_event: string;
  category: ContributionCategory;
  work_description: string;
  work_output: string;
  gdrive_link: string | null;
  verification_status: VerificationStatus;
  admin_notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  excel_sync_status: SyncStatus;
  submitted_at: string;
  updated_at: string;
  members?: Member | null;
  events?: KukangEvent | null;
  divisions?: Division | null;
  documentation?: DocumentationItem[];
}

export interface ActivityLog {
  id: string;
  actor_profile_id: string | null;
  actor_name: string;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ExcelSyncLog {
  id: string;
  idempotency_key: string;
  target_table:
    | "MembersTable"
    | "EventsTable"
    | "AttendanceTable"
    | "ContributionsTable"
    | "Dokumentasi";
  record_id: string;
  operation: string;
  payload: Record<string, unknown>;
  status: "pending" | "success" | "failed" | "skipped_unconfigured";
  attempt_count: number;
  error_message: string | null;
  last_attempted_at: string;
  synced_at: string | null;
}
