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
      .select("*, divisions(name)")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!member) {
      const nimFromProfile = profile?.nim || user.user_metadata?.nim || null;
      if (nimFromProfile) {
        const { data: existingByNim } = await adminDb
          .from("members")
          .select("*, divisions(name)")
          .eq("nim", String(nimFromProfile))
          .maybeSingle();

        if (existingByNim) {
          const { data: linked } = await adminDb
            .from("members")
            .update({ profile_id: user.id })
            .eq("id", existingByNim.id)
            .select("*, divisions(name)")
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
          .select("*, divisions(name)")
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

    // 2. Pastikan status keanggotaan aktif / internship
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

    // 6. Simpan data absensi beserta nim_snapshot & member_status_snapshot
    const nowIso = new Date().toISOString();
    const divisionObj = member.divisions as { name?: string } | null;
    const resolvedNim = String(member.nim || profile?.nim || "-");
    const resolvedName = String(member.full_name || profile?.full_name || "Anggota");
    const resolvedDivision = String(divisionObj?.name || "-");

    const insertPayload: Record<string, unknown> = {
      event_id: event.id,
      member_id: member.id,
      check_in_time: nowIso,
      nim_snapshot: resolvedNim,
      member_name_snapshot: resolvedName,
      division_name_snapshot: resolvedDivision,
      member_status_snapshot: memberStatus,
      event_title_snapshot: String(event.title || "-"),
      event_date_snapshot: String(event.event_date || nowIso.slice(0, 10)),
    };

    let inserted = null;
    let insertErr = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const res = await adminDb
        .from("attendance")
        .insert(insertPayload)
        .select("*")
        .single();

      inserted = res.data;
      insertErr = res.error;

      if (!insertErr) break;

      // Jika ada kolom opsional yang belum ada di tabel, hapus dari payload lalu coba lagi
      const missingColMatch = insertErr.message?.match(/column "([^"]+)" of relation "attendance" does not exist/i);
      if (missingColMatch) {
        delete insertPayload[missingColMatch[1]];
        continue;
      }

      // Jika ada kolom snapshot NOT NULL lain di tabel, isi otomatis lalu coba lagi
      const nullColMatch = insertErr.message?.match(/null value in column "([^"]+)" of relation "attendance"/i);
      if (nullColMatch) {
        const col = nullColMatch[1];
        if (col.includes("nim")) insertPayload[col] = resolvedNim;
        else if (col.includes("name")) insertPayload[col] = resolvedName;
        else if (col.includes("division")) insertPayload[col] = resolvedDivision; else if (col.includes("title")) insertPayload[col] = String(event.title || "-"); else if (col.includes("date")) insertPayload[col] = String(event.event_date || nowIso.slice(0, 10));
        else insertPayload[col] = "-";
        continue;
      }

      break;
    }

    if (insertErr) {
      return NextResponse.json(
        { error: `Gagal mencatat absensi: ${insertErr.message}` },
        { status: 500 }
      );
    }

    // 7. Catat riwayat aktivitas secara otomatis
    await adminDb
      .from("activity_logs")
      .insert({
        user_id: user.id,
        action: "ATTENDANCE_CHECKIN",
        description: `${resolvedName} (${resolvedNim}) melakukan check-in pada kegiatan "${event.title}"`,
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