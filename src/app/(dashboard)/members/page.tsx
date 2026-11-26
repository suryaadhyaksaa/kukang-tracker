"use client";

import React, { useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  Trash2,
  Upload,
  Download,
  Layers,
  CheckCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { getCachedData, setCachedData } from "@/lib/cache";
import type { Division, Member } from "@/types/database";

export default function MembersMasterPage() {
  const supabase = createClient();
  const cachedMem = getCachedData<{ members: Member[]; divisions: Division[] }>("members-page"); const [members, setMembers] = useState<Member[]>(cachedMem?.members || []);
  const [divisions, setDivisions] = useState<Division[]>(cachedMem?.divisions || []);
  const [search, setSearch] = useState("");
  const [selectedDiv, setSelectedDiv] = useState("");

  // Form tambah anggota
  const [nim, setNim] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [angkatan, setAngkatan] = useState(2023);
  const [divisionId, setDivisionId] = useState("");
  const [position, setPosition] = useState("Staff");

  // Form tambah divisi
  const [newDivisionName, setNewDivisionName] = useState("");
  const [newDivisionCat, setNewDivisionCat] = useState("Technical");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadData() {
    const [{ data: mData }, { data: dData }] = await Promise.all([
      supabase.from("members").select("*, divisions(*)").order("nim"),
      supabase.from("divisions").select("*").order("name"),
    ]);
    setMembers((mData as Member[]) || []);
    const nextDivs = (dData as Division[]) || []; setDivisions(nextDivs); setCachedData("members-page", { members: (mData as Member[]) || [], divisions: nextDivs });
    if (dData && dData.length > 0 && !divisionId) {
      setDivisionId(dData[0].id);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("members").insert({
      nim: nim.trim(),
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      angkatan: Number(angkatan),
      division_id: divisionId || null,
      position: position.trim(),
      membership_status: "active",
    });

    if (error) {
      setFeedback(`Gagal menambahkan anggota: ${error.message}`);
      return;
    }

    setNim("");
    setFullName("");
    setEmail("");
    setPhone("");
    setFeedback("Anggota berhasil ditambahkan ke Master Data.");
    loadData();
  }

  async function handleAddDivision(e: React.FormEvent) {
    e.preventDefault();
    if (!newDivisionName.trim()) return;
    const { error } = await supabase.from("divisions").insert({
      name: newDivisionName.trim(),
      category: newDivisionCat,
    });
    if (!error) {
      setNewDivisionName("");
      setFeedback("Divisi baru berhasil dikonfigurasi.");
      loadData();
    }
  }

  async function handleDeleteMember(id: string) {
    if (!confirm("Hapus anggota ini dari Master Data?")) return;
    await supabase.from("members").delete().eq("id", id);
    loadData();
  }

  function handleExportMembers() {
    const rows = members.map((m) => ({
      NIM: m.nim,
      Nama_Lengkap: m.full_name,
      Email: m.email,
      No_HP: m.phone || "",
      Angkatan: m.angkatan,
      Divisi: m.divisions?.name || "",
      Jabatan: m.position,
      Status: m.membership_status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master_Anggota");
    XLSX.writeFile(wb, "Master_Anggota_KukangEV.xlsx");
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    const formatted = jsonRows
      .filter((r) => r.NIM && r.Nama_Lengkap && r.Email)
      .map((r) => {
        const matchedDiv = divisions.find(
          (d) =>
            d.name.toLowerCase() === String(r.Divisi || "").toLowerCase()
        );
        return {
          nim: String(r.NIM).trim(),
          full_name: String(r.Nama_Lengkap).trim(),
          email: String(r.Email).trim().toLowerCase(),
          phone: r.No_HP ? String(r.No_HP).trim() : null,
          angkatan: Number(r.Angkatan || 2023),
          division_id: matchedDiv?.id || divisions[0]?.id || null,
          position: String(r.Jabatan || "Staff").trim(),
          membership_status: "active",
        };
      });

    if (formatted.length > 0) {
      const { error } = await supabase
        .from("members")
        .upsert(formatted, { onConflict: "nim" });
      if (!error) {
        setFeedback(`Berhasil mengimpor ${formatted.length} data anggota.`);
        loadData();
      }
    }
  }

  const filteredMembers = members.filter((m) => {
    if (selectedDiv && m.division_id !== selectedDiv) return false;
    if (
      search &&
      !m.full_name.toLowerCase().includes(search.toLowerCase()) &&
      !m.nim.includes(search)
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">
            Master Data Anggota & Divisi
          </h1>
          <p className="text-sm text-stone-400">
            Kelola direktori anggota resmi KUKANG EV ITERA
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#C89D3C]/45 bg-[#C89D3C]/15 px-4 py-2 text-xs font-semibold text-[#F5D06F] hover:bg-[#C89D3C]/25">
            <Upload className="h-4 w-4" />
            <span>Import Excel/CSV</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportMembers}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
          >
            <Download className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl border border-[#DC2626]/40 bg-[#9E0B0B]/20 px-4 py-3 text-xs text-red-300">
          <CheckCircle className="h-4 w-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Forms Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleAddMember}
          className="lg:col-span-2 rounded-2xl border border-[#3B181A] kukang-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-[#EF4444]">
            <UserPlus className="h-4 w-4" />
            <h2 className="font-heading text-base font-semibold text-white">
              Tambah Anggota Baru
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              required
              placeholder="NIM (cth: 121140001)"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            />
            <input
              required
              placeholder="Nama Lengkap"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            />
            <input
              required
              type="email"
              placeholder="Email ITERA"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="No. HP (Opsional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            />
            <input
              required
              type="number"
              placeholder="Angkatan"
              value={angkatan}
              onChange={(e) => setAngkatan(Number(e.target.value))}
              className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            />
            <select
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value)}
              className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Jabatan (cth: Head of Powertrain)"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="sm:col-span-2 rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-[#9E0B0B] to-[#C81E1E] px-4 py-2 text-xs font-bold text-white hover:brightness-110"
            >
              Simpan Anggota
            </button>
          </div>
        </form>

        <form
          onSubmit={handleAddDivision}
          className="rounded-2xl border border-[#3B181A] kukang-card p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <Layers className="h-4 w-4" />
            <h2 className="font-heading text-base font-semibold text-white">
              Konfigurasi Divisi
            </h2>
          </div>
          <input
            required
            placeholder="Nama Divisi Baru"
            value={newDivisionName}
            onChange={(e) => setNewDivisionName(e.target.value)}
            className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
          />
          <select
            value={newDivisionCat}
            onChange={(e) => setNewDivisionCat(e.target.value)}
            className="w-full rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
          >
            <option value="Technical">Technical Team</option>
            <option value="Non-Technical">Non-Technical Team</option>
            <option value="Management">Administrasi & Principals</option>
          </select>
          <button
            type="submit"
            className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
          >
            Tambah Divisi
          </button>
        </form>
      </div>

      {/* Table Filter & Directory */}
      <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
            <input
              placeholder="Cari NIM atau nama anggota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[#4A2022] bg-[#090607] py-2 pl-9 pr-3 text-xs text-white"
            />
          </div>
          <select
            value={selectedDiv}
            onChange={(e) => setSelectedDiv(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-white"
          >
            <option value="">Semua Divisi</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#3B181A] text-stone-400">
              <tr>
                <th className="py-3 px-3">NIM</th>
                <th className="py-3 px-3">Nama Lengkap</th>
                <th className="py-3 px-3">Divisi</th>
                <th className="py-3 px-3">Jabatan</th>
                <th className="py-3 px-3">Angkatan</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3B181A]/60">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-stone-800/30">
                  <td className="py-3 px-3 font-mono text-[#E5B94C]">{m.nim}</td>
                  <td className="py-3 px-3 font-medium text-white">
                    {m.full_name}
                    <div className="text-[11px] text-stone-500">{m.email}</div>
                  </td>
                  <td className="py-3 px-3 text-stone-300">
                    {m.divisions?.name || "-"}
                  </td>
                  <td className="py-3 px-3 text-stone-300">{m.position}</td>
                  <td className="py-3 px-3 text-stone-400">{m.angkatan}</td>
                  <td className="py-3 px-3">
                    <span className="rounded-full bg-[#9E0B0B]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#EF4444]">
                      {m.membership_status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteMember(m.id)}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/15"
                      title="Hapus Anggota"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}