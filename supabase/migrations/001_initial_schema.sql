-- ============================================================
-- CEO Sales Outreach Tool — Initial Schema
-- Run this in your Supabase SQL Editor (supabase.com → project → SQL Editor)
-- ============================================================

-- 1. Contacts — master contact list
create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  full_name   text,
  first_name  text,
  last_name   text,
  title       text,
  company     text,
  email       text,
  phone       text,
  source      text default 'manual',  -- salesforce, manual, csv, etc.
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. Campaigns — campaign definitions
create table if not exists campaigns (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  industry        text,
  report_title    text,
  report_summary  text,
  template        text,
  status          text default 'draft' check (status in ('draft', 'active', 'completed')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 3. Campaign–Contact assignments
create table if not exists campaign_contacts (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references campaigns(id) on delete cascade,
  contact_id       uuid not null references contacts(id) on delete cascade,
  email_type       text check (email_type in ('personalized', 'semi-personalized', 'templatized')),
  outreach_method  text,
  distribution     text,
  status           text default 'pending' check (status in ('pending', 'sent', 'bounced')),
  assigned_at      timestamptz default now(),
  unique (campaign_id, contact_id)
);

-- 4. Bounce log — bounced emails for scrubbing
create table if not exists bounce_log (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid references contacts(id) on delete set null,
  campaign_id   uuid references campaigns(id) on delete set null,
  original_email text,
  bounce_reason text,
  new_email     text,
  new_company   text,
  scrub_status  text default 'pending' check (scrub_status in ('pending', 'in_progress', 'resolved')),
  created_at    timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_campaign_contacts_campaign on campaign_contacts(campaign_id);
create index if not exists idx_campaign_contacts_contact  on campaign_contacts(contact_id);
create index if not exists idx_bounce_log_campaign         on bounce_log(campaign_id);
create index if not exists idx_contacts_email              on contacts(email);

-- Auto-update updated_at on contacts
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

create trigger campaigns_updated_at
  before update on campaigns
  for each row execute function update_updated_at();

-- ============================================================
-- RLS is DISABLED by default on new tables in Supabase.
-- When you add auth later, enable RLS and add policies:
--   alter table contacts enable row level security;
--   create policy "public read" on contacts for select using (true);
-- ============================================================
