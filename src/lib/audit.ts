import { createAdminSupabase } from "@/lib/supabase/admin";

interface AuditParams {
  actorProfileId?: string | null;
  actorName: string;
  actorRole: string;
  actionType:
    | "CHECK_IN"
    | "CONTRIBUTION_SUBMITTED"
    | "EVENT_CREATED"
    | "EVENT_UPDATED"
    | "EVENT_DELETED"
    | "MEMBER_UPDATED"
    | "MEMBER_REGISTERED"
    | "CONTRIBUTION_VERIFIED"
    | "EXCEL_SYNC";
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function writeActivityLog(params: AuditParams) {
  try {
    const adminDb = createAdminSupabase();
    await adminDb.from("activity_logs").insert({
      actor_profile_id: params.actorProfileId ?? null,
      actor_name: params.actorName,
      actor_role: params.actorRole,
      action_type: params.actionType,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      description: params.description,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.error("[AUDIT_LOG_ERROR]", err);
  }
}