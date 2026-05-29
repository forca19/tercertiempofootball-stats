-- ============================================================
-- Soccer Stats — Restructured Schema (v3)
-- Players are independent; team_roster links player+team+season
-- ============================================================

-- Seasons
create table seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  is_current  boolean not null default false,
  created_at  timestamptz default now()
);
create unique index seasons_current_idx on seasons (is_current) where is_current = true;

-- Teams
create table teams (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  logo_url    text,                 -- external URL to team logo image
  created_at  timestamptz default now()
);

-- Players (independent — no team_id here)
create table players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  number      int,
  position    text,
  photo_url   text,                 -- external URL to player photo
  created_at  timestamptz default now()
);
create index players_name_idx on players (lower(name));

-- Roster: player ↔ team ↔ season
create table team_roster (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  season_id   uuid not null references seasons(id) on delete cascade,
  unique (player_id, team_id, season_id)
);

-- Stats (per roster entry)
create table stats (
  id          uuid primary key default gen_random_uuid(),
  roster_id   uuid not null references team_roster(id) on delete cascade unique,
  goals       int not null default 0,
  assists     int not null default 0,
  matches     int not null default 0,
  updated_at  timestamptz default now()
);

-- ============================================================
-- Helpful view: flat stats for querying
-- ============================================================
create view player_stats_view as
  select
    p.id         as player_id,
    p.name       as player_name,
    p.number,
    p.position,
    p.photo_url  as player_photo_url,
    t.id         as team_id,
    t.name       as team_name,
    t.slug       as team_slug,
    t.logo_url   as team_logo_url,
    s.id         as season_id,
    s.name       as season_name,
    s.is_current,
    coalesce(st.goals,   0) as goals,
    coalesce(st.assists, 0) as assists,
    coalesce(st.matches, 0) as matches,
    tr.id        as roster_id
  from team_roster tr
  join players p  on p.id = tr.player_id
  join teams   t  on t.id = tr.team_id
  join seasons s  on s.id = tr.season_id
  left join stats st on st.roster_id = tr.id;

-- ============================================================
-- Row Level Security (public read, authenticated write)
-- ============================================================
alter table seasons     enable row level security;
alter table teams       enable row level security;
alter table players     enable row level security;
alter table team_roster enable row level security;
alter table stats       enable row level security;

create policy "public read seasons"     on seasons     for select using (true);
create policy "public read teams"       on teams       for select using (true);
create policy "public read players"     on players     for select using (true);
create policy "public read team_roster" on team_roster for select using (true);
create policy "public read stats"       on stats       for select using (true);

-- For admin writes, use service role key server-side (recommended)
-- Or enable authenticated writes:
-- create policy "auth write players" on players for all using (auth.role() = 'authenticated');
-- (repeat for other tables as needed)

-- ============================================================
-- Seed data
-- ============================================================
insert into seasons (name, is_current) values
  ('2024-25', true),
  ('2023-24', false),
  ('2022-23', false);

insert into teams (slug, name) values
  ('lions',  'FC Lions'),
  ('tigers', 'Tigers United'),
  ('wolves', 'Wolves SC'),
  ('eagles', 'Eagles FC');
