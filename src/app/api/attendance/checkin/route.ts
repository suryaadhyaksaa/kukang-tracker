import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Sesi login berakhir. Silakan login kembali sebelum melakukan absensi." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body.token || body.qr_token || body.code || "").trim();
    const eventId = String(body.event_id || body.eventId || "").trim();

    if (!token && !eventId) {
      return NextResponse.json(
        { error: "Token QR atau ID kegiatan tidak valid." },
        { status: 400 }
      );
    }

    const adminDb = createAdminSupabase();
    const user = session.user;

    // 1. Ambil atau sinkronkan data profil & anggota secara otomatis
    const { data: profile } = await adminDb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    let { data: member } = await adminDb
      .from("members")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();

    // Jika akun belum tertaut di tabel members, tautkan / buat otomatis dari profil
    if (!member) {
      const nimFromProfile = profile?.nim || user.user_metadata?.nim || null;
      if (nimFromProfile) {
        const { data: existingByNim } = await adminDb
          .from("members")
          .select("*")
          .eq("nim", String(nimFromProfile))
          .maybeSingle();

        if (existingByNim) {
          const { data: linked } = await adminDb
            .from("members")
            .update({ profile_id: user.id })
            .eq("id", existingByNim.id)
            .select("*")
            .single();
          member = linked || existingByNim;
        }
      }

      if (!member) {
        const initialStatus =
          user.user_metadata?.membership_status === "internship"
            ? "internship"
            : "active";

        const { data: createdMember, error: createMemberErr } = await adminDb
          .from("members")
          .insert({
            profile_id: user.id,
            full_name:
              profile?.full_name ||
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "Anggota Kukang EV",
            nim: String(nimFromProfile || `NIM-${user.id.slice(0, 8)}`),
            angkatan: Number(profile?.angkatan || user.user_metadata?.angkatan || 2024),
            division_id: profile?.division_id || user.user_metadata?.division_id || null,
            phone: profile?.phone || user.user_metadata?.phone || null,
            membership_status: initialStatus,
          })
          .select("*")
          .single();

        if (createMemberErr || !createdMember) {
          return NextResponse.json(
            { error: "Data anggota belum sinkron. Hubungi pengurus untuk aktivasi akun." },
            { status: 404 }
          );
        }
        member = createdMember;
      }
    }

    // 2. Pastikan status keanggotaan otomatis aktif / internship (tidak pernah kosong)
    let memberStatus = String(member.membership_status || "").toLowerCase();
    if (!memberStatus || memberStatus === "inactive") {
      memberStatus =
        user.user_metadata?.membership_status === "internship"
          ? "internship"
          : "active";

      await adminDb
        .from("members")
        .update({ membership_status: memberStatus })
        .eq("id", member.id);
    }

    if (memberStatus !== "active" && memberStatus !== "internship") {
      return NextResponse.json(
        { error: `Status keanggotaan Anda (${memberStatus}) tidak dapat melakukan absensi.` },
        { status: 403 }
      );
    }

    // 3. Cari data kegiatan berdasarkan token QR atau ID kegiatan
    let eventQuery = adminDb.from("events").select("*");
    if (token) {
      eventQuery = eventQuery.eq("qr_token", token);
    } else {
      eventQuery = eventQuery.eq("id", eventId);
    }

    const { data: event, error: eventErr } = await eventQuery.maybeSingle();

    if (eventErr || !event) {
      return NextResponse.json(
        { error: "QR Code kegiatan tidak ditemukan atau sudah tidak berlaku." },
        { status: 404 }
      );
    }

    if (event.status === "completed") {
      return NextResponse.json(
        { error: "Sesi absensi untuk kegiatan ini sudah ditutup." },
        { status: 400 }
      );
    }

    // 4. Validasi ketetapan peserta kegiatan (Semua / Anggota Tetap / Anggota Magang)
    const targetMembership = String(event.target_membership || "all").toLowerCase();
    if (targetMembership === "active" && memberStatus !== "active") {
      return NextResponse.json(
        { error: "Kegiatan ini dikhususkan bagi Anggota Tetap / Aktif KUKANG EV." },
        { status: 403 }
      );
    }
    if (targetMembership === "internship" && memberStatus !== "internship") {
      return NextResponse.json(
        { error: "Kegiatan ini dikhususkan bagi Anggota Magang / Internship KUKANG EV." },
        { status: 403 }
      );
    }

    // 5. Cegah duplikasi absensi pada kegiatan yang sama
    const { data: existingAttendance } = await adminDb
      .from("attendance")
      .select("id, check_in_time")
      .eq("event_id", event.id)
      .eq("member_id", member.id)
      .maybeSingle();

    if (existingAttendance) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        message: `Kehadiran Anda pada "${event.title}" sudah tercatat sebelumnya.`,
        attendance: existingAttendance,
      });
    }

    // 6. Simpan otomatis data absensi ke Supabase
    const nowIso = new Date().toISOString();
    let { data: inserted, error: insertErr } = await adminDb
      .from("attendance")
      .insert({
        event_id: event.id,
        member_id: member.id,
        check_in_time: nowIso,
        member_status_snapshot: memberStatus,
      })
      .select("*")
      .single();

    // Fallback otomatis jika kolom snapshot belum ada di skema lama
    if (insertErr && insertErr.message?.includes("member_status_snapshot")) {
      const retry = await adminDb
        .from("attendance")
        .insert({
          event_id: event.id,
          member_id: member.id,
          check_in_time: nowIso,
        })
        .select("*")
        .single();
      inserted = retry.data;
      insertErr = retry.error;
    }

    if (insertErr) {
      return NextResponse.json(
        { error: `Gagal mencatat absensi: ${insertErr.message}` },
        { status: 500 }
      );
    }

    // 7. Catat riwayat aktivitas secara otomatis (opsional, non-blocking)
    await adminDb
      .from("activity_logs")
      .insert({
        user_id: user.id,
        action: "ATTENDANCE_CHECKIN",
        description: `${member.full_name} (${
          memberStatus === "internship" ? "Magang" : "Anggota Tetap"
        }) check-in pada ${event.title}`,
      })
      .then(() => null, () => null);

    return NextResponse.json({
      success: true,
      message: `Check-in berhasil! Kehadiran Anda pada "${event.title}" telah tersimpan.`,
      attendance: inserted,
      data: inserted,
    });
  } catch (err) {
    console.error("[AUTO_CHECKIN_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi gangguan server saat memproses absensi." },
      { status: 500 }
    );
  }
}