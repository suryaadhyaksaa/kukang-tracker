-- ============================================================================
-- KUKANG EV ATTENDANCE & CONTRIBUTION TRACKER - POSTGRESQL SCHEMA & RLS
-- Timezone Reference: Asia/Jakarta (WIB / UTC+7)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'alumni');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'late', 'excused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'failed', 'unconfigured');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. PROFILES TABLE (Terhubung ke auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DIVISIONS TABLE (Dapat dikonfigurasi Admin)
CREATE TABLE IF NOT EXISTS public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'Technical', -- Technical | Non-Technical | Management
    description TEXT,
    color_hex TEXT NOT NULL DEFAULT '#10B981',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MEMBERS TABLE (Master Data Anggota Kukang EV ITERA)
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    nim VARCHAR(20) UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone VARCHAR(25),
    angkatan INTEGER NOT NULL CHECK (angkatan >= 2014 AND angkatan <= 2100),
    division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
    position TEXT NOT NULL DEFAULT 'Staff',
    membership_status membership_status NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    personal_qr_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. EVENTS TABLE (Master Data Kegiatan)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    pic_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
    status event_status NOT NULL DEFAULT 'upcoming',
    qr_token TEXT UNIQUE NOT NULL,
    qr_active_from TIMESTAMPTZ NOT NULL,
    qr_active_until TIMESTAMPTZ NOT NULL,
    is_qr_manually_disabled BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_event_time CHECK (end_time >= start_time),
    CONSTRAINT valid_qr_window CHECK (qr_active_until >= qr_active_from)
);

-- 6. ATTENDANCE TABLE (Data Kehadiran QR)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    nim_snapshot TEXT NOT NULL,
    member_name_snapshot TEXT NOT NULL,
    position_snapshot TEXT NOT NULL,
    division_name_snapshot TEXT NOT NULL,
    event_title_snapshot TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status attendance_status NOT NULL DEFAULT 'present',
    check_in_method TEXT NOT NULL DEFAULT 'qr_scan',
    excel_sync_status sync_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Pencegahan mutlak: 1 anggota hanya bisa check-in 1x per kegiatan
    CONSTRAINT unique_member_event_attendance UNIQUE (member_id, event_id)
);

-- 7. CONTRIBUTIONS TABLE (Catatan Kontribusi Anggota)
CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID REFERENCES public.attendance(id) ON DELETE SET NULL,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
    role_in_event TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Technical Development',
        'Hardware & Electrical',
        'Software Development',
        'Administration',
        'Sponsorship',
        'Public Relations',
        'Documentation',
        'Event Management',
        'Other'
    )),
    work_description TEXT NOT NULL,
    work_output TEXT NOT NULL,
    gdrive_link TEXT,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    excel_sync_status sync_status NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. DOCUMENTATION TABLE (Metadata File Bukti Foto/Video)
CREATE TABLE IF NOT EXISTS public.documentation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 26214400),
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ACTIVITY LOGS TABLE (Audit Trail Sistem)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. EXCEL SYNC LOGS TABLE (Queue & Idempotency Microsoft Graph API)
CREATE TABLE IF NOT EXISTS public.excel_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT UNIQUE NOT NULL,
    target_table TEXT NOT NULL CHECK (target_table IN (
        'MembersTable',
        'EventsTable',
        'AttendanceTable',
        'ContributionsTable',
        'Dokumentasi'
    )),
    record_id UUID NOT NULL,
    operation TEXT NOT NULL DEFAULT 'INSERT',
    payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'skipped_unconfigured')),
    attempt_count INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES UNTUK PERFORMA QUERY & FILTER
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_members_division ON public.members(division_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_nim ON public.members(nim);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_qr_token ON public.events(qr_token);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON public.attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_contributions_member ON public.contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_event ON public.contributions(event_id);
CREATE INDEX IF NOT EXISTS idx_contributions_division ON public.contributions(division_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON public.contributions(verification_status);
CREATE INDEX IF NOT EXISTS idx_documentation_contribution ON public.documentation(contribution_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_excel_sync_status ON public.excel_sync_logs(status);

-- ============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin') AND is_active = true
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Auto-create profile & link member record when user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member')
    )
    ON CONFLICT (id) DO NOTHING;

    -- Auto-link ke tabel members jika email sudah didaftarkan oleh Admin di Master Data Anggota
    UPDATE public.members
    SET profile_id = NEW.id
    WHERE LOWER(email) = LOWER(NEW.email) AND profile_id IS NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_sync_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Super Admin full access profiles" ON public.profiles
    FOR ALL TO authenticated USING (public.get_my_role() = 'super_admin');

-- DIVISIONS
CREATE POLICY "Divisions viewable by authenticated" ON public.divisions
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage divisions" ON public.divisions
    FOR ALL TO authenticated USING (public.is_admin_or_above());

-- MEMBERS
CREATE POLICY "Members viewable by authenticated" ON public.members
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage members" ON public.members
    FOR ALL TO authenticated USING (public.is_admin_or_above());

-- EVENTS
CREATE POLICY "Events viewable by authenticated" ON public.events
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage events" ON public.events
    FOR ALL TO authenticated USING (public.is_admin_or_above());

-- ATTENDANCE (Insert strictly via Server Service Role API to prevent timestamp spoofing)
CREATE POLICY "Admins view all attendance" ON public.attendance
    FOR SELECT TO authenticated USING (public.is_admin_or_above());
CREATE POLICY "Members view own attendance" ON public.attendance
    FOR SELECT TO authenticated USING (
        member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid())
    );
CREATE POLICY "Admins manage attendance" ON public.attendance
    FOR ALL TO authenticated USING (public.is_admin_or_above());

-- CONTRIBUTIONS
CREATE POLICY "Admins view all contributions" ON public.contributions
    FOR SELECT TO authenticated USING (public.is_admin_or_above());
CREATE POLICY "Members view own contributions" ON public.contributions
    FOR SELECT TO authenticated USING (
        member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid())
    );
