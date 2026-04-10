import { supabase } from "./supabase";

// ── Contacts ────────────────────────────────────────────────

export async function getContacts({ limit = 500, offset = 0 } = {}) {
  if (!supabase) return { data: [], count: 0 };
  const { data, count, error } = await supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data, count };
}

export async function getContactCount() {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count;
}

export async function upsertContacts(rows) {
  if (!supabase) throw new Error("Supabase not configured");
  // Upsert by email if present, otherwise insert
  const withTimestamp = rows.map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  const { data, error } = await supabase
    .from("contacts")
    .upsert(withTimestamp, { onConflict: "email", ignoreDuplicates: false });
  if (error) throw error;
  return data;
}

// ── Campaigns ───────────────────────────────────────────────

export async function getCampaigns() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCampaignCount() {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count;
}

export async function createCampaign(campaign) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("campaigns")
    .insert(campaign)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(id, updates) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("campaigns")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Campaign ↔ Contact assignments ──────────────────────────

export async function getCampaignContacts(campaignId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("campaign_contacts")
    .select("*, contacts(*)")
    .eq("campaign_id", campaignId)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCampaignContactCount(campaignId) {
  if (!supabase) return 0;
  const query = supabase
    .from("campaign_contacts")
    .select("*", { count: "exact", head: true });
  if (campaignId) query.eq("campaign_id", campaignId);
  const { count, error } = await query;
  if (error) throw error;
  return count;
}

export async function assignContacts(campaignId, contactRows) {
  if (!supabase) throw new Error("Supabase not configured");
  const rows = contactRows.map((r) => ({
    campaign_id: campaignId,
    contact_id: r.contact_id,
    email_type: r.email_type || null,
    outreach_method: r.outreach_method || null,
    distribution: r.distribution || null,
    status: r.status || "pending",
  }));
  const { data, error } = await supabase
    .from("campaign_contacts")
    .upsert(rows, { onConflict: "campaign_id,contact_id" });
  if (error) throw error;
  return data;
}

// ── Bounce log ──────────────────────────────────────────────

export async function logBounces(rows) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("bounce_log").insert(rows);
  if (error) throw error;
  return data;
}

export async function getBounces({ campaignId, status } = {}) {
  if (!supabase) return [];
  let query = supabase
    .from("bounce_log")
    .select("*, contacts(full_name, email, company)")
    .order("created_at", { ascending: false });
  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (status) query = query.eq("scrub_status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getBounceCount() {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("bounce_log")
    .select("*", { count: "exact", head: true })
    .eq("scrub_status", "pending");
  if (error) throw error;
  return count;
}

// ── Health check ────────────────────────────────────────────

export async function checkConnection() {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("contacts").select("id", { head: true });
    return !error;
  } catch {
    return false;
  }
}
