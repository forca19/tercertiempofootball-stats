<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Overview

Tercer Tiempo Football Stats is a football statistics platform.

Tech stack:
- Next.js 15 App Router
- TypeScript
- Supabase
- TailwindCSS

# Routing Rules

- Use App Router only.
- Use async params and searchParams for Next.js 15.
- Team pages are accessed using:
  /team/[slug]

# Data Model Rules

- Seasons belong to teams.
- Seasons are NOT global.
- Teams can have multiple historical seasons.
- A team season may represent:
  - Apertura
  - Clausura
  - Primavera-Verano
  - Otoño-Invierno
- Team pages default to the current season.

# Statistics Rules

- Statistics are stored per:
  - Player
  - Team
  - Team Season

- Historical statistics must be preserved.

# UI Rules

- Team page should load the current season by default.
- Users can switch seasons using a dropdown selector.
- Do not create separate pages per season unless explicitly requested.

# Import Rules

- Source data comes from Google Sheets.
- Import pipeline must tolerate inconsistent column names.
- Missing assists should default to 0.
- Normalization should happen before database insertion.

# Development Rules

- Prefer simple solutions.
- Avoid unnecessary abstractions.
- Avoid introducing Redux.
- Prefer server components unless client components are required.