"use client";

import React, { createContext, useContext } from "react";
import type { UserRole } from "@/types/database";

export interface CurrentUserState {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

const UserContext = createContext<CurrentUserState | null>(null);

export function UserProvider({
  value,
  children,
}: {
  value: CurrentUserState;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): CurrentUserState {
  const ctx = useContext(UserContext);
  if (!ctx) {
    return {
      userId: "",
      email: "",
      fullName: "Anggota Kukang EV",
      role: "member",
    };
  }
  return ctx;
}