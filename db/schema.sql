-- ArsynFX Review Tool — schema
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- One row per client
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

-- A project groups all videos for one job/client engagement.
-- access_token is the magic-link secret — client never logs in, just visits /review/:access_token
create table projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  name text not null,
  access_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

-- Videos. parent_video_id links a new version back to the previous one,
-- so you can stack v1 -> v2 -> v3 under the same project without losing history.
create table videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_video_id uuid references videos(id) on delete set null,
  version_number int not null default 1,
  title text not null,
  drive_file_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'changes_requested', 'approved')),
  created_at timestamptz not null default now()
);

-- Timestamped comments. resolved lets you track what's fixed vs still open.
create table comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade, -- set for a reply
  author_name text not null,
  author_type text not null check (author_type in ('client', 'editor')),
  timestamp_seconds numeric not null,
  end_timestamp_seconds numeric, -- set for a range (in/out) comment; null for a single-point comment
  priority boolean not null default false,
  annotation jsonb, -- freehand drawing overlay data, if any
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_videos_project on videos(project_id);
create index idx_comments_video on comments(video_id);

-- Handy view: latest version of every video per project
create view latest_videos as
select distinct on (project_id) *
from videos
order by project_id, version_number desc;
