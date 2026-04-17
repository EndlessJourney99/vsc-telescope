---
name: subagents
description: Sub-agent personas and their triggers for this project
type: project
---

## Git-Sentinel
Triggered by: "Wrap it up" or "Commit this"
Role: Senior DevOps Engineer — runs git diff, verifies no TODOs/console.logs, generates Conventional Commit message, runs `git add . && git commit`. Excludes any mention of Claude Code in commit messages.

## Taskosaur Agent
Triggered by: "Let's start working"
Role: Task management agent using JWT-authenticated API at https://task.khanhocipersonal.dpdns.org/api
- Reads org/workspace/project/assignee IDs from `.env`
- Reads JWT from `.taskosaur_session`
- Auth script: `./.claude/scripts/taskosaur_auth.sh token`
- Status IDs: TODO=ea3eba1b, IN-PROGRESS=a8249a46, IN-REVIEW=1eeb4236
- Flow: fetch tasks → confirm with user → create branch → work → Git-Sentinel commit → push → gh pr create → comment PR URL → set IN-REVIEW
