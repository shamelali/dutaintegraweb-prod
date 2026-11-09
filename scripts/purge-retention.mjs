/**
 * Retention Policy Purge Runner.
 * 
 * Enforces data retention schedules by purging stale records from Supabase:
 * - WhatsApp message event records older than RETENTION_DAYS (default: 730 days / 2 years)
 * - Archived or closed enquiries/leads older than RETENTION_DAYS
 * 
 * Usage:
 *   node scripts/purge-retention.mjs
 *   RETENTION_DAYS=365 DRY_RUN=true node scripts/purge-retention.mjs
 */

const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 730);
const DRY_RUN = process.env.DRY_RUN === "true";
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log("[purge-retention] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY unset. Skipping execution.");
  process.exit(0);
}

const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
console.log(`[purge-retention] Purging records older than ${cutoffDate} (${RETENTION_DAYS} days retention)...`);

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function purgeTable(table, filterQuery) {
  // CRITICAL SAFEGUARD: Opt-outs must NEVER be purged under any circumstance.
  // Deleting opt-outs would cause suppressed contacts who replied STOP to receive unwanted messages.
  const STRICTLY_PROTECTED_TABLES = new Set(["whatsapp_optouts"]);
  if (STRICTLY_PROTECTED_TABLES.has(table)) {
    throw new Error(`CRITICAL ERROR: Attempted to purge permanently protected table '${table}'!`);
  }

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}?${filterQuery}`;
  
  if (DRY_RUN) {
    const checkRes = await fetch(url, { headers });
    if (!checkRes.ok) {
      console.warn(`[purge-retention] DRY-RUN check failed on ${table}: ${checkRes.status}`);
      return;
    }
    const rows = await checkRes.json();
    console.log(`[purge-retention] DRY-RUN: ${rows.length} records eligible for purge in '${table}'`);
    return;
  }

  const deleteRes = await fetch(url, { method: "DELETE", headers });
  if (!deleteRes.ok) {
    console.warn(`[purge-retention] Purge on '${table}' returned ${deleteRes.status}`);
    return;
  }
  const deletedRows = await deleteRes.json().catch(() => []);
  console.log(`[purge-retention] Purged ${Array.isArray(deletedRows) ? deletedRows.length : "target"} records from '${table}'`);
}

async function main() {
  try {
    // Purge stale whatsapp_messages older than cutoff
    await purgeTable("whatsapp_messages", `created_at=lt.${encodeURIComponent(cutoffDate)}`);

    // Purge stale leads older than cutoff where status is closed/archived
    await purgeTable("leads", `created_at=lt.${encodeURIComponent(cutoffDate)}&status=in.(archived,closed,junk)`);

    console.log("[purge-retention] Retention enforcement job completed successfully.");
  } catch (err) {
    console.error("[purge-retention] Error executing purge job:", err);
    process.exit(1);
  }
}

main();
