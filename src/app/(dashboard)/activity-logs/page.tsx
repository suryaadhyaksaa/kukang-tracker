import React from "react";
import { History } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatJakartaDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const supabase = await createServerSupabase();
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">
          System Activity & Audit Log
        </h1>
        <p className="text-sm text-stone-400">
          Rekam jejak seluruh aksi check-in, verifikasi kontribusi, perubahan
          data, dan sinkronisasi Excel
        </p>
      </div>

      <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
        <div className="mb-4 flex items-center gap-2 text-[#E5B94C]">
          <History className="h-4 w-4" />
          <h2 className="font-heading text-base font-bold text-white">
            100 Aktivitas Terakhir
          </h2>
        </div>

        <div className="space-y-2.5">
          {(logs || []).map((log) => (
            <div
              key={log.id}
              className="flex flex-col justify-between gap-2 rounded-xl border border-[#3B181A] bg-[#090607] p-3.5 sm:flex-row sm:items-center"
            >
              <div>
                <p className="text-xs font-medium text-white">
                  {log.description}
                </p>
                <p className="mt-1 text-[11px] text-stone-400">
                  Aktor: {log.actor_name} ({log.actor_role}) • Tipe:{" "}
                  <span className="text-[#EF4444]">{log.action_type}</span>
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-stone-500">
                {formatJakartaDateTime(log.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}