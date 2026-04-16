# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memory (MANDATORY)

**At the start of every session, read `memory/MEMORY.md` and all files it references.** This is the project's version-controlled memory system and is the single source of truth for accumulated decisions, feedback, and context across sessions.

- **Use `memory/` (project root) instead of `~/.claude/projects/.../memory/`.** All memories MUST be stored in the project's `memory/` directory so they are tracked by git.
- When the user asks to remember something or gives feedback worth persisting, write it to a file in `memory/` following the frontmatter format (`name`, `description`, `type`) and add a one-line pointer in `memory/MEMORY.md`.
- Before writing a new memory, check if an existing one should be updated instead.
- When recalling or applying memories, always read from `memory/` — never from the internal Claude profile directory.

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
