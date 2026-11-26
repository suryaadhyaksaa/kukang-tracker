import React from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getJakartaNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const todayWib = getJakartaNow().date;

  const [
    { data: members },
    { data: events },
    { data: attendance },
    { data: contributions },
    { data: divisions },
    { data: logs },
  ] = await Promise.all([
    supabase.from("members").select("*, divisions(*)").order("full_name"),
    supabase.from("events").select("*").order("event_date", { ascending: false }),
    supabase
      .from("attendance")
      .select("*")
      .order("check_in_time", { ascending: false }),
    supabase
      .from("contributions")
      .select("*, documentation(*)")
      .order("submitted_at", { ascending: false }),
    supabase.from("divisions").select("*").order("name"),
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  return (
    <DashboardClient
      initialMembers={members || []}
      initialEvents={events || []}
      initialAttendance={attendance || []}
      initialContributions={contributions || []}
      initialDivisions={divisions || []}
      initialLogs={logs || []}
      todayWib={todayWib}
    />
  );
}