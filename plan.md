# CSOC Flow project plan

> Seeded from the existing project report on 2026-10-02. The PM must verify each item against the repository and owner intent. The report's `project-board.json` is the board source of truth.

## Current tasks

- [x] **Resolve canonical CSOC codebase decision** — DECIDED 2026-10-15: the live `csoc-flow` repo (Vite + React 19, browser-only, Forgejo `naka/csoc-flow`) is the canonical CSOC Flow codebase. The older Next/vinext + Cloudflare D1 prototype (6 commits, 2026-07-28; kept on the owner laptop at a backup folder on the owner laptop) is its ancestor and stays a read-only archive. Nothing is deleted. (Owner: Owner; status: done 2026-10-15)
- [ ] **Confirm next product milestone** — Select the next user outcome after the current investigation narrative work. (Owner: PM; status: planned)
- [ ] **Validate export and presentation flows** — Exercise technical and executive outputs with a representative investigation. (Owner: QA; status: planned)
- [ ] **Visual investigation foundation delivered** — Evidence, hypotheses, MITRE context and browser-local operation are documented. (Owner: Engineering; status: done)

## Milestones

- [ ] **Investigation canvas baseline** — Core evidence and hypothesis workflow available. (date: 2026-09-02)
- [ ] **Narrative and handoff flow** — Investigation can be told as a sequence and handed upward. (date: 2026-09-02)
- [x] **Canonical repository decision** — Owner recorded which CSOC lineage remains authoritative: the live `csoc-flow` repo is canonical, the Next/vinext + D1 prototype is a read-only ancestor archive (decision of 2026-10-15, above). (date: 2026-10-15)
- [ ] **Next release** — Selected user outcome is built, verified and published. (date: TBD)

## Decisions and open questions

- [ ] Confirm purpose, scope, owner and success criteria where not already documented.
- [ ] Verify setup and quality gates in `SETUP.md`.
- [x] **Git/PR policy recorded 2026-10-05** (from the owner's Claude handoff; applicable cross-project rule, and `origin` verified as the LAN Forgejo `naka/csoc-flow` via `git remote -v` on 2026-10-05): Forgejo (LAN only) is the source of truth. Open PRs there only with `git push origin HEAD:refs/for/main -o topic=<branch> -o title="<title>"` (alias `git pr`). GitHub is a push-mirror target only — never push to it, never use `gh`. Start new branches from the current `origin/main`. The owner merges PRs; agents do not.
- [ ] **Reconcile README contributor flow with the Forgejo-only policy** — `README.md` still directs contributors to GitHub issues/PRs (`github.com/CaNakagawa/CSOCFlow`); confirm whether public contributions remain on GitHub while agent/owner Git actions use Forgejo. (Owner)
- [x] **Canonical codebase decided 2026-10-15** (owner decision, recorded in `project-board.json`: card `csoc-canonical` → done, milestone `csoc-m3` → done): the live `csoc-flow` repo (Vite + React 19, browser-only, Forgejo `naka/csoc-flow`) is the canonical CSOC Flow codebase. The older Next/vinext + Cloudflare D1 prototype (6 commits, 2026-07-28; kept on the owner laptop at a backup folder on the owner laptop) is its ancestor and stays a read-only archive. Nothing is deleted.
- [ ] **PM note:** keep creating Hermes kanban tasks with `created_by` = `default` or `xamiku` (handoff rule, 2026-10-05).

## Handoff log

- **2026-10-15** — Recorded the owner's canonical-codebase decision (tasks and milestones above) in `plan.md` and `project-board.json`; opened one Forgejo PR via `git push origin HEAD:refs/for/main -o topic=csoc-canonical-decision` for the owner to merge. Only those two files change; no GitHub push; nothing deleted.
- **2026-10-05** — Reviewed `/home/naka/Projects/HANDOFF-FROM-CLAUDE-2026-10-05.md`. No CSOC Flow-specific change: this repo is not in the handoff's per-project list (`my-site`, `agent-office`, `cyberhackrpg`, `imigraflowai`, `469`, `klarpflege`, `ai-usage-api`, `freexam`). Only the applicable cross-project Git/PR policy above was applied. `project-board.json` left unchanged — no project-specific state change, so no new card or milestone is warranted. No commit/push performed.
