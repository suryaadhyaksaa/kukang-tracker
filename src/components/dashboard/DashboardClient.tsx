"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  CalendarDays,
  CheckCircle2,
  UserCheck,
  Percent,
  Award,
  Image as ImageIcon,
  Filter,
  Activity,
  Trophy,
  Radio,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import type {
  ActivityLog,
  AttendanceRecord,
  ContributionRecord,
  Division,
  KukangEvent,
  Member,
} from "@/types/database";
import { formatJakartaDateTime } from "@/lib/utils";

interface DashboardProps {
  initialMembers: Member[];
  initialEvents: KukangEvent[];
  initialAttendance: AttendanceRecord[];
  initialContributions: ContributionRecord[];
  initialDivisions: Division[];
  initialLogs: ActivityLog[];
  todayWib: string;
}

export function DashboardClient({
  initialMembers,
  initialEvents,
  initialAttendance,
  initialContributions,
  initialDivisions,
  initialLogs,
  todayWib,
}: DashboardProps) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [contributions, setContributions] = useState(initialContributions);
  const [logs, setLogs] = useState(initialLogs);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Filter states
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterMemberName, setFilterMemberName] = useState("");

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("kukang-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance" },
        (payload) => {
          setAttendance((prev) => [payload.new as AttendanceRecord, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contributions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setContributions((prev) => [
              payload.new as ContributionRecord,
              ...prev,
            ]);
          } else if (payload.eventType === "UPDATE") {
            setContributions((prev) =>
              prev.map((c) =>
                c.id === (payload.new as ContributionRecord).id
                  ? { ...c, ...(payload.new as ContributionRecord) }
                  : c
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as ActivityLog, ...prev.slice(0, 14)]);
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered Attendance
  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      if (filterDate && a.attendance_date !== filterDate) return false;
      if (filterMonth && !a.attendance_date.startsWith(filterMonth)) return false;
      if (filterEvent && a.event_id !== filterEvent) return false;
      if (filterDivision && a.division_name_snapshot !== filterDivision) return false;
      if (
        filterPosition &&
        !a.position_snapshot.toLowerCase().includes(filterPosition.toLowerCase())
      )
        return false;
      if (
        filterMemberName &&
        !a.member_name_snapshot
          .toLowerCase()
          .includes(filterMemberName.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    attendance,
    filterDate,
    filterMonth,
    filterEvent,
    filterDivision,
    filterPosition,
    filterMemberName,
  ]);

  // Filtered Contributions
  const filteredContributions = useMemo(() => {
    return contributions.filter((c) => {
      if (filterDate && !c.submitted_at.startsWith(filterDate)) return false;
      if (filterMonth && !c.submitted_at.startsWith(filterMonth)) return false;
      if (filterEvent && c.event_id !== filterEvent) return false;
      const divName =
        initialDivisions.find((d) => d.id === c.division_id)?.name || "";
      if (filterDivision && divName !== filterDivision) return false;
      const memberObj = initialMembers.find((m) => m.id === c.member_id);
      if (
        filterMemberName &&
        !memberObj?.full_name
          .toLowerCase()
          .includes(filterMemberName.toLowerCase())
      )
        return false;
      return true;
    });
  }, [
    contributions,
    filterDate,
    filterMonth,
    filterEvent,
    filterDivision,
    filterMemberName,
    initialDivisions,
    initialMembers,
  ]);

  // KPI Metrics
  const activeMembersCount = initialMembers.filter(
    (m) => ["active", "internship"].includes(String(m.membership_status || ""))
  ).length;
  const totalEventsCount = initialEvents.length;
  const totalAttendanceCount = filteredAttendance.length;
  const presentTodayCount = attendance.filter(
    (a) => a.attendance_date === todayWib
  ).length;

  const expectedTotalSlots = Math.max(
    1,
    activeMembersCount * Math.max(1, totalEventsCount)
  );
  const attendanceRate = Math.min(
    100,
    Math.round((attendance.length / expectedTotalSlots) * 100)
  );

  const totalContributionsCount = filteredContributions.length;
  const totalDocsCount = filteredContributions.reduce(
    (acc, c) => acc + (c.documentation?.length || 0),
    0
  );

  // Chart 1: Kehadiran per Kegiatan / Tanggal
  const attendanceTrendData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredAttendance.forEach((a) => {
      grouped[a.attendance_date] = (grouped[a.attendance_date] || 0) + 1;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([date, hadir]) => ({ date, hadir }));
  }, [filteredAttendance]);

  // Chart 2: Kontribusi berdasarkan Divisi
  const contributionByDivisionData = useMemo(() => {
    const counts: Record<string, number> = {};
    initialDivisions.forEach((d) => {
      counts[d.name] = 0;
    });
    filteredContributions.forEach((c) => {
      const divName =
        initialDivisions.find((d) => d.id === c.division_id)?.name || "Lainnya";
      counts[divName] = (counts[divName] || 0) + 1;
    });
    return Object.entries(counts).map(([divisi, total]) => ({
      divisi: divisi.replace("Technical - ", "").replace("Non-Technical - ", ""),
      total,
    }));
  }, [filteredContributions, initialDivisions]);

  // Daftar Anggota Paling Aktif
  const topActiveMembers = useMemo(() => {
    return initialMembers
      .map((m) => {
        const hadir = attendance.filter((a) => a.member_id === m.id).length;
        const kontribusi = contributions.filter(
          (c) => c.member_id === m.id && c.verification_status === "approved"
        ).length;
        return {
          ...m,
          hadir,
          kontribusi,
          skor: hadir * 10 + kontribusi * 25,
        };
      })
      .sort((a, b) => b.skor - a.skor)
      .slice(0, 5);
  }, [initialMembers, attendance, contributions]);

  const kpiCards = [
    {
      label: "Anggota Aktif",
      value: activeMembersCount,
      icon: Users,
      accent: "text-[#EF4444]",
    },
    {
      label: "Total Kegiatan",
      value: totalEventsCount,
      icon: CalendarDays,
      accent: "text-[#E5B94C]",
    },
    {
      label: "Jumlah Kehadiran",
      value: totalAttendanceCount,
      icon: CheckCircle2,
      accent: "text-[#EF4444]",
    },
    {
      label: "Hadir Hari Ini",
      value: presentTodayCount,
      icon: UserCheck,
      accent: "text-amber-400",
    },
    {
      label: "Tingkat Kehadiran",
      value: `${attendanceRate}%`,
      icon: Percent,
      accent: "text-[#E5B94C]",
    },
    {
      label: "Total Kontribusi",
      value: totalContributionsCount,
      icon: Award,
      accent: "text-amber-400",
    },
    {
      label: "Total Dokumentasi",
      value: totalDocsCount,
      icon: ImageIcon,
      accent: "text-[#EF4444]",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Realtime Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white sm:text-3xl">
            Command Center Dashboard
          </h1>
          <p className="text-sm text-stone-400">
            Pemantauan kehadiran & kontribusi anggota KUKANG EV ITERA secara real-time
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#DC2626]/40 bg-[#9E0B0B]/20 px-3.5 py-1.5 text-xs font-medium text-red-300">
          <Radio
            className={`h-3.5 w-3.5 ${
              isRealtimeConnected ? "animate-pulse text-[#EF4444]" : "text-stone-400"
            }`}
          />
          <span>
            {isRealtimeConnected ? "Supabase Realtime Aktif" : "Menghubungkan Stream..."}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[#3B181A] kukang-card/80 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#E5B94C]">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter Analitik Real-Time</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-stone-200 focus:border-[#C89D3C] focus:outline-none"
            title="Filter Tanggal"
          />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-stone-200 focus:border-[#C89D3C] focus:outline-none"
            title="Filter Bulan"
          />
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-stone-200 focus:border-[#C89D3C] focus:outline-none"
          >
            <option value="">Semua Kegiatan</option>
            {initialEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          <select
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-stone-200 focus:border-[#C89D3C] focus:outline-none"
          >
            <option value="">Semua Divisi</option>
            {initialDivisions.map((div) => (
              <option key={div.id} value={div.name}>
                {div.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter Jabatan..."
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
          />
          <input
            type="text"
            placeholder="Cari Nama Anggota..."
            value={filterMemberName}
            onChange={(e) => setFilterMemberName(e.target.value)}
            className="rounded-xl border border-[#4A2022] bg-[#090607] px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
          />
        </div>
      </div>

      {/* 7 KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#3B181A] kukang-card p-4 transition hover:border-[#DC2626]/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-400">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
              <p className="mt-3 font-heading text-2xl font-bold text-white">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
          <h2 className="font-heading text-base font-semibold text-white">
            Grafik Kehadiran Berdasarkan Periode
          </h2>
          <p className="mb-4 text-xs text-stone-400">
            Jumlah anggota check-in tervalidasi per tanggal kegiatan
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData}>
                <defs>
                  <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3B181A" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#050816",
                    borderColor: "#3B181A",
                    borderRadius: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hadir"
                  stroke="#DC2626"
                  strokeWidth={2.5}
                  fill="url(#emeraldGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
          <h2 className="font-heading text-base font-semibold text-white">
            Grafik Kontribusi Berdasarkan Divisi
          </h2>
          <p className="mb-4 text-xs text-stone-400">
            Distribusi laporan kontribusi lintas divisi Kukang EV
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={contributionByDivisionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3B181A" />
                <XAxis dataKey="divisi" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#050816",
                    borderColor: "#3B181A",
                    borderRadius: "12px",
                  }}
                />
                <Bar dataKey="total" fill="#C89D3C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Aktivitas Terbaru & Anggota Paling Aktif */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#EF4444]" />
            <h2 className="font-heading text-base font-semibold text-white">
              Aktivitas Terbaru (Live)
            </h2>
          </div>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-stone-500">Belum ada aktivitas tercatat.</p>
            ) : (
              logs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[#3B181A] bg-[#090607]/70 p-3"
                >
                  <div>
                    <p className="text-xs font-medium text-stone-200">
                      {log.description}
                    </p>
                    <span className="mt-1 inline-block rounded bg-[#C89D3C]/10 px-2 py-0.5 text-[10px] font-semibold text-[#E5B94C]">
                      {log.action_type}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] text-stone-500">
                    {formatJakartaDateTime(log.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#3B181A] kukang-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <h2 className="font-heading text-base font-semibold text-white">
              Anggota Paling Aktif
            </h2>
          </div>
          <div className="space-y-3">
            {topActiveMembers.length === 0 ? (
              <p className="text-sm text-stone-500">Belum ada data anggota.</p>
            ) : (
              topActiveMembers.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-[#3B181A] bg-[#090607]/70 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 font-heading text-xs font-bold text-amber-400 border border-amber-500/30">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {m.full_name}
                      </p>
                      <p className="text-xs text-stone-400">
                        {m.nim} • {m.position}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold text-[#EF4444]">
                      {m.hadir} Hadir
                    </p>
                    <p className="text-[#E5B94C]">{m.kontribusi} Approved</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}