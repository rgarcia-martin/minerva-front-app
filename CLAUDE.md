# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memory (MANDATORY)

**At the start of every session, read `memory/MEMORY.md` and all files it references.** This is the project's version-controlled memory system and is the single source of truth for accumulated decisions, feedback, and context across sessions.

- **Use `memory/` (project root) instead of `~/.claude/projects/.../memory/`.** All memories MUST be stored in the project's `memory/` directory so they are tracked by git.
- When the user asks to remember something or gives feedback worth persisting, write it to a file in `memory/` following the frontmatter format (`name`, `description`, `type`) and add a one-line pointer in `memory/MEMORY.md`.
- Before writing a new memory, check if an existing one should be updated instead.
- When recalling or applying memories, always read from `memory/` — never from the internal Claude profile directory.

## Workflow Rules

- ALWAYS plan before acting. For ANY task that touches more than 1 file, produce a numbered plan first and wait for approval before executing.
- Use Sonnet for all standard work. Switch to Opus ONLY when the task involves: complex architectural decisions, multi-system refactoring, or deep reasoning across 5+ interdependent files.
- Delegate exploration and file reading to subagents (Explore). Never read large files directly in the main context.
- Keep responses terse. No preambles, no summaries of what you're about to do, no restating the question.
- When running tests or builds, only show failures. Suppress passing output.


## Delegation Rules

- File discovery, code search, dependency tracing → Explore subagent (Haiku)
- Planning for any task touching >1 file → `planner` agent (Sonnet, `.claude/agents/planner.md`). Produces numbered plan, never writes code.
- Implementing ONE approved plan step → `executor` agent (Haiku, `.claude/agents/executor.md`). One step per invocation.
- Multi-step implementation without a plan → general-purpose subagent (fallback only)
- Single-file edits, quick fixes, config changes → do directly (no subagent needed)

## Code Standards

- Follow existing patterns in the codebase
- Write tests for new functions
- Prefer small, focused commits

## Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run start

# Run dev server with proxy to back-end
npm run start -- --proxy-config proxy.conf.json

# Run tests
npm test

# Build for production
npm run build
```

## Architecture

Angular front-end application for the Minerva POS system. Connects to the `minerva-core` Spring Boot REST API.

## Compact Instructions

When compacting, preserve: code changes made, test results, current plan steps, and file paths discussed. Discard: exploration output, search results, and verbose tool responses.
