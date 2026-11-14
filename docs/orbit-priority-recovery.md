# ORBIT priorities: recovery and safe reconciliation (Claude Code Mac)

## Observed state (reported by Claude Code, 2026-11-14)
- Mac companion: `GET http://127.0.0.1:43128/api/priorities` responds with an empty array.
- `priorities.json` has reportedly been `[]` since 2026-10-13.
- The browser portal may have saved preferences or priorities in localStorage
  that were not submitted successfully to the local companion.
- No historical priority values have been confirmed or recovered.

## Phase 1: read-only inventory

1. Identify the actual ORBIT portal source and its exact browser storage keys.
   Do not guess based on other projects or unrelated browsing histories.
2. Find the exact companion handler for `GET/POST /api/priorities` and the
   current local file path (do not display environment variables or secrets).
3. Take a **local, private backup** of `priorities.json` before any future update.
   Do not upload browser storage or sensitive data to GitHub, ChatGPT or a PR.
4. With the owner present, check whether the particular browser profile used for
   ORBIT still has the actual priorities. Inspect metadata and values locally.
   Do not run portal code that implicitly syncs or overwrites those values
   before a safe backup has been made.
5. Record only non-sensitive evidence in your report: key names, data type,
   counts, age if a timestamp exists, paths of local encrypted backups.
6. If browser and Mac differ, output a comparison and recommended reconciliation
   with **no write performed**.

## Phase 2: design, not deployment

- Prefer a durable owner-authenticated server-side register of priorities,
  with a stable ID, `revision`, `updated_at` and provenance for each item.
  Existing Cloudflare Access + KV could be evaluated, but check suitability for
  concurrent writes, quotas and consistency first. D1 may be better for
  transactional revision checks. Avoid choosing a backend without inspection.
- A browser is an offline draft/cache, not an automatically authoritative source.
  Mac may be an offline copy or executor, not necessarily the sole master.
- Never treat a fresh empty response as authorization to delete entries stored
  elsewhere. An empty authoritative set needs an **explicit confirmed clear**
  operation and a new revision.
- Use optimistic concurrency / revision checks and no-op on conflicting writes.
- Provide migration and rollback plan that preserves original values and
  requires the owner's confirmation before any overwrite.

## ATL DIRECTOR behavior in this PR

- `observed_empty`: ORBIT returned an empty array. The model must not invent
  business priorities or claim a successful sync.
- `observed`: the API returned one or more priorities; freshness may still be
  unknown if no timestamp is present.
- `unrecognized_format`: response schema was not recognized.
- `unavailable`: transport or JSON failure.
- `not_configured`: local endpoint has not been configured.
- `freshness: stale | recent | unknown`: stale is reported only if the API
  actually supplies a valid update timestamp. Current endpoint might not.
- Read-only observation does not change browser data, ORBIT data or Mac files.

## Required output

Provide the exact ORBIT code path that defines the priority schema, the
browser storage mechanism, companion file path, whether any recoverable
priorities actually exist, and a proposed server-side synchronization design.
Do not write or deploy changes to ORBIT until reviewed and authorized.
