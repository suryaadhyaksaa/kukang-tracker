"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCachedData, setCachedData } from "@/lib/cache";
import { formatJakartaDateTime } from "@/lib/utils";
import type {
  ContributionRecord,
  Division,
  KukangEvent,
  UserRole,
} from "@/types/database";

interface ContribCache {
  items: ContributionRecord[];
  events: KukangEvent[];
  divisions: Division[];
  role: UserRole;
}

export default function ContributionsPage() {
  const supabase = createClient();
  const cached = getCachedData<ContribCache>("contributions-page");

  const [items, setItems] = useState<ContributionRecord[]>(cached?.items || []);
  const [events, setEvents] = useState<KukangEvent[]>(cached?.events || []);
  const [divisions, setDivisions] = useState<Division[]>(cached?.divisions || []);
  const [role, setRole] = useState<UserRole>(cached?.role || "member");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const [filterEvent, setFilterEvent] = useState("");
  const [filterDiv, setFilterDiv] = useState("");
  const [filterMember, setFilterMember] = useState("");

  // Interactive non-blocking verification modal state
  const [verifyTarget, setVerifyTarget] = useState<{
    id: string;
    status: "approved" | "rejected";
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [verifying, setVerifying] = useState(false);

  const isAdmin = role === "admin" || role === "super_admin";

  async function loadAll() {
    let resolvedRole: UserRole = role;
    const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null;
    if (user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (p?.role) {
        resolvedRole = p.role as UserRole;
        setRole(resolvedRole);
      }
    }

    const [{ data: cData }, { data: eData }, { data: dData }] = await Promise.all([
      supabase
        .from("contributions")
        .select(
          "*, members(nim, full_name), events(title), divisions(name), documentation(*)"
        )
        .order("submitted_at", { ascending: false }),
      supabase.from("events").select("*").order("event_date", { ascending: false }),
      supabase.from("divisions").select("*").order("name"),
    ]);

    const nextItems = (cData as ContributionRecord[]) || [];
    const nextEvents = (eData as KukangEvent[]) || [];
    const nextDivisions = (dData as Division[]) || [];

    setItems(nextItems);
    setEvents(nextEvents);
    setDivisions(nextDivisions);

    setCachedData<ContribCache>("contributions-page", {
      items: nextItems,
      events: nextEvents,
      divisions: nextDivisions,
      role: resolvedRole,
    });
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyTarget) return;
    setVerifying(true);

    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) =>
        item.id === verifyTarget.id
          ? {
              ...item,
              verification_status: verifyTarget.status,
              admin_notes: adminNotes || null,
            }
          : item
      )
    );

    await fetch(`/api/contributions/${verifyTarget.id}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verification_status: verifyTarget.status,
        admin_notes: adminNotes,
      }),
    });

    setVerifying(false);
    setVerifyTarget(null);
    setAdminNotes("");
    loadAll();
  }

  const filtered = items.filter((item) => {
    if (filterEvent && item.event_id !== filterEvent) return false;
    if (filterDiv && item.division_id !== filterDiv) return false;
    if (
      filterMember &&
      !item.members?.full_name
        .toLowerCase()
        .includes(filterMember.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">
            Kontribusi & Dokumentasi Anggota
          </h1>
          <p className="text-sm text-stone-400">
            Log aktivitas, hasil kerja, dan bukti foto/video kegiatan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#3B181A] kukang-card p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`rounded-lg p-1.5 ${
                viewMode === "cards"
                  ? "bg-[#9E0B0B]/30 text-[#EF4444]"
                  : "text-stone-400"
              }`}
              title="Tampilan Card"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-1.5 ${
                viewMode === "table"
                  ? "bg-[#9E0B0B]/30 text-[#EF4444]"
                  : "text-stone-400"
              }`}
              title="Tampilan Tabel"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/contributions/new"
            prefetch={true}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-4 py-2.5 text-xs font-bold text-white hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kontribusi</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#3B181A] kukang-card p-4 sm:grid-cols-3">
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
        >
          <option value="">Semua Kegiatan</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <select
          value={filterDiv}
          onChange={(e) => setFilterDiv(e.target.value)}
          className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
        >
          <option value="">Semua Divisi</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Cari nama anggota..."
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
        />
      </div>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-2xl border border-[#3B181A] kukang-card p-5 space-y-4 hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded bg-[#C89D3C]/15 px-2 py-0.5 text-[10px] font-semibold text-[#E5B94C]">
                      {c.category}
                    </span>
                    <h3 className="mt-1 font-heading text-base font-bold text-white">
                      {c.events?.title}
                    </h3>
                    <p className="text-xs text-stone-400">
                      {c.members?.full_name} ({c.members?.nim}) •{" "}
                      {c.divisions?.name}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      c.verification_status === "approved"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : c.verification_status === "rejected"
                        ? "bg-rose-500/15 text-rose-400"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {c.verification_status === "approved" && (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    {c.verification_status === "rejected" && (
                      <XCircle className="h-3 w-3" />
                    )}
                    {c.verification_status === "pending" && (
                      <Clock className="h-3 w-3" />
                    )}
                    {c.verification_status.toUpperCase()}
                  </span>
                </div>

                <div className="rounded-xl bg-[#090607] p-3 text-xs space-y-1.5 border border-[#3B181A]">
                  <p className="text-stone-300">
                    <strong className="text-stone-400">Peran:</strong>{" "}
                    {c.role_in_event}
                  </p>
                  <p className="text-stone-300">
                    <strong className="text-stone-400">Deskripsi:</strong>{" "}
                    {c.work_description}
                  </p>
                  <p className="text-[#F5D06F]">
                    <strong className="text-stone-400">Output:</strong>{" "}
                    {c.work_output}
                  </p>
                </div>

                {c.documentation && c.documentation.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {c.documentation.map((doc) =>
                      doc.file_type === "image" ? (
                        <a
                          key={doc.id}
                          href={doc.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative overflow-hidden rounded-xl border border-[#3B181A]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.public_url}
                            alt={doc.file_name}
                            className="h-28 w-full object-cover transition group-hover:scale-105"
                          />
                        </a>
                      ) : (
                        <a
                          key={doc.id}
                          href={doc.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-28 items-center justify-center gap-1.5 rounded-xl border border-[#3B181A] bg-[#090607] p-3 text-xs text-[#E5B94C] hover:border-[#C89D3C]/45"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="truncate">{doc.file_name}</span>
                        </a>
                      )
                    )}
                  </div>
                )}

                {c.gdrive_link && (
                  <a
                    href={c.gdrive_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#E5B94C] hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Buka Lampiran Google Drive</span>
                  </a>
                )}

                {c.admin_notes && (
                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300 border border-amber-500/20">
                    Catatan Admin: {c.admin_notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#3B181A] pt-3 text-[11px] text-stone-500">
                <span>{formatJakartaDateTime(c.submitted_at)}</span>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setVerifyTarget({ id: c.id, status: "approved" });
                        setAdminNotes(c.admin_notes || "");
                      }}
                      className="rounded-lg bg-emerald-500/20 px-2.5 py-1 font-semibold text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setVerifyTarget({ id: c.id, status: "rejected" });
                        setAdminNotes(c.admin_notes || "");
                      }}
                      className="rounded-lg bg-rose-500/20 px-2.5 py-1 font-semibold text-rose-300 hover:bg-rose-500/30"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#3B181A] kukang-card p-4">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#3B181A] text-stone-400">
              <tr>
                <th className="py-3 px-3">Anggota</th>
                <th className="py-3 px-3">Kegiatan</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Output</th>
                <th className="py-3 px-3">Status</th>
                {isAdmin && <th className="py-3 px-3 text-right">Verifikasi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B181A]/60">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[#1E0E10]/50">
                  <td className="py-3 px-3 font-medium text-white">
                    {c.members?.full_name}
                  </td>
                  <td className="py-3 px-3 text-stone-300">{c.events?.title}</td>
                  <td className="py-3 px-3 text-[#E5B94C]">{c.category}</td>
                  <td className="py-3 px-3 text-stone-300 max-w-xs truncate">
                    {c.work_output}
                  </td>
                  <td className="py-3 px-3 uppercase font-semibold text-amber-400">
                    {c.verification_status}
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setVerifyTarget({ id: c.id, status: "approved" });
                          setAdminNotes(c.admin_notes || "");
                        }}
                        className="text-emerald-400 hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setVerifyTarget({ id: c.id, status: "rejected" });
                          setAdminNotes(c.admin_notes || "");
                        }}
                        className="text-rose-400 hover:underline"
                      >
                        Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Non-Blocking Interactive Verification Modal */}
      {verifyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitVerification}
            className="kukang-card w-full max-w-md rounded-2xl p-6 space-y-4 animate-page-enter"
          >
            <div className="flex items-center justify-between border-b border-[#3B181A] pb-3">
              <h3 className="font-heading text-base font-bold text-white">
                Konfirmasi Status:{" "}
                <span className="text-[#E5B94C]">
                  {verifyTarget.status.toUpperCase()}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setVerifyTarget(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-stone-300">
                Catatan Evaluasi Pengurus (Opsional)
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Tulis catatan evaluasi atau masukan untuk anggota..."
                className="w-full rounded-xl border border-[#4A2022] bg-[#090607] p-3 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVerifyTarget(null)}
                className="rounded-xl border border-[#4A2022] px-4 py-2 text-xs text-stone-300"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={verifying}
                className="rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C89D3C] px-4 py-2 text-xs font-bold text-white"
              >
                {verifying ? "Menyimpan..." : "Simpan Keputusan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}