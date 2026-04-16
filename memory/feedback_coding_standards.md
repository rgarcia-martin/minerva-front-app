---
name: Coding standards and practices
description: Mandatory rules for all code generation - SOLID, design patterns with comments, English-only code, no literals in methods
type: feedback
---
Always apply SOLID principles, design patterns and clean code, adding comments that explain WHY a specific pattern was chosen.

**Why:** The user values clean, principled architecture and wants the reasoning behind design decisions to be visible in the code itself.

**How to apply:**
- Apply SOLID and relevant design patterns in every class/module. Add a comment explaining the pattern choice and why it fits.
- All code MUST be written in English: class names, method names, variables, comments — everything. Conversation with the user stays in Spanish.
- Never use string/numeric literals inline in methods. Define them as constants, then reference those constants in the code.
