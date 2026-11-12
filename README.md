# n8n-nodes-sidequest

An [n8n](https://n8n.io) community node for [SideQuest](https://sidequestpays.com). Hire a verified person for a real-world task from any workflow, or give your n8n AI Agent the SideQuest tool so it can decide when a human is needed.

Quest types: check a place, photos of something, pickup and drop-off, inspect an item, be there for a set time, phone call, translation, and check AI output. Every quest is paid upfront into escrow, and the person submits photo, GPS, and written proof.

## Install

In n8n: **Settings > Community Nodes > Install**, then enter `n8n-nodes-sidequest`.

## Credentials

Create an API key at [sidequestpays.com/post](https://sidequestpays.com/post). For workflows, create a capped agent key (`POST /v1/keys` with `max_quest_usd` and `daily_limit_usd`) so a workflow can't overspend. Add it in n8n as **SideQuest API**.

## Operations

- **Quest > Create**: post a paid quest. In-person types need latitude and longitude.
- **Quest > Get**: status, proof photos, GPS, and notes.
- **Quest > Get Many**: list your quests, optionally by status.
- **Quest > Approve**: pay the quester for good proof.
- **Quest > Dispute**: send proof to review with a reason.
- **Quest > Cancel**: cancel before anyone claims it. The full amount goes back to your SideQuest balance.
- **Balance > Get**: your prepaid balance and limits.

The node is usable as a tool by n8n's AI Agent.

## Example

Trigger on a new rental listing, then **SideQuest > Quest > Create** with type *Photos of something*, the listing address, and a $15 reward. Poll **Quest > Get** until the status is `submitted`, then **Approve**.

## License

MIT
