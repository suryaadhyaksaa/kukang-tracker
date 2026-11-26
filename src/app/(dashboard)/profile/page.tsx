import React from "react";
import { redirect } from "next/navigation";
import { UserCircle, CheckCircle2, Award, Percent } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatJakartaDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("*, divisions(name)")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!member) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200">
        Akun Anda belum terhubung dengan data anggota di Master Data Anggota.
        Silakan hubungi Pengurus Admin Kukang EV.
      </div>
    );
  }

  const [{ data: totalEvents }, { data: myAttendance }, { data: myContributions }] =
    await Promise.all([
      supabase.from("events").select("id"),
      supabase
        .from("attendance")
        .select("*")
        .eq("member_id", member.id)
        .order("check_in_time", { ascending: false }),
      supabase
        .from("contributions")
        .select("*, events(title), documentation(*)")
        .eq("member_id", member.id)
        .order("submitted_at", { ascending: false }),
    ]);

  const totalEvCount = Math.max(1, totalEvents?.length || 1);
  const attendedCount = myAttendance?.length || 0;
  const attendancePct = Math.min(
    100,
    Math.round((attendedCount / totalEvCount) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Identity Card */}
      <div className="rounded-2xl border border-[#3B181A] kukang-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#9E0B0B]/25 border border-[#DC2626]/40">
              <UserCircle className="h-9 w-9 text-[#EF4444]" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-white">
                {member.full_name}
              </h1>
              <p className="text-sm text-[#E5B94C]">
                {member.position} •{" "}
                {(member.divisions as { name?: string } | null)?.name || "-"}
              </p>
              <p className="mt-1 font-mono text-xs text-stone-400">
                NIM: {member.nim} • Angkatan {member.angkatan}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-[#3B181A] bg-[#090607] px-4 py-3">
              <CheckCircle2 className="mx-auto h-4 w-4 text-[#EF4444]" />
              <p className="mt-1 font-heading text-lg font-bold text-white">
                {attendedCount}
              </p>
              <p className="text-[10px] text-stone-400">Hadir</p>
            </div>
            <div className="rounded-xl border border-[#3B181A] bg-[#090607] px-4 py-3">
              <Percent className="mx-auto h-4 w-4 text-[#E5B94C]" />
              <p className="mt-1 font-heading text-lg font-bold text-white">
                {attendancePct}%
              </p>
              <p className="text-[10px] text-stone-400">Kehadiran</p>
            </div>
            <div className="rounded-xl border border-[#3B181A] bg-[#090607] px-4 py-3">
              <Award className="mx-auto h-4 w-4 text-amber-400" />
              <p className="mt-1 font-heading text-lg font-bold text-white">
                {myContributions?.length || 0}
              </p>
              <p className="text-[10px] text-stone-400">Kontribusi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance & Contribution History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
          <h2 className="mb-4 font-heading text-base font-bold text-white">
            Riwayat Kehadiran Saya
          </h2>
          <div className="space-y-2.5">
            {(myAttendance || []).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-[#3B181A] bg-[#090607] p-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-white">
                    {a.event_title_snapshot}
                  </p>
                  <p className="text-stone-400">
                    {formatJakartaDateTime(a.check_in_time)}
                  </p>
                </div>
                <span className="rounded-full bg-[#9E0B0B]/25 px-2.5 py-0.5 font-semibold uppercase text-[#EF4444]">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
          <h2 className="mb-4 font-heading text-base font-bold text-white">
            Riwayat Kontribusi Saya
          </h2>
          <div className="space-y-2.5">
            {(myContributions || []).map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-[#3B181A] bg-[#090607] p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    {(c.events as { title?: string } | null)?.title}
                  </span>
                  <span className="uppercase font-semibold text-amber-400">
                    {c.verification_status}
                  </span>
                </div>
                <p className="text-[#E5B94C]">{c.category}</p>
                <p className="text-stone-400">{c.work_output}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}