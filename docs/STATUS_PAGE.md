# Status Page

This is a **template** for the DropFlow public status page.  Once
you've chosen a status-page provider (Atlassian Statuspage, Better
Stack, Instatus, Hyperping, or a self-hosted alternative like
Cachet), copy this content into the relevant fields and adjust the
URLs.

## Service name

**DropFlow**

## Page URL (placeholder)

`https://status.dropflow.com` — provision this as a CNAME to your
status page provider.

## Components

- **DropFlow Web** (`https://app.dropflow.com`) — the customer-facing
  dashboard.
- **DropFlow API** (`https://app.dropflow.com/api/*`) — the JSON
  REST API used by the dashboard.
- **DropFlow Webhooks** (`https://app.dropflow.com/api/webhooks/*`)
  — inbound webhooks from connected stores.
- **DropFlow Email** — transactional email delivery (password reset,
  verification, etc.).
- **DropFlow Database** — managed PostgreSQL.

## Health check URLs

Use these to drive automated uptime checks (Pingdom, Better Uptime,
internal monitoring, …):

- `GET https://app.dropflow.com/api/healthz` — liveness (200 = up).
- `GET https://app.dropflow.com/api/readyz` — readiness (200 = ready,
  503 = degraded).  Includes a database round-trip.

## Incident communication policy

- **Sev 1** (total outage, data loss, security breach): status page
  updated within 5 minutes, customer email within 30 minutes.
- **Sev 2** (major feature broken): status page within 15 minutes.
- **Sev 3** (minor degradation): status page within 1 hour.
- **Maintenance windows**: announced 7 days in advance for planned
  changes > 5 minutes of downtime, 24 hours in advance otherwise.

## Subscriber channels

- **Email**: opt-in via account settings (future).
- **Web**: status.dropflow.com
- **Webhook** (for status-page→Slack integrations): the provider's
  public webhook URL.

## Historical uptime target

**99.9% rolling 90-day** for the Web and API components.
**99.5%** for Email (a single-provider outage is mitigated by
falling back to the in-process log sender).

## Runbook (internal)

The internal incident runbook lives at `runbook/INCIDENTS.md` (not
checked in).  It includes:

- Who is on-call (PagerDuty rotation).
- How to acknowledge an alert.
- How to roll back the Vercel deployment.
- How to disable signup in a hurry (`SIGNUP_ENABLED=false`).
- How to put the API in maintenance mode (set a `503` on `/readyz`).
- The communication templates for each severity.
