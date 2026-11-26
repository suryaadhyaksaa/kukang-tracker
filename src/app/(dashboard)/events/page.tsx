"use client";

import React, { useEffect, useState } from "react";
import {
  CalendarPlus,
  QrCode,
  MapPin,
  Clock,
  Trash2,
  AlertTriangle,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCachedData, setCachedData } from "@/lib/cache";
import { formatJakartaDateTime, generateSecureEventToken } from "@/lib/utils";
import { EventQRModal } from "@/components/events/EventQRModal";
import type { Division, KukangEvent, UserRole } from "@/types/database";

type ExtendedEvent = KukangEvent & {
  target_membership?: "all" | "active" | "internship";
};

interface EventsCache {
  events: ExtendedEvent[];
  divisions: Division[];
  role: UserRole;
}

export default function EventsPage() {
  const supabase = createClient();
  const cached = getCachedData<EventsCache>("events-page");

  const [events, setEvents] = useState<ExtendedEvent[]>(cached?.events || []);
  const [divisions, setDivisions] = useState<Division[]>(cached?.divisions || []);
  const [role, setRole] = useState<UserRole>(cached?.role || "member");
  const [selectedEvent, setSelectedEvent] = useState<ExtendedEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExtendedEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Workshop Kukang EV ITERA");
  const [divisionId, setDivisionId] = useState("");
  const [targetMembership, setTargetMembership] = useState<"all" | "active" | "internship">("all");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState<"upcoming" | "ongoing" | "completed">("ongoing");

  const isAdmin = role === "admin" || role === "super_admin";

  async function loadData() {
    let resolvedRole: UserRole = role;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role) {
        resolvedRole = profile.role as UserRole;
        setRole(resolvedRole);
      }
    }

    const [{ data: evData }, { data: divData }] = await Promise.all([
      supabase
        .from("events")
        .select("*, divisions(name)")
        .order("event_date", { ascending: false }),
      supabase.from("divisions").select("*").order("name"),
    ]);

    const nextEvents = (evData as ExtendedEvent[]) || [];
    const nextDivs = (divData as Division[]) || [];

    setEvents(nextEvents);
    setDivisions(nextDivs);
    setCachedData<EventsCache>("events-page", {
      events: nextEvents,
      divisions: nextDivs,
      role: resolvedRole,
    });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    const startIso = new Date(`${eventDate}T${startTime}:00+07:00`).toISOString();
    const endIso = new Date(`${eventDate}T${endTime}:00+07:00`).toISOString();

    const { error } = await supabase.from("events").insert({
      title,
      description,
      location,
      division_id: divisionId || null,
      target_membership: targetMembership,
      event_date: eventDate,
      start_time: startIso,
      end_time: endIso,
      qr_token: generateSecureEventToken(),
      status,
      created_by: user?.id ?? null,
    });

    setSubmitting(false);

    if (error) {
      setErrorMsg(`Gagal menyimpan kegiatan: ${error.message}`);
      return;
    }

    setTitle("");
    setDescription("");
    loadData();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg(null);

    const targetId = deleteTarget.id;
    const previousEvents = events;

    const updatedList = events.filter((ev) => ev.id !== targetId);
    setEvents(updatedList);
    setCachedData<EventsCache>("events-page", {
      events: updatedList,
      divisions,
      role,
    });
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/events/${targetId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setEvents(previousEvents);
        setCachedData<EventsCache>("events-page", {
          events: previousEvents,
          divisions,
          role,
        });
        setErrorMsg(data.error || "Gagal menghapus kegiatan.");
      }
    } catch {
      setEvents(previousEvents);
      setErrorMsg("Gagal terhubung ke server saat menghapus kegiatan.");
    } finally {
      setDeleting(false);
    }
  }

  function renderTargetBadge(target?: string) {
    if (target === "active") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          <Users className="h-3 w-3" />
          Khusus Anggota Aktif
        </span>
      );
    }
    if (target === "internship") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          <Users className="h-3 w-3" />
          Khusus Magang / Internship
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#C89D3C]/35 bg-[#1B0E10] px-2 py-0.5 text-[10px] font-semibold text-[#E5B94C]">
        <Users className="h-3 w-3" />
        Semua Anggota (Aktif & Magang)
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">
          Manajemen Kegiatan & QR Code
        </h1>
        <p className="text-sm text-stone-400">
          Jadwal agenda tim, ketetapan peserta (Aktif / Magang), dan pembangkit QR Code
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      {/* Form Buat Kegiatan */}
      <form
        onSubmit={handleCreateEvent}
        className="rounded-2xl border border-[#3B181A] kukang-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <CalendarPlus className="h-4 w-4 text-[#EF4444]" />
          <span>Buat Kegiatan Baru</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            required
            placeholder="Nama Kegiatan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
          />
          <input
            required
            placeholder="Lokasi Kegiatan"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
          />
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
          >
            <option value="">Seluruh Divisi (General)</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={targetMembership}
            onChange={(e) =>
              setTargetMembership(e.target.value as "all" | "active" | "internship")
            }
            className="rounded-xl border border-[#C89D3C]/50 bg-[#090607] px-3.5 py-2.5 text-xs font-medium text-[#F5D06F] focus:border-[#C89D3C] focus:outline-none"
          >
            <option value="all">Target: Semua (Aktif & Magang)</option>
            <option value="active">Target: Khusus Anggota Aktif</option>
            <option value="internship">Target: Khusus Magang / Internship</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="date"
            required
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
          />
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
          />
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            placeholder="Deskripsi singkat..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="sm:col-span-3 rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
          />
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "upcoming" | "ongoing" | "completed")
              }
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2.5 text-xs text-white focus:border-[#C89D3C] focus:outline-none"
            >
              <option value="ongoing">Ongoing</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="shrink-0 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-4 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "..." : "Simpan"}
            </button>
          </div>
        </div>
      </form>

      {/* Daftar Kegiatan */}
      {events.length === 0 ? (
        <div className="kukang-card rounded-2xl p-8 text-center text-xs text-stone-400">
          Belum ada jadwal kegiatan tercatat. Silakan buat kegiatan baru di atas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col justify-between rounded-2xl border border-[#3B181A] kukang-card p-5 space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      ev.status === "ongoing"
                        ? "bg-[#C89D3C]/20 text-[#F5D06F] border border-[#C89D3C]/40"
                        : ev.status === "upcoming"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-stone-700/40 text-stone-300"
                    }`}
                  >
                    {ev.status}
                  </span>
                  <span className="truncate font-mono text-[10px] text-stone-500">
                    {ev.qr_token}
                  </span>
                </div>

                <div>{renderTargetBadge(ev.target_membership)}</div>

                <h3 className="font-heading text-base font-bold text-white">
                  {ev.title}
                </h3>
                {ev.description && (
                  <p className="text-xs text-stone-400 line-clamp-2">
                    {ev.description}
                  </p>
                )}

                <div className="space-y-1 pt-2 text-[11px] text-stone-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#EF4444]" />
                    <span>{ev.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#E5B94C]" />
                    <span>{formatJakartaDateTime(ev.start_time)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEvent(ev)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#DC2626]/40 bg-[#9E0B0B]/20 py-2.5 text-xs font-semibold text-red-200 hover:bg-[#9E0B0B]/35"
                >
                  <QrCode className="h-4 w-4 text-[#E5B94C]" />
                  <span>Tampilkan & Unduh QR Code</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(ev)}
                    title="Hapus Kegiatan"
                    className="flex items-center justify-center rounded-xl border border-red-500/40 bg-red-950/50 p-2.5 text-red-300 hover:bg-red-900/60 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal QR Code */}
      {selectedEvent && (
        <EventQRModal
          event={selectedEvent}
          isAdmin={isAdmin}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Modal Konfirmasi Hapus Kegiatan */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="kukang-card w-full max-w-md rounded-2xl p-6 space-y-4 animate-page-enter">
            <div className="flex items-center justify-between border-b border-[#3B181A] pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-heading text-base font-bold text-white">
                  Hapus Kegiatan?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg p-1 text-stone-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-300">
              <p>
                Anda akan menghapus kegiatan{" "}
                <strong className="text-[#F5D06F]">{deleteTarget.title}</strong>{" "}
                (<span className="font-mono text-stone-400">{deleteTarget.qr_token}</span>).
              </p>
              <p className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-red-200">
                Perhatian: QR Code kegiatan ini akan dinonaktifkan permanen dan
                riwayat absensi yang tertaut pada kegiatan ini ikut terhapus.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-[#4A2022] px-4 py-2 text-xs font-medium text-stone-300 hover:bg-[#1E0E10]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#DC2626] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-950/60 hover:brightness-110 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleting ? "Menghapus..." : "Ya, Hapus Kegiatan"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}