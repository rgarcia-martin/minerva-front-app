---
name: Proactive model-switch suggestions
description: Pause and advise the user whenever a sonnet↔opus switch is warranted by the upcoming workload
type: feedback
---
Before starting a significant block of work, assess its cognitive load and pause to suggest a model change when one is warranted — both ways:
- Sonnet → Opus when the upcoming task involves complex architectural decisions, multi-system refactors, or reasoning across 5+ interdependent files.
- Opus → Sonnet once the hard thinking is done and the remaining work is mechanical execution of an approved plan.

**Why:** The user optimizes token/cost usage and wants Opus reserved for genuinely hard reasoning. Leaving Opus on for mechanical execution wastes budget; staying on Sonnet through an architectural decision risks weak output. The user has explicitly asked to be told when to switch.

**How to apply:**
- At plan approval time, state whether the execution phase still needs Opus or can drop to Sonnet, and ask the user to switch.
- If mid-task the workload shifts (e.g. a mechanical refactor uncovers an architectural dilemma), pause and recommend switching up to Opus before continuing.
- Recommendation must be explicit and actionable — name the target model and the reason in one sentence.
- Do not switch silently or assume the user already did; wait for confirmation.
