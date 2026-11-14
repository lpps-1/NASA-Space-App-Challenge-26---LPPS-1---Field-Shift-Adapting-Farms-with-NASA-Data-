# HANDOFF.md: notes between the two Claudes

Two Claude Code assistants work on this project at the same time, one for each teammate.
This file is how they tell each other what was done last and what is left.

| Who | Git branch | Section of this file they write in |
| --- | --- | --- |
| **Majid's Claude** | `majid` | "Majid's Claude" below |
| **Abdullah's Claude** | `abdullah` | "Abdullah's Claude" below |

`main` holds only the first commit. Finished work is merged into it later.

## Rules for both Claudes

1. **Read this file first**, at the start of every session, before changing any code.
   The newest copy is on the other teammate's branch, so fetch first:
   ```bash
   git fetch origin
   git show origin/majid:HANDOFF.md      # Majid's Claude's latest notes
   git show origin/abdullah:HANDOFF.md   # Abdullah's Claude's latest notes
   ```
2. **Write only in your own section.** Don't edit the other Claude's section. If you disagree with
   something there, add a line about it under "Questions for the other Claude" in your own section.
3. **Before you start a task** from "Tasks left", put your name in its "Taken by" column, commit and
   push, so the other Claude doesn't start the same task.
4. **When you finish a task**, update "Last task done", tick the task in "Tasks left", commit and push.
5. Keep entries short: what changed, which files, anything the other Claude must know.
6. Project rules are in `AGENTS.md`. Project status is in `../../1 - Project Status/STATUS.md` (outside the repo).

---

## Majid's Claude (branch `majid`)

**Last updated:** 14 Nov 2026

**Last task done:**
- Uploaded the pre-event prototype to `majid` as 11 commits ("Prototype part N/11 (pre-event)").
- Added the note on offline work and uploading in parts to `README.md`.
- Added this file and the "Two Claudes and HANDOFF.md" section to `README.md`.

**Working on now:** nothing.

**Questions for the other Claude:** none yet.

---

## Abdullah's Claude (branch `abdullah`)

**Last updated:** (not yet)

**Last task done:** (not yet)

**Working on now:** (not yet)

**Questions for the other Claude:** (not yet)

---

## Tasks left (shared list)

From the project status of 14 Nov 2026 (prototype about 40% done). Put your name in "Taken by" before starting.

| # | Task | Taken by | Done |
| --- | --- | --- | --- |
| 1 | Add a second and third NASA dataset (e.g. SMAP soil moisture, MODIS NDVI, GPM rainfall) and show them as evidence in each rotation | | ☐ |
| 2 | Farm map: field location, NASA data point, soil unit | | ☐ |
| 3 | Get someone who farms or studies agriculture to check the crop figures and top suggestions | | ☐ |
| 4 | Native-speaker review of the Urdu and Punjabi text (new Punjabi text falls back to Urdu) | | ☐ |
| 5 | Fix the wheat sowing window: 1–25 Nov in one place, 1–20 Nov in another | | ☐ |
| 6 | Update or remove the old planning docs (`MIGRATION_PLAN.md`, `PROJECT_AUDIT.md`, `FEATURE_STATUS.md`) that describe an earlier version | | ☐ |
| 7 | Record the 30-second demo video (rules: no minors on screen, label AI use) | | ☐ |
| 8 | Write the submission text, describing the pre-event prototype accurately | | ☐ |
