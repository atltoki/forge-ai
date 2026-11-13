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
