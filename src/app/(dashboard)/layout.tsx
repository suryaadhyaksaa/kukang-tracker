import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserProvider } from "@/components/providers/UserProvider";
import type { UserRole } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) || "member";
  const userName = profile?.full_name || user.email || "Anggota Kukang EV";

  return (
    <UserProvider
      value={{
        userId: user.id,
        email: user.email || "",
        fullName: userName,
        role,
      }}
    >
      <div className="min-h-screen bg-transparent">
        <Sidebar role={role} userName={userName} />
        <main className="lg:pl-72 pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 animate-page-enter">
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  );
}