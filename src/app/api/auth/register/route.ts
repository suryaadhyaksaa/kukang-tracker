import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { writeActivityLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = String(body?.full_name || "").trim();
    const nim = String(body?.nim || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const phone = body?.phone ? String(body.phone).trim() : null;
    const angkatan = Number(body?.angkatan || new Date().getFullYear());
    const divisionId = body?.division_id ? String(body.division_id) : null;

    if (!fullName || !nim || !email || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Nama lengkap, NIM, email, dan password (minimal 6 karakter) wajib diisi.",
        },
        { status: 400 }
      );
    }

    const adminDb = createAdminSupabase();

    // Cek apakah NIM sudah tertaut dengan akun aktif lain
    const { data: existingByNim } = await adminDb
      .from("members")
      .select("id, profile_id, position, division_id")
      .eq("nim", nim)
      .maybeSingle();

    if (existingByNim?.profile_id) {
      return NextResponse.json(
        {
          error:
            "NIM ini sudah memiliki akun terdaftar. Silakan langsung masuk melalui halaman Login.",
        },
        { status: 409 }
      );
    }

    // Buat akun user di Supabase Auth
    const { data: createdAuth, error: authError } =
      await adminDb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: "member",
        },
      });

    if (authError || !createdAuth.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ||
            "Gagal membuat akun. Pastikan email belum digunakan.",
        },
        { status: 400 }
      );
    }

    const newUserId = createdAuth.user.id;

    // Tautkan atau buat data di Master Data Anggota (members)
    if (existingByNim) {
      await adminDb
        .from("members")
        .update({
          profile_id: newUserId,
          full_name: fullName,
          email,
          phone: phone || undefined,
          division_id: existingByNim.division_id || divisionId,
        })
        .eq("id", existingByNim.id);
    } else {
      await adminDb.from("members").upsert(
        {
          profile_id: newUserId,
          nim,
          full_name: fullName,
          email,
          phone,
          angkatan,
          division_id: divisionId,
          position: "Staff",
          membership_status: body.membership_status === "internship" ? "internship" : "active",
        },
        { onConflict: "email" }
      );
    }

    await writeActivityLog({
      actorProfileId: newUserId,
      actorName: fullName,
      actorRole: "member",
      actionType: "MEMBER_REGISTERED",
      entityType: "members",
      description: `Anggota baru mendaftarkan akun: ${fullName} (NIM: ${nim})`,
      metadata: { nim, email, angkatan },
    });

    return NextResponse.json({
      success: true,
      message: "Pendaftaran akun berhasil!",
    });
  } catch (err) {
    console.error("[REGISTER_API_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses pendaftaran." },
      { status: 500 }
    );
  }
}