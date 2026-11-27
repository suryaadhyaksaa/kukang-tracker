"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UploadCloud, Send, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { KukangEvent } from "@/types/database";

interface DivisionOption {
  id: string;
  name: string;
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
];
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

function NewContributionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get("eventId") || "";

  const [events, setEvents] = useState<KukangEvent[]>([]);
  const [divisionsList, setDivisionsList] = useState<DivisionOption[]>([]);
  const [eventId, setEventId] = useState(preselectedEventId);
  const [roleInEvent, setRoleInEvent] = useState("");
  const [category, setCategory] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [workOutput, setWorkOutput] = useState("");
  const [gdriveLink, setGdriveLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      const supabase = createClient();

      const [{ data: evData }, { data: divData }] = await Promise.all([
        supabase
          .from("events")
          .select("*")
          .order("event_date", { ascending: false }),
        supabase
          .from("divisions")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      const loadedEvents = (evData as KukangEvent[]) || [];
      setEvents(loadedEvents);
      if (!preselectedEventId && loadedEvents.length > 0) {
        setEventId(loadedEvents[0].id);
      }

      const loadedDivisions = (divData as DivisionOption[]) || [];
      setDivisionsList(loadedDivisions);
      if (loadedDivisions.length > 0) {
        setCategory(loadedDivisions[0].name);
      }
    }

    loadInitialData();
  }, [preselectedEventId]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    for (const f of selected) {
      if (!ALLOWED_MIME_TYPES.includes(f.type)) {
        setError(
          `Format file ${f.name} tidak didukung. Gunakan JPG, PNG, WEBP, atau MP4.`
        );
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        setError(`Ukuran file ${f.name} melebihi batas maksimum 25 MB.`);
        return;
      }
    }
    setError(null);
    setFiles(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const uploadedMetadata = [];

      for (const file of files) {
        const ext = file.name.split(".").pop();
        const storagePath = `${eventId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("kukang-docs")
          .upload(storagePath, file);

        if (uploadErr) {
          throw new Error(`Gagal mengunggah ${file.name}: ${uploadErr.message}`);
        }

        const { data: pubUrl } = supabase.storage
          .from("kukang-docs")
          .getPublicUrl(storagePath);

        uploadedMetadata.push({
          file_name: file.name,
          file_type: file.type.startsWith("video/") ? "video" : "image",
          mime_type: file.type,
          file_size_bytes: file.size,
          storage_path: storagePath,
          public_url: pubUrl.publicUrl,
        });
      }

      const matchedDivision = divisionsList.find((d) => d.name === category);

      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          role_in_event: roleInEvent,
          category,
          division_id: matchedDivision?.id || null,
          work_description: workDescription,
          work_output: workOutput,
          gdrive_link: gdriveLink || null,
          uploaded_files: uploadedMetadata,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal menyimpan kontribusi.");
      }

      router.push("/contributions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl rounded-2xl border border-[#3B181A] kukang-card p-6 space-y-5"
    >
      <div>
        <h1 className="font-heading text-xl font-bold text-white">
          Input Catatan Kontribusi & Dokumentasi
        </h1>
        <p className="text-xs text-stone-400">
          Satu anggota dapat mengirimkan beberapa catatan kontribusi per kegiatan
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-stone-300">
            Kegiatan Terkait
          </label>
          <select
            required
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2.5 text-xs text-white"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.event_date})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-stone-300">
            Divisi / Kategori Kontribusi
          </label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2.5 text-xs text-white"
          >
            {divisionsList.map((div) => (
              <option key={div.id} value={div.name}>
                {div.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-300">
          Peran dalam Kegiatan
        </label>
        <input
          required
          placeholder="Contoh: Lead Wiring Harness & BMS Testing"
          value={roleInEvent}
          onChange={(e) => setRoleInEvent(e.target.value)}
          className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-300">
          Deskripsi Pekerjaan yang Dilakukan
        </label>
        <textarea
          required
          rows={3}
          placeholder="Jelaskan detail aktivitas teknis/non-teknis yang dikerjakan..."
          value={workDescription}
          onChange={(e) => setWorkDescription(e.target.value)}
          className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-300">
          Hasil / Output Pekerjaan
        </label>
        <textarea
          required
          rows={2}
          placeholder="Contoh: Skematik PCB selesai diverifikasi & lolos uji tegangan 48V"
          value={workOutput}
          onChange={(e) => setWorkOutput(e.target.value)}
          className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-300">
          Unggah Dokumentasi Foto / Video (Maks. 25 MB per file)
        </label>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#4A2022] bg-[#090607] p-5 text-center hover:border-emerald-500/50">
          <UploadCloud className="h-7 w-7 text-[#E5B94C]" />
          <span className="mt-2 text-xs text-stone-300">
            Klik untuk memilih foto (JPG/PNG/WEBP) atau video (MP4/WEBM)
          </span>
          {files.length > 0 && (
            <span className="mt-1 text-xs font-semibold text-[#EF4444]">
              {files.length} file dipilih:{" "}
              {files.map((f) => f.name).join(", ")}
            </span>
          )}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-stone-300">
          Link Google Drive Tambahan (Opsional)
        </label>
        <input
          type="url"
          placeholder="https://drive.google.com/..."
          value={gdriveLink}
          onChange={(e) => setGdriveLink(e.target.value)}
          className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3.5 py-2.5 text-xs text-white"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        <span>
          {submitting
            ? "Mengunggah & Menyinkronkan..."
            : "Kirim Laporan Kontribusi"}
        </span>
      </button>
    </form>
  );
}

export default function NewContributionPage() {
  return (
    <Suspense fallback={<div className="text-stone-400">Memuat formulir...</div>}>
      <NewContributionForm />
    </Suspense>
  );
}