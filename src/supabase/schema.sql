-- ============================================================
-- Tercer Tiempo Football Stats — database schema
--
-- Entity model:
--   teams → seasons (1:N, each season belongs to one team)
--   players (global identity)
--   team_roster = player on a team for a given season
--   stats = goals / assists / matches for one roster row
--
-- UI mapping (application layer, not separate tables):
--   /team/[slug]           → teams.slug
--   default season         → seasons where team_id = ? and is_current
--   ?season=<uuid>         → seasons.id (must belong to that team)
-- ============================================================

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table teams (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  logo_url    text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seasons (team-specific; never shared across teams)
-- Names are free text: calendar years, Apertura, Clausura, etc.
-- ---------------------------------------------------------------------------
create table seasons (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  name        text not null,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint seasons_team_name_unique unique (team_id, name),
  constraint seasons_team_id_id_unique unique (team_id, id)
);

-- One active season per team (drives default on team page)
create unique index seasons_one_current_per_team
  on seasons (team_id)
  where is_current = true;

create index seasons_team_id_idx on seasons (team_id);

-- ---------------------------------------------------------------------------
-- Players (identity only; team/season membership is via team_roster)
-- ---------------------------------------------------------------------------
create table players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  number      int,
  position    text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

create index players_name_lower_idx on players (lower(name));

-- ---------------------------------------------------------------------------
-- Team roster — who played for which team in which season
-- ---------------------------------------------------------------------------
create table team_roster (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  team_id     uuid not null references teams(id) on delete cascade,
  season_id   uuid not null references seasons(id) on delete cascade,
  constraint team_roster_player_team_season_unique
    unique (player_id, team_id, season_id),
  constraint team_roster_season_belongs_to_team
    foreign key (team_id, season_id) references seasons (team_id, id)
);

create index team_roster_team_season_idx on team_roster (team_id, season_id);

-- ---------------------------------------------------------------------------
-- Player stats — one row per roster entry (historical rows are never merged)
-- ---------------------------------------------------------------------------
create table stats (
  roster_id   uuid primary key references team_roster(id) on delete cascade,
  goals       int not null default 0,
  assists     int not null default 0,
  matches     int not null default 0,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Read model for team pages, player profiles, and admin
-- ---------------------------------------------------------------------------
create view player_stats_view as
select
  p.id                    as player_id,
  p.name                  as player_name,
  p.number,
  p.position,
  p.photo_url             as player_photo_url,
  t.id                    as team_id,
  t.name                  as team_name,
  t.slug                  as team_slug,
  t.logo_url              as team_logo_url,
  s.id                    as season_id,
  s.name                  as season_name,
  s.is_current,
  coalesce(st.goals,   0) as goals,
  coalesce(st.assists, 0) as assists,
  coalesce(st.matches, 0) as matches,
  tr.id                   as roster_id
from team_roster tr
join players p on p.id = tr.player_id
join teams   t on t.id = tr.team_id
join seasons s on s.id = tr.season_id and s.team_id = tr.team_id
left join stats st on st.roster_id = tr.id;

-- ---------------------------------------------------------------------------
-- Row level security (public read; writes via service role server-side)
-- ---------------------------------------------------------------------------
alter table teams       enable row level security;
alter table seasons     enable row level security;
alter table players     enable row level security;
alter table team_roster enable row level security;
alter table stats       enable row level security;

create policy "public read teams"       on teams       for select using (true);
create policy "public read seasons"     on seasons     for select using (true);
create policy "public read players"     on players     for select using (true);
create policy "public read team_roster" on team_roster for select using (true);
create policy "public read stats"       on stats       for select using (true);

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
insert into teams (slug, name) values
  ('lions',  'FC Lions'),
  ('tigers', 'Tigers United'),
  ('wolves', 'Wolves SC'),
  ('eagles', 'Eagles FC');

-- Each team gets its own season rows (same labels, independent is_current)
insert into seasons (team_id, name, is_current)
select t.id, v.name, v.is_current
from teams t
cross join (
  values
    ('2024-25', true),
    ('2023-24', false),
    ('2022-23', false)
) as v(name, is_current);
