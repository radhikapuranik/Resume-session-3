-- Kargo hiring dashboard schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) before using the app.

create extension if not exists "pgcrypto";

create type role_type as enum ('PM', 'SPM');
create type candidate_status as enum ('uploaded', 'needs_manual_review', 'scored', 'reviewed', 'sent');
create type draft_type as enum ('invite', 'rejection');

create table if not exists rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  role role_type not null,
  criterion_name text not null,
  description text not null,
  weight numeric not null, -- e.g. 0.30 for 30%
  sort_order int not null default 0,
  unique (role, criterion_name)
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  role_applied role_type not null,
  personal_details jsonb not null default '{}'::jsonb, -- { name, email, phone, other }
  cv_content text, -- PII-stripped text, this is all any AI call ever sees
  original_filename text not null,
  file_hash text, -- sha256 of raw file bytes, used for duplicate-upload detection
  status candidate_status not null default 'uploaded',
  needs_manual_review boolean not null default false,
  manual_review_reason text,
  duplicate_of_candidate_id uuid references candidates(id), -- set when Arjun explicitly chooses to upload again anyway
  created_at timestamptz not null default now()
);

create index if not exists candidates_file_hash_idx on candidates (file_hash);
create index if not exists candidates_role_applied_idx on candidates (role_applied);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  rubric_role role_type not null, -- which rubric this score is against (PM or SPM), independent of role_applied
  criterion_name text not null,
  criterion_score numeric not null, -- 0-10
  criterion_reason text not null,
  weight numeric not null,
  created_at timestamptz not null default now(),
  unique (candidate_id, rubric_role, criterion_name)
);

-- Denormalized weighted total per candidate per rubric, kept alongside per-criterion rows
-- for cheap ranking queries without re-summing every time.
create table if not exists rubric_totals (
  candidate_id uuid not null references candidates(id) on delete cascade,
  rubric_role role_type not null,
  weighted_total numeric not null, -- 0-10 scale
  primary key (candidate_id, rubric_role)
);

create table if not exists briefs (
  candidate_id uuid primary key references candidates(id) on delete cascade,
  brief_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  draft_type draft_type not null,
  subject text not null,
  body text not null,
  sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (candidate_id, draft_type)
);

create index if not exists scores_candidate_idx on scores (candidate_id);
create index if not exists email_drafts_candidate_idx on email_drafts (candidate_id);
