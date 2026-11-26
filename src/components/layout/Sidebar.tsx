"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  QrCode,
  FileCheck2,
  UserCircle,
  FileSpreadsheet,
  Download,
  History,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { KukangLogo } from "@/components/brand/KukangLogo";
import { createClient } from "@/lib/supabase/client";
import { clearCachedData } from "@/lib/cache";
import type { UserRole } from "@/types/database";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "admin", "member"],
  },
  {
    label: "Scan QR Absensi",
    href: "/scan",
    icon: QrCode,
    roles: ["super_admin", "admin", "member"],
  },
  {
    label: "Manajemen Kegiatan",
    href: "/events",
    icon: CalendarDays,
    roles: ["super_admin", "admin", "member"],
  },
  {
    label: "Kontribusi & Dokumentasi",
    href: "/contributions",
    icon: FileCheck2,
    roles: ["super_admin", "admin", "member"],
  },
  {
    label: "Master Data Anggota",
    href: "/members",
    icon: Users,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Integrasi Excel Online",
    href: "/integrations/excel",
    icon: FileSpreadsheet,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Export & Laporan",
    href: "/reports",
    icon: Download,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Activity Log",
    href: "/activity-logs",
    icon: History,
    roles: ["super_admin", "admin"],
  },
  {
    label: "Profil Saya",
    href: "/profile",
    icon: UserCircle,
    roles: ["super_admin", "admin", "member"],
  },
];

export function Sidebar({
  role,
  userName,
}: {
  role: UserRole;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [optimisticPath, setOptimisticPath] = useState(pathname);

  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  useEffect(() => {
    setOptimisticPath(pathname);
  }, [pathname]);

  useEffect(() => {
    allowedItems.forEach((item) => {
      router.prefetch(item.href);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function navigateInstant(e: React.SyntheticEvent, href: string) {
    e.preventDefault();
    setMobileOpen(false);
    if (href === pathname) return;
    setOptimisticPath(href);
    startTransition(() => {
      router.push(href);
    });
  }

  async function handleLogout() {
    clearCachedData();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[#0A0607]/95 border-r border-[#3B181A] px-4 py-6">
      <div className="space-y-6 overflow-y-auto pr-1">
        <div className="flex items-center justify-between px-2">
          <Link
            href="/dashboard"
            prefetch={true}
            onPointerDown={(e) => navigateInstant(e, "/dashboard")}
            onClick={(e) => e.preventDefault()}
          >
            <KukangLogo showTagline />
          </Link>
          <button
            type="button"
            onPointerDown={() => setMobileOpen(false)}
            className="lg:hidden rounded-lg p-2 text-stone-400 hover:bg-[#1E0E10]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const active =
              optimisticPath === item.href ||
              optimisticPath.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onPointerDown={(e) => navigateInstant(e, item.href)}
                onClick={(e) => e.preventDefault()}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-gradient-to-r from-[#9E0B0B]/45 via-[#4A1517]/40 to-[#C89D3C]/20 text-[#F5D06F] border border-[#C89D3C]/50 shadow-sm"
                    : "text-stone-400 hover:bg-[#1A0D0E] hover:text-stone-100"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    active ? "text-[#E5B94C]" : "text-stone-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-[#3B181A] pt-4">
        <div className="kukang-card rounded-xl p-3">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#E5B94C] mt-0.5">
            {role.replace("_", " ")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#9E0B0B]/50 bg-[#9E0B0B]/20 px-3.5 py-2.5 text-sm font-semibold text-red-300 hover:bg-[#9E0B0B]/35"
        >
          <LogOut className="h-4 w-4" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  const isDashActive = optimisticPath === "/dashboard";
  const isEventsActive = optimisticPath.startsWith("/events");
  const isScanActive = optimisticPath.startsWith("/scan");
  const isContribActive = optimisticPath.startsWith("/contributions");

  return (
    <>
      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-[#1A0D0E] overflow-hidden">
          <div className="h-full w-3/4 animate-pulse bg-gradient-to-r from-[#9E0B0B] via-[#E5B94C] to-[#DC2626]" />
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#3B181A] bg-transparent px-4 py-2.5 pt-safe lg:hidden">
        <Link
          href="/dashboard"
          onPointerDown={(e) => navigateInstant(e, "/dashboard")}
          onClick={(e) => e.preventDefault()}
        >
          <KukangLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#C89D3C]/35 bg-[#1A0B0D] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#E5B94C]">
            {role.replace("_", " ")}
          </span>
          <button
            type="button"
            onPointerDown={() => setMobileOpen(true)}
            className="rounded-xl border border-[#3B181A] bg-[#160B0C] p-2 text-stone-200"
            aria-label="Buka Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
        {SidebarContent}
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#3B181A] bg-[#0B0607] pb-safe lg:hidden">
        <div className="grid grid-cols-5 items-center px-1 py-1.5">
          <Link
            href="/dashboard"
            prefetch={true}
            onPointerDown={(e) => navigateInstant(e, "/dashboard")}
            onClick={(e) => e.preventDefault()}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium ${
              isDashActive ? "text-[#E5B94C]" : "text-stone-400"
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Home</span>
          </Link>

          <Link
            href="/events"
            prefetch={true}
            onPointerDown={(e) => navigateInstant(e, "/events")}
            onClick={(e) => e.preventDefault()}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium ${
              isEventsActive ? "text-[#E5B94C]" : "text-stone-400"
            }`}
          >
            <CalendarDays className="h-5 w-5" />
            <span>Kegiatan</span>
          </Link>

          <Link
            href="/scan"
            prefetch={true}
            onPointerDown={(e) => navigateInstant(e, "/scan")}
            onClick={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center -mt-5"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-md ${
                isScanActive
                  ? "border-[#F5D06F] bg-gradient-to-br from-[#C89D3C] to-[#9E0B0B] text-white"
                  : "border-[#C89D3C]/60 bg-gradient-to-br from-[#9E0B0B] via-[#B91C1C] to-[#7F1D1D] text-white"
              }`}
            >
              <QrCode className="h-6 w-6" />
            </div>
            <span
              className={`mt-1 text-[10px] font-semibold ${
                isScanActive ? "text-[#E5B94C]" : "text-stone-300"
              }`}
            >
              Scan QR
            </span>
          </Link>

          <Link
            href="/contributions"
            prefetch={true}
            onPointerDown={(e) => navigateInstant(e, "/contributions")}
            onClick={(e) => e.preventDefault()}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium ${
              isContribActive ? "text-[#E5B94C]" : "text-stone-400"
            }`}
          >
            <FileCheck2 className="h-5 w-5" />
            <span>Kontribusi</span>
          </Link>

          <button
            type="button"
            onPointerDown={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium text-stone-400"
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/80"
            onPointerDown={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw]">{SidebarContent}</div>
        </div>
      )}
    </>
  );
}