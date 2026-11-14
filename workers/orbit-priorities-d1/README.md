# ORBIT priority register · isolated D1 staging

Status: **schema installed and exercised in a temporary, shared preview D1 only. No live ORBIT API or personal data.**

## Why it is not live
Cloudflare account already has 10 D1 databases. Creating
`atl-orbit-priorities-staging` failed with code 7406,
`System limit reached: databases per account (10)`.
An audit confirmed every existing D1 has a Worker or Pages binding. We therefore
did **not** delete any D1, remove bindings, change paid plan, or move existing
application data.

For real D1 engine testing, the migration was installed in **bali-private-sync**
(`246ce0ea-8b40-4a83-8c65-b0378c14a1c2`), the EU D1 bound **only to
the preview environment** of `bali-tracker`. Its existing
`private_trip_snapshots` table had zero rows at audit time. The new
`orbit_*` tables do not intersect that table. No Bali Tracker code, route or
binding was edited. This database is shared and **must not be used for real,
private ORBIT priority data** because Bali Tracker preview can technically
access the same database. Use this only as a temporary schema test area until
a distinct ORBIT D1 is provisioned.

Real Cloudflare D1 checks on 2026-11-14 confirmed:
- 13 migration statements succeeded.
- A synthetic write inserted 1 event, incremented 1 revision, and inserted
  1 priority in one batch.
- A stale version, physical deletion, and event tampering were refused.
- A deliberately invalid batch rolled back atomically, preserving previous
  revision and event count.
- All synthetic ORBIT data was removed by dropping **only the newly created
  `orbit_*` tables** and reapplying this migration.
- Final verified state: `revision=0`, `orbit_priorities=0`,
  `orbit_priority_events=0`, `private_trip_snapshots=0`.

**No personal priorities were retrieved or imported.** Existing Workers
`espace-personnel` and `orbit-mobile` were not modified.

## Schema
Migration: `migrations/001_priority_register.sql`.

- `orbit_priority_sets`: singleton `personal` register, integer `revision`,
  update time, and actor.
- `orbit_priorities`: durable priority IDs, titles, completion, position,
  creation/update timestamps and optional deletion tombstone.
- `orbit_priority_events`: append-only history with unique revision,
  source, actor, action, original event payload JSON.
- SQLite triggers reject writes based on an outdated revision, version jumps,
  unaudited mutations at an old revision, hard deletion, and event rewriting.

The migration begins with revision **0** and no priorities. It does
**not** infer that the actual owner's list is empty.

## Planned write protocol (not active)
After authenticated owner authorization, a single `D1Database.batch()`
transaction must execute three prepared statements:

1. INSERT event at client-expected revision + 1. A trigger aborts if the
   register has a different revision or an event already exists there.
2. UPDATE singleton state revision by one, with the actor and timestamp,
   WHERE revision equals expected revision.
3. INSERT/UPDATE the corresponding priority and its tombstone, if relevant.

Batch rollback on any failure is required. Use bound SQL parameters only.
Reject version conflicts with HTTP 409 and return the latest *metadata* so
the caller can reconcile locally. Never quietly prefer last-writer-wins.

A full-list `clear_confirmed` requires an explicit, authenticated, separate
confirmation flow and a backup. **A GET response of [] cannot trigger writes.**

## Security required before any future deployment
- Authenticate the owner via verified Cloudflare Access identity, and
  bind the D1 only to a dedicated owner-only Worker or authorized
  service. Keep database credentials and service tokens server-only.
- Require same-origin and anti-CSRF checks for cookie-authenticated writes.
- Cap payload sizes, title length, number of priorities and request rate.
- Verify identity/authorization *before* reading private priorities.
- Keep exports encrypted/private; never commit personal browser exports.
- Do not add the D1 binding to any general-purpose public worker before
  the endpoint and authorization have been audited.
- Use `revision` and `updated_at` in read responses, so ATL DIRECTOR can
  assess freshness. Do not add full write access to ATL DIRECTOR.
- Test rollback, migration restore, duplicate requests and stale writes.
- Reconcile browser-origin `orbit.focus.v1` only after an original
  Safari/iPhone `orbit-sauvegarde.json` is exported and inspected.

## Verification
`python3 -m unittest discover -s workers/orbit-priorities-d1/tests -v`

These are SQLite contract tests. They do not substitute for a real D1
integration test, Cloudflare Access security test, or migration rehearsal.

## Activation prerequisites
1. Provide a truly dedicated D1 slot through a separately reviewed cleanup or
   an approved plan change. Do not mistake this temporary shared preview
   schema for a secure destination for private priorities.
2. Apply this migration to that **new, dedicated ORBIT database**, and test it
   there with synthetic data before accepting any personal export.
3. Validate read/write auth and revision conflicts with synthetic data.
4. Recover and back up existing browser priorities before user-approved import.
5. Plan and review the ORBIT Worker integration; no live cutover yet.
