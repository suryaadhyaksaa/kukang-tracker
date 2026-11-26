"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  CalendarDays,
  MapPin,
  FilePlus2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KukangLogo } from "@/components/brand/KukangLogo";
import { formatJakartaDateTime } from "@/lib/utils";
import type { KukangEvent, Member } from "@/types/database";

export default function CheckInConfirmationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = decodeURIComponent(params.token);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [event, setEvent] = useState<KukangEvent | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    jakarta_time: string;
    event_id: string;
  } | null>(null);

  useEffect(() => {
    async function loadIdentityAndEvent() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?redirect=/checkin/${encodeURIComponent(token)}`);
        return;
      }

      const [{ data: memberData }, { data: eventData }] = await Promise.all([
        supabase
          .from("members")
          .select("*, divisions(name)")
          .eq("profile_id", user.id)
          .maybeSingle(),
        supabase.from("events").select("*").eq("qr_token", token).maybeSingle(),
      ]);

      if (!memberData) {
        setErrorMsg(
          "Akun Anda belum terhubung dengan Master Data Anggota Kukang EV. Hubungi Admin."
        );
      } else {
        setMember(memberData as Member);
      }

      if (!eventData) {
        setErrorMsg("QR Code tidak valid atau kegiatan tidak ditemukan.");
      } else {
        setEvent(eventData as KukangEvent);
      }

      setLoading(false);
    }

    loadIdentityAndEvent();
  }, [token, router]);

  async function handleConfirmCheckIn() {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Check-in gagal diverifikasi.");
        setSubmitting(false);
        return;
      }

      setSuccessData({
        jakarta_time: data.jakarta_time,
        event_id: event!.id,
      });
    } catch {
      setErrorMsg("Terjadi gangguan jaringan saat melakukan check-in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050816] p-4">
      <div className="mb-6">
        <KukangLogo showTagline />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F172A] p-6 shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center py-10 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="mt-3 text-sm">Memverifikasi identitas & token QR...</p>
          </div>
        ) : successData ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-white">
                Check-In Berhasil!
              </h1>
              <p className="mt-1 text-xs text-cyan-400">
                Tercatat pada {successData.jakarta_time} (Server Time)
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#050816] p-4 text-left text-xs space-y-1.5">
              <p className="text-slate-400">
                Anggota: <strong className="text-white">{member?.full_name}</strong>
              </p>
              <p className="text-slate-400">
                NIM: <strong className="text-white">{member?.nim}</strong>
              </p>
              <p className="text-slate-400">
                Kegiatan: <strong className="text-emerald-400">{event?.title}</strong>
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link
                href={`/contributions/new?eventId=${successData.event_id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>Isi Catatan Kontribusi Sekarang</span>
              </Link>
              <Link
                href="/dashboard"
                className="block w-full rounded-xl border border-slate-700 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <h1 className="font-heading text-xl font-bold text-white">
              Konfirmasi Kehadiran Kegiatan
            </h1>

            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {member && (
              <div className="rounded-xl border border-slate-800 bg-[#050816] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                  <UserCheck className="h-4 w-4" />
                  <span>IDENTITAS ANGGOTA TERAUTENTIKASI</span>
                </div>
                <p className="text-base font-bold text-white">{member.full_name}</p>
                <p className="text-xs text-slate-400">
                  NIM: {member.nim} • {member.position}
                </p>
                <p className="text-xs text-emerald-400">
                  Divisi: {member.divisions?.name || "-"}
                </p>
              </div>
            )}

            {event && (
              <div className="rounded-xl border border-slate-800 bg-[#050816] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <CalendarDays className="h-4 w-4" />
                  <span>DETAIL KEGIATAN</span>
                </div>
                <p className="text-base font-bold text-white">{event.title}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{event.location}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Waktu: {formatJakartaDateTime(event.start_time)}
                </p>
              </div>
            )}

            {member && event && (
              <button
                onClick={handleConfirmCheckIn}
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:opacity-95 disabled:opacity-50"
              >
                {submitting ? "Memproses Validasi Server..." : "CHECK IN SEKARANG"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}