CREATE POLICY "Members insert own contributions" ON public.contributions
    FOR INSERT TO authenticated WITH CHECK (
        member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid())
    );
CREATE POLICY "Members update own pending contributions" ON public.contributions
    FOR UPDATE TO authenticated USING (
        verification_status = 'pending' AND
        member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid())
    );
CREATE POLICY "Admins manage all contributions" ON public.contributions
    FOR ALL TO authenticated USING (public.is_admin_or_above());

-- DOCUMENTATION
CREATE POLICY "Authenticated view documentation" ON public.documentation
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members insert own documentation" ON public.documentation
    FOR INSERT TO authenticated WITH CHECK (
        member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid())
    );
CREATE POLICY "Admins manage documentation" ON public.documentation
    FOR ALL TO authenticated USING (public.is_admin_or_above());

-- ACTIVITY LOGS
CREATE POLICY "Admins view activity logs" ON public.activity_logs
    FOR SELECT TO authenticated USING (public.is_admin_or_above());
CREATE POLICY "Members view own activity logs" ON public.activity_logs
    FOR SELECT TO authenticated USING (actor_profile_id = auth.uid());

-- EXCEL SYNC LOGS
CREATE POLICY "Admins view excel sync logs" ON public.excel_sync_logs
    FOR SELECT TO authenticated USING (public.is_admin_or_above());

-- ============================================================================
-- SUPABASE STORAGE BUCKET & POLICIES
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kukang-docs',
    'kukang-docs',
    true,
    26214400, -- 25 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users upload docs" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kukang-docs');
CREATE POLICY "Public read kukang-docs" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'kukang-docs');
CREATE POLICY "Admins delete kukang-docs" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'kukang-docs' AND public.is_admin_or_above());

-- ============================================================================
-- INITIAL SEED: STRUKTUR DIVISI RESMI KUKANG EV ITERA
-- ============================================================================
INSERT INTO public.divisions (name, category, description, color_hex) VALUES
    ('Administrasi & Principals', 'Management', 'Team Principal, General Manager, Sekretaris, dan Bendahara Tim Kukang EV ITERA', '#F59E0B'),
    ('Technical - Powertrain & Electrical', 'Technical', 'Sistem motor listrik, baterai, BMS, inverter, dan wiring harness', '#10B981'),
    ('Technical - Chassis & Aerodynamics', 'Technical', 'Rangka kendaraan, suspensi, sistem kemudi, pengereman, dan bodi aerodinamis', '#06B6D4'),
    ('Technical - Vehicle Telemetry & Software', 'Technical', 'Sistem telemetri IoT, dashboard kendaraan, dan akuisisi data performa', '#3B82F6'),
    ('Non-Technical - Sponsorship & Partnership', 'Non-Technical', 'Kemitraan industri, pendanaan kompetisi, dan relasi sponsor', '#8B5CF6'),
    ('Non-Technical - Public Relations & Creative Media', 'Non-Technical', 'Branding, dokumentasi media, publikasi, dan manajemen media sosial', '#EC4899'),
    ('Non-Technical - Event & Logistics', 'Non-Technical', 'Operasional paddock, logistik alat, dan koordinasi kegiatan tim', '#14B8A6')
ON CONFLICT (name) DO NOTHING;

-- AKTIFKAN REALTIME UNTUK TABEL UTAMA
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;