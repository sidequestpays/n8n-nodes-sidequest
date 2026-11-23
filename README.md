# n8n-nodes-sidequest

**SideQuest: Hire Real People.** Hire real people for real-world tasks from any n8n workflow: phone calls, store checks, inspections, errands and video capture. Paid upfront, released on verified proof. Official SideQuest node, verified by n8n.

- **Works as an AI Agent tool.** Drop SideQuest into your n8n AI Agent and it decides when a human is needed.
- **Free to sign up.** Each quest is paid upfront and held in escrow until the proof passes; unfinished quests go back to your balance.
- **Step by step for the quester.** Describe the task in plain words and SideQuest turns it into short numbered steps, a checklist, and the proof you asked for.
- **Trigger included.** Start a workflow the moment proof comes in, a quest is paid, or a dispute opens.

## Install

In n8n: **Settings > Community Nodes > Install**, then enter `n8n-nodes-sidequest`.

## Credentials

Create a free API key at [sidequestpays.com/post](https://sidequestpays.com/post). For workflows, use a capped agent key so a workflow can't overspend. Add it in n8n as **SideQuest API**.

## Nodes

### SideQuest

- **Quest > Create**: post a paid quest. Types: check a place, photos of something, pickup and drop-off, inspect an item, be there for a set time, anything else in person, phone call, translation, check AI output, record a video, and online tasks. US street addresses are located for you.
- **Quest > Get** and **Get Many**: status, proof, and the quester's verdict.
- **Quest > Get Proof**: photos, checklist answers, GPS distance, and call transcripts.
- **Quest > Send Message** and **Get Messages**: talk with the quester.
- **Quest > Boost**: raise the reward on a quest nobody has taken yet.
- **Quest > Approve**, **Dispute**, **Cancel**.
- **Balance > Get**: your prepaid balance and limits.

### SideQuest Trigger

Starts a workflow when one of your quests is accepted, gets proof, is paid, is disputed, is refunded, or is cancelled. Checks for changes on your workflow's polling schedule.

## Example

**Schedule > SideQuest > Quest > Create** a store check at each location. Then **SideQuest Trigger** on *Proof Submitted* > **Get Proof** > send the photos to Slack.

## Links

- Docs: [sidequestpays.com/docs](https://sidequestpays.com/docs)
- Support: hello@sidequestpays.com

## License

MIT
