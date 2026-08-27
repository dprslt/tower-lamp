# LLM Paper Trail

Audit trail for AI agents working on this repo. When you hit a problem and solve it
(partially or fully), add a dated entry so the next agent does not re-derive the
diagnosis from scratch.

Rules:

- One entry per problem, using the template below.
- **Never** put passwords, tokens, or private keys in this folder — it is committed.
  Point to the file/place where they live instead (e.g. `/root/pi-password.txt` on the Pi).
- Status must be `resolved`, `workaround`, or `open` — be honest; an `open` entry with a
  diagnosis trail is more useful than no entry.
- Keep commands/logs short: the essence, not the transcript.

## Template

```markdown
### <Problem title>

- **Date:** YYYY-MM-DD
- **Component:** <OS | backend | frontend | fcserver | tooling | deploy>
- **Status:** resolved | workaround | open

**Symptom**
What was observed (error message, behavior).

**Diagnosis trail**
Evidence and reasoning that isolated the cause. Include the decisive commands/logs.

**Root cause**
The underlying reason, one paragraph.

**Fix applied**
Exact changes made.

**Prevention / follow-up**
How to avoid it next time, or what remains to be done.
```

## Index

- [2026-08-27 Pi OS migration](2026-08-27-pi-migration.md) — stretch → trixie, native systemd deploy, FadeCandy bring-up on a Pi Zero W (armv6).