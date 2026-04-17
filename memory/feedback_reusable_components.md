---
name: Reusability-first design contract
description: Every piece of software must be designed for reuse — if a change must be applied in more than one place, refactor into a shared unit
type: feedback
---
Before writing any new piece of software (component, service, pipe, directive, utility, validation, etc.), think about whether it will be needed elsewhere in the project. If the answer is yes — or even maybe — extract it into a reusable, centralized unit from the start.

**Why:** Duplicated logic means duplicated maintenance. If a change has to be applied in more than one place, the design is already wrong. The user considers this a hard rule, not a suggestion.

**How to apply:**
- Before implementing, scan the codebase for existing code that does the same or similar thing. Reuse it or extend it instead of writing a new version.
- If the logic could reasonably appear in more than one context, extract it into a shared component/service/module and import it everywhere it is needed.
- If you find yourself copying or adapting code from one place to another, stop — refactor into a single source of truth first, then reference it from both locations.
- The threshold is strict: needing to apply the same change in **more than one place** already signals a design problem that requires refactoring.
- This applies at every level: components, templates, styles, services, pipes, directives, validators, mappers, utilities.
- Shared components live next to the domain model they represent. The component owns layout, validation, and request assembly. The parent owns HTTP, navigation, and visual chrome.
- Use `<ng-content>` / projection for extensibility when a consumer needs to inject context-specific UI.
