"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KukangLogo } from "@/components/brand/KukangLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const roleHint = searchParams.get("role");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("Email atau kata sandi salah. Periksa kembali kredensial Anda.");
        setLoading(false);
        return;
      }

      router.push(redirectTarget);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke layanan autentikasi.");
      setLoading(false);
    }
  }

  return (
    <div className="kukang-card w-full max-w-md rounded-2xl p-8 shadow-2xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <KukangLogo showTagline size="lg" />
        <h1 className="mt-6 font-heading text-2xl font-bold text-white">
          {roleHint === "admin" ? "Login Pengurus & Admin" : "Login Anggota Kukang EV"}
        </h1>
        <p className="mt-1 text-xs text-stone-400">
          Gunakan akun resmi ITERA / Kukang EV yang terdaftar di sistem
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-stone-300">
            Alamat Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama.nim@student.itera.ac.id"
              className="w-full rounded-xl border border-[#4A2022] bg-transparent py-2.5 pl-10 pr-4 text-sm text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-stone-300">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-500" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#4A2022] bg-transparent py-2.5 pl-10 pr-4 text-sm text-white placeholder-stone-500 focus:border-[#C89D3C] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#9E0B0B] via-[#B91C1C] to-[#C89D3C] py-3 text-sm font-bold text-white shadow-lg shadow-black/50 transition hover:brightness-110 disabled:opacity-50"
        >
          <span>{loading ? "Memverifikasi..." : "Masuk ke Sistem"}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-stone-400">
        Belum punya akun anggota?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#E5B94C] hover:underline"
        >
          Daftar / Aktivasi Akun
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4 kukang-silk-overlay">
      <Suspense fallback={<div className="text-stone-400">Memuat halaman login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}