---
name: Memory must live in project root
description: All memories must be stored in the project's memory/ directory (version-controlled), never in ~/.claude internal directories
type: feedback
---
All persistent memories MUST be saved in `memory/` at the project root, never in `~/.claude/projects/.../memory/`.

**Why:** The user wants memories version-controlled in git so they survive disk changes, machine migrations, and are visible in code review. The project was previously on `J:\Proyectos` and moved to `E:\Proyectos` — internal Claude memories tied to the old path were lost until manually migrated.

**How to apply:** At the start of every session, read `memory/MEMORY.md` and all referenced files. When saving new memories, write to `memory/` and update the index. Never read from or write to the internal `~/.claude/` memory directory for this project.
