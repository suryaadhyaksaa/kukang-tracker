import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getJakartaNow } from "@/lib/utils";
import { writeActivityLog } from "@/lib/audit";
import { syncRowToExcelOnline } from "@/lib/excel/graph-client";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sesi tidak valid. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const qrToken = String(body?.qr_token || "").trim();

    if (!qrToken) {
      return NextResponse.json(
        { error: "Token QR kegiatan tidak ditemukan." },
        { status: 400 }
      );
    }

    const adminDb = createAdminSupabase();

    // 1. Ambil profil & data anggota terverifikasi dari akun login (anti-spoofing)
    const { data: profile } = await adminDb
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_active) {
      return NextResponse.json(
        { error: "Akun pengguna tidak aktif atau tidak ditemukan." },
        { status: 403 }
      );
    }

    const { data: member } = await adminDb
      .from("members")
      .select("*, divisions(name)")
      .eq("profile_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        {
          error:
            "Akun Anda belum tertaut ke Master Data Anggota Kukang EV. Hubungi Admin untuk menautkan NIM/Email Anda.",
        },
        { status: 403 }
      );
    }

    if (member.membership_status !== "active") {
      return NextResponse.json(
        { error: "Status keanggotaan Anda tidak aktif." },
        { status: 403 }
      );
    }

    // 2. Validasi Event & QR Code
    const { data: event } = await adminDb
      .from("events")
      .select("*")
      .eq("qr_token", qrToken)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "QR Code tidak dikenali atau kegiatan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (event.is_qr_manually_disabled) {
      return NextResponse.json(
        { error: "QR Code absensi telah dinonaktifkan secara manual oleh Admin." },
        { status: 403 }
      );
    }

    if (event.status === "completed") {
      return NextResponse.json(
        { error: "Kegiatan ini sudah berstatus Completed." },
        { status: 403 }
      );
    }

    // 3. Validasi Rentang Waktu QR di Server (Zona Waktu Asia/Jakarta)
    const serverNow = getJakartaNow();
    const activeFromMs = new Date(event.qr_active_from).getTime();
    const activeUntilMs = new Date(event.qr_active_until).getTime();

    if (serverNow.epochMs < activeFromMs) {
      return NextResponse.json(
        { error: "Sesi absensi QR Code belum dibuka oleh Admin." },
        { status: 403 }
      );
    }

    if (serverNow.epochMs > activeUntilMs) {
      return NextResponse.json(
        { error: "QR Code absensi sudah kedaluwarsa." },
        { status: 403 }
      );
    }

    // 4. Cek Duplikasi Kehadiran
    const { data: existingAttendance } = await adminDb
      .from("attendance")
      .select("id, check_in_time")
      .eq("member_id", member.id)
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingAttendance) {
      return NextResponse.json(
        {
          error: "Anda sudah melakukan check-in pada kegiatan ini sebelumnya.",
          attendance_id: existingAttendance.id,
        },
        { status: 409 }
      );
    }

    // Tentukan status present vs late (toleransi 15 menit setelah start_time)
    const eventStartMs = new Date(event.start_time).getTime();
    const isLate = serverNow.epochMs > eventStartMs + 15 * 60 * 1000;
    const attendanceStatus = isLate ? "late" : "present";
    const divisionName =
      (member.divisions as { name?: string } | null)?.name || "Umum";

    // 5. Simpan Kehadiran ke PostgreSQL
    const { data: insertedAttendance, error: insertError } = await adminDb
      .from("attendance")
      .insert({
        member_id: member.id,
        event_id: event.id,
        nim_snapshot: member.nim,
        member_name_snapshot: member.full_name,
        position_snapshot: member.position,
        division_name_snapshot: divisionName,
        event_title_snapshot: event.title,
        attendance_date: serverNow.date,
        check_in_time: serverNow.iso,
        status: attendanceStatus,
        check_in_method: "qr_scan",
        excel_sync_status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Duplikasi check-in terdeteksi oleh database." },
          { status: 409 }
        );
      }
      throw insertError;
    }

    // 6. Catat Audit Log
    await writeActivityLog({
      actorProfileId: user.id,
      actorName: member.full_name,
      actorRole: profile.role,
      actionType: "CHECK_IN",
      entityType: "attendance",
      entityId: insertedAttendance.id,
      description: `${member.full_name} (${member.nim}) melakukan check-in pada kegiatan "${event.title}" (${serverNow.time})`,
      metadata: {
        event_id: event.id,
        nim: member.nim,
        status: attendanceStatus,
      },
    });

    // 7. Sinkronisasi Otomatis ke Microsoft Excel Online (AttendanceTable)
    const syncResult = await syncRowToExcelOnline({
      idempotencyKey: `attendance:${insertedAttendance.id}:insert`,
      targetTable: "AttendanceTable",
      recordId: insertedAttendance.id,
      sourceTableToUpdate: "attendance",
      rowValues: [
        insertedAttendance.id,
        member.id,
        member.nim,
        member.full_name,
        member.position,
        divisionName,
        event.id,
        event.title,
        serverNow.date,
        serverNow.time,
        attendanceStatus,
        serverNow.iso,
      ],
      payloadObject: {
        attendance_id: insertedAttendance.id,
        nim: member.nim,
        member_name: member.full_name,
        event_title: event.title,
        check_in_time_wib: serverNow.time,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Check-in berhasil dicatat!",
      attendance: insertedAttendance,
      jakarta_time: serverNow.time,
      excel_sync: syncResult,
    });
  } catch (err) {
    console.error("[CHECKIN_API_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat memproses absensi." },
      { status: 500 }
    );
  }
}