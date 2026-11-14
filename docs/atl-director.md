# ATL DIRECTOR · MVP v0.1

ATL DIRECTOR is the project-management decision layer of FORGE AI.
The first milestone is **planning only**. It is intentionally not an autonomous deployer.

## Included

- Authenticated /director cockpit and /api/director API.
- Per-user project register, transparent prioritization, two-proposal daily cycle.
- Human approval/rejection history and row-level security.
- Testable permission guardrails; no deployment, spending, outbound messaging, or destructive actions.
- Existing FORGE AI data and production Workers remain unchanged.

## Activate (after PR review)

1. Merge the reviewed branch using the existing repository workflow.
2. Apply `supabase/migrations/20261113_atl_director.sql` to the correct Supabase project using an authorized migration process.
3. Confirm existing Supabase environment variables, access /director while authenticated.
4. Click **Initialiser le portefeuille**. Entries are candidates, not confirmed audits; all metrics begin as hypotheses.
5. Update each project's stage and six 0–5 metrics using evidence.
6. Click **Lancer le cycle** to generate up to two suggestions for today (UTC).
7. Approve/reject proposed actions. Approval does **not** execute them in this version.

## Policy

- Never claim that an audit has happened without a cited or inspected result.
- Do not auto-send emails, auto-deploy, spend money, delete production data, or modify secrets.
- Scoring is heuristic; it must never be represented as an actual revenue measurement.
- `mayRunWithoutApproval` authorizes only observation and drafting in a future executor.
- Current API **does not call** a model, Claude Code, Ollama, GitHub tools or Cloudflare.
- Run-once-per-UTC-day and max 2 proposals protect against loops and duplicates.
- State lives in Supabase; schema uses per-user RLS.

## Next milestone: genuine tool-using loop

Build a separately authenticated local worker which periodically fetches an approved
job, uses Ollama or Claude Code to plan and use read-only tools, checks evidence,
persists execution receipts, enforces time/token/cycle budgets, and returns
artifacts for approval. Define a command allowlist, sanitized workspaces,
audit logs, replay-safe leases and human gates before enabling write tools.

`npm run typecheck`, `npm test`, `npm run build` are the project check commands.

## Local observational loop (Node 20+, Ollama)

An isolated read-only agent is now available in `scripts/atl-director-local.mjs`.
It observes up to six named GitHub repositories, invokes the Ollama chat API for
up to two critique/refinement cycles, validates evidence URLs against observed
GitHub metadata, then writes `~/.atl-director/latest.json`.

On your Mac, after checking out the reviewed branch:

```bash
cd /path/to/forge-ai
# For private repositories, provide a read-only fine-grained GitHub token:
export GITHUB_TOKEN='YOUR_READ_ONLY_TOKEN'
export OLLAMA_MODEL='gemma4:26b'
node scripts/atl-director-local.mjs
cat ~/.atl-director/latest.json
```

Never put tokens into `scripts/atl-director-projects.json` or commit them.
It requires Ollama already running at `http://127.0.0.1:11434`.
Repository names are edited in `scripts/atl-director-projects.json`.
No local script has been installed or started on the user's Mac by this PR.
Scheduling can be configured after first local validation (e.g., a launchd user agent).
The local JSON is not yet synchronized to the web cockpit: this is the next integration step.

## ORBIT integration (read-only, staged, not live)

Two sources have been verified in the owner's Cloudflare account:

- `espace-personnel` exposes a private `GET /api/portfolio` endpoint backed by a PORTFOLIO KV namespace, protected with Cloudflare Access JWT verification.
- `orbit-mobile` forwards `GET /api/priorities` and Ollama/Hermes routes to the Mac through a Cloudflare Tunnel, when the Mac is online.

The existing ORBIT portfolio KV had **no `project:` entries** when inspected on 2026-11-13.
Do not confuse the visible static ORBIT product catalog with saved portfolio records.
Do not assert that a synchronization imported existing records when it found zero.

### A. Secure cloud portfolio synchronization

The `workers/orbit-reader/worker.mjs` source is a **separate**, read-only Worker
which can bind to ORBIT's existing PORTFOLIO KV namespace.
It exposes only `GET /v1/projects` and requires a server-side bearer secret.
It never touches `espace-personnel` code or bypasses its Access policies.
It returns only stage, focus, next action, note, evidence URL, review date and revisions,
and excludes historical entries and all other keys.

**Cloudflare staging activation on 2026-11-14:** a separate Worker named `atl-director-orbit-reader` was uploaded, enabled on its workers.dev subdomain and bound to ORBIT's existing KV with a server-side secret. Matching Vercel variables were created for the PR branch's **preview environment only**. This does not mean the application is functional end to end: the Supabase migrations are pending, the Worker was not verified over live HTTP, and the local Mac remains unconfigured. To fully activate after review:

1. Verify the deployed read-only Worker through an authenticated **server-side** integration test; never send the secret to the browser.
2. Verify `ORBIT_BRIDGE_URL` and `ORBIT_BRIDGE_TOKEN` are present on the **PR branch preview** only. Redeploy the preview if the new variables were added after build.
3. Identify the exact Supabase project attached to FORGE AI, then apply both reviewed Director migrations **only to that project**. Do not guess a project ID.
4. Authenticate to the preview of FORGE AI and use `/director` → **Synchroniser ORBIT**.
5. Review security and results before merging to production.

Sync updates ORBIT's stage, focus, note and next action. It does **not** overwrite
Director's commercial scoring. It does **not** write to ORBIT or execute an agent.
If there are no saved ORBIT portfolio records, it returns an empty sync.

### B. Local Mac priority feed to Ollama

The local loop now optionally reads ORBIT's `GET /api/priorities` endpoint
before consulting Ollama. It only accepts a loopback URL for that exact route:

```bash
# Replace PORT with the real local ORBIT gateway port on your Mac
export ORBIT_LOCAL_PRIORITIES_URL='http://127.0.0.1:PORT/api/priorities'
# Only if the local gateway requires its secret:
export ORBIT_GATEWAY_TOKEN='YOUR_LOCAL_GATEWAY_SECRET'
node scripts/atl-director-local.mjs
```

The gateway address and token have not been discovered or configured in this
environment. If ORBIT is offline, the local loop reports `orbit.status=unavailable`
without pretending to have read priorities. Its proposals remain non-executing.
The local report is stored at `~/.atl-director/latest.json` (user-only permissions).

### Next step

Once the Director migration, bridge and local gateway are configured:
build a secured, replay-safe ingestion pipeline so ORBIT-priority findings and
Director missions are reconciled in one cockpit. No autonomous scheduling or
outbound action is active yet.

### Private-account authorization

`POST /api/director/orbit` is **not available to all FORGE AI users**. In addition to a valid Supabase session, it requires a confirmed email matching the **server-only** `ORBIT_OWNER_EMAIL` environment variable. If that variable is absent or mismatched, access fails closed with HTTP 403. It was set only in the PR-specific Vercel preview. Never expose it through a `NEXT_PUBLIC_*` variable. This source access check is required even though each destination table already uses per-user RLS.

Local Mac verification is documented in [`claude-code-orbit-handoff.md`](./claude-code-orbit-handoff.md).
