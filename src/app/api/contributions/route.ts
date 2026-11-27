import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = createAdminSupabase();
    const { data, error } = await adminDb
      .from("contributions")
      .select(`
        *,
        members (
          full_name,
          nim,
          divisions ( name )
        ),
        events (
          id,
          title,
          event_date
        ),
        documentation ( * )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Gagal memuat data kontribusi: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      contributions: data || [],
      data: data || [],
    });
  } catch (err) {
    console.error("[GET_CONTRIBUTIONS_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data kontribusi." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sesi login berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      event_id,
      role_in_event,
      category,
      division_id,
      work_description,
      work_output,
      gdrive_link,
      uploaded_files,
    } = body;

    if (!event_id || !String(event_id).trim()) {
      return NextResponse.json(
        { error: "Kegiatan terkait wajib dipilih." },
        { status: 400 }
      );
    }

    if (!category || !String(category).trim()) {
      return NextResponse.json(
        { error: "Divisi / kategori kontribusi wajib dipilih." },
        { status: 400 }
      );
    }

    if (!role_in_event || !work_description || !work_output) {
      return NextResponse.json(
        { error: "Peran, deskripsi pekerjaan, dan hasil output wajib diisi." },
        { status: 400 }
      );
    }

    const adminDb = createAdminSupabase();

    // 1. Ambil profil & data anggota
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

    if (!member) {
      const nimFallback = profile?.nim || user.user_metadata?.nim || `NIM-${user.id.slice(0, 8)}`;
      const { data: createdMember, error: memberErr } = await adminDb
        .from("members")
        .insert({
          profile_id: user.id,
          full_name:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Anggota Kukang EV",
          nim: String(nimFallback),
          angkatan: Number(profile?.angkatan || user.user_metadata?.angkatan || 2024),
          division_id: profile?.division_id || null,
          membership_status:
            user.user_metadata?.membership_status === "internship" ? "internship" : "active",
        })
        .select("*")
        .single();

      if (memberErr || !createdMember) {
        return NextResponse.json(
          { error: "Data anggota tidak ditemukan di sistem." },
          { status: 404 }
        );
      }
      member = createdMember;
    }

    // 2. Validasi kegiatan & cocokkan division_id dari 12 divisi
    const { data: event, error: eventErr } = await adminDb
      .from("events")
      .select("id, title")
      .eq("id", String(event_id).trim())
      .maybeSingle();

    if (eventErr || !event) {
      return NextResponse.json(
        { error: "Kegiatan yang dipilih tidak ditemukan." },
        { status: 404 }
      );
    }

    let resolvedDivisionId: string | null = division_id ? String(division_id) : null;
    if (!resolvedDivisionId) {
      const { data: matchedDiv } = await adminDb
        .from("divisions")
        .select("id")
        .ilike("name", String(category).trim())
        .maybeSingle();
      resolvedDivisionId = matchedDiv?.id || member.division_id || null;
    }

    // 3. Simpan laporan kontribusi ke Supabase
    const payload: Record<string, unknown> = {
      event_id: event.id,
      member_id: member.id,
      role_in_event: String(role_in_event).trim(),
      category: String(category).trim(),
      division_id: resolvedDivisionId,
      work_description: String(work_description).trim(),
      work_output: String(work_output).trim(),
      gdrive_link: gdrive_link ? String(gdrive_link).trim() : null,
    };

    let { data: contribution, error: insertErr } = await adminDb
      .from("contributions")
      .insert(payload)
      .select("*")
      .single();

    if (insertErr && insertErr.message?.includes("division_id")) {
      delete payload.division_id;
      const retry = await adminDb
        .from("contributions")
        .insert(payload)
        .select("*")
        .single();
      contribution = retry.data;
      insertErr = retry.error;
    }

    if (insertErr || !contribution) {
      return NextResponse.json(
        { error: `Gagal menyimpan kontribusi: ${insertErr?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // 4. Simpan metadata file dokumentasi jika ada
    if (Array.isArray(uploaded_files) && uploaded_files.length > 0) {
      const docRows = uploaded_files.map((f: Record<string, unknown>) => ({
        contribution_id: contribution.id,
        file_name: String(f.file_name || "dokumentasi"),
        file_type: String(f.file_type || "image"),
        mime_type: String(f.mime_type || "application/octet-stream"),
        file_size_bytes: Number(f.file_size_bytes || 0),
        storage_path: String(f.storage_path || ""),
        public_url: String(f.public_url || ""),
      }));

      await adminDb.from("documentation").insert(docRows).then(() => null, () => null);
    }

    // 5. Catat riwayat ke activity_logs (non-blocking)
    await adminDb
      .from("activity_logs")
      .insert({
        actor_profile_id: user.id,
        actor_name: member.full_name,
        actor_role: profile?.role || "member",
        action_type: "CONTRIBUTION_SUBMITTED",
        entity_type: "contributions",
        entity_id: contribution.id,
        description: `${member.full_name} mengirim laporan kontribusi divisi ${String(category).trim()} pada kegiatan "${event.title}"`,
      })
      .then(() => null, () => null);

    return NextResponse.json(
      {
        success: true,
        contribution,
        data: contribution,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST_CONTRIBUTION_ERROR]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat menyimpan kontribusi." },
      { status: 500 }
    );
  }
}