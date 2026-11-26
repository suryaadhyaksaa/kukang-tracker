import { createAdminSupabase } from "@/lib/supabase/admin";
import { writeActivityLog } from "@/lib/audit";

export type ExcelTableName =
  | "MembersTable"
  | "EventsTable"
  | "AttendanceTable"
  | "ContributionsTable"
  | "Dokumentasi";

export function isMicrosoftGraphConfigured(): boolean {
  return Boolean(
    process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET &&
      process.env.EXCEL_DRIVE_ID &&
      process.env.EXCEL_ITEM_ID
  );
}

/**
 * Mengambil OAuth2 Access Token menggunakan Client Credentials Flow (Server-Only).
 */
async function getGraphAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID!;
  const clientId = process.env.AZURE_CLIENT_ID!;
  const clientSecret = process.env.AZURE_CLIENT_SECRET!;

  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Azure OAuth Gagal (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/**
 * Mengirimkan 1 baris data ke Named Table di Microsoft Excel Online secara idempoten.
 * Mencegah duplikasi data apabila fungsi retry dipanggil berkali-kali.
 */
export async function syncRowToExcelOnline(params: {
  idempotencyKey: string;
  targetTable: ExcelTableName;
  recordId: string;
  rowValues: (string | number | boolean | null)[];
  payloadObject: Record<string, unknown>;
  sourceTableToUpdate?: "attendance" | "contributions";
}): Promise<{ status: "synced" | "failed" | "unconfigured"; error?: string }> {
  const adminDb = createAdminSupabase();

  // 1. Cek Idempotency Key agar tidak mengirim baris ganda saat retry
  const { data: existingLog } = await adminDb
    .from("excel_sync_logs")
    .select("*")
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle();

  if (existingLog?.status === "success") {
    return { status: "synced" };
  }

  // 2. Cek apakah Microsoft Graph sudah dikonfigurasi
  if (!isMicrosoftGraphConfigured()) {
    await adminDb.from("excel_sync_logs").upsert(
      {
        idempotency_key: params.idempotencyKey,
        target_table: params.targetTable,
        record_id: params.recordId,
        operation: "INSERT",
        payload: params.payloadObject,
        status: "skipped_unconfigured",
        attempt_count: (existingLog?.attempt_count ?? 0) + 1,
        error_message:
          "Variabel AZURE_TENANT_ID / CLIENT_ID / SECRET / EXCEL_DRIVE_ID / EXCEL_ITEM_ID belum dikonfigurasi.",
        last_attempted_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" }
    );

    if (params.sourceTableToUpdate) {
      await adminDb
        .from(params.sourceTableToUpdate)
        .update({ excel_sync_status: "unconfigured" })
        .eq("id", params.recordId);
    }

    return {
      status: "unconfigured",
      error: "Integrasi Microsoft Graph belum dikonfigurasi.",
    };
  }

  // 3. Eksekusi Microsoft Graph API: Append Row ke Excel Table
  try {
    const accessToken = await getGraphAccessToken();
    const driveId = process.env.EXCEL_DRIVE_ID!;
    const itemId = process.env.EXCEL_ITEM_ID!;

    const endpoint = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/workbook/tables/${params.targetTable}/rows/add`;

    const graphRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [params.rowValues.map((v) => (v === null ? "" : v))],
      }),
      cache: "no-store",
    });

    if (!graphRes.ok) {
      const errorDetail = await graphRes.text();
      throw new Error(`Graph API Error (${graphRes.status}): ${errorDetail}`);
    }

    const syncedAt = new Date().toISOString();

    await adminDb.from("excel_sync_logs").upsert(
      {
        idempotency_key: params.idempotencyKey,
        target_table: params.targetTable,
        record_id: params.recordId,
        operation: "INSERT",
        payload: params.payloadObject,
        status: "success",
        attempt_count: (existingLog?.attempt_count ?? 0) + 1,
        error_message: null,
        last_attempted_at: syncedAt,
        synced_at: syncedAt,
      },
      { onConflict: "idempotency_key" }
    );

    if (params.sourceTableToUpdate) {
      await adminDb
        .from(params.sourceTableToUpdate)
        .update({ excel_sync_status: "synced" })
        .eq("id", params.recordId);
    }

    await writeActivityLog({
      actorName: "System Excel Sync",
      actorRole: "system",
      actionType: "EXCEL_SYNC",
      entityType: params.targetTable,
      entityId: params.recordId,
      description: `Sinkronisasi berhasil ke tabel ${params.targetTable} (ID: ${params.recordId})`,
    });

    return { status: "synced" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Microsoft Graph error";

    await adminDb.from("excel_sync_logs").upsert(
      {
        idempotency_key: params.idempotencyKey,
        target_table: params.targetTable,
        record_id: params.recordId,
        operation: "INSERT",
        payload: params.payloadObject,
        status: "failed",
        attempt_count: (existingLog?.attempt_count ?? 0) + 1,
        error_message: message,
        last_attempted_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" }
    );

    if (params.sourceTableToUpdate) {
      await adminDb
        .from(params.sourceTableToUpdate)
        .update({ excel_sync_status: "failed" })
        .eq("id", params.recordId);
    }

    return { status: "failed", error: message };
  }
}