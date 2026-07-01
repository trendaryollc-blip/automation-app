# Sub-processors and data residency

DropFlow uses a small number of third-party services to run. Under
GDPR and most privacy regulations, every third party that processes
customer data is a "sub-processor" and must be disclosed in the
Privacy Policy and (where required) in a Data Processing Agreement
(DPA).

> **Action required before public launch:** Have a lawyer review this
> list. Update `pages/privacy.tsx` to mention every entry below,
> link to each provider's privacy / DPA page, and disclose data
> residency.

## Infrastructure

| Provider                                                   | What we use it for                                  | Data processed                                 | Region(s)                       | DPA / Privacy                                            |
| ---------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- | ------------------------------- | -------------------------------------------------------- |
| Vercel                                                     | Frontend hosting, serverless API                    | All HTTP traffic, request logs, IPs            | Configurable (default: US East) | https://vercel.com/legal/dpa                             |
| Managed Postgres (Neon / Vercel Postgres / Supabase / RDS) | Primary data store                                  | All customer data (users, products, orders, …) | Configurable                    | Provider-specific. Get the signed DPA from the provider. |
| Resend                                                     | Transactional email (signup verify, password reset) | Email address, name, message body              | US / EU                         | https://resend.com/legal/dpa                             |

## Observability

| Provider | What we use it for             | Data processed                            | Region  | DPA / Privacy                |
| -------- | ------------------------------ | ----------------------------------------- | ------- | ---------------------------- |
| Sentry   | Error & performance monitoring | Stack traces, request URL, IP, user agent | US / EU | https://sentry.io/legal/dpa/ |

## Cookies DropFlow sets

| Cookie                                                                      | Purpose                       | Lifetime | Type      |
| --------------------------------------------------------------------------- | ----------------------------- | -------- | --------- |
| `<AUTH_COOKIE_NAME>` (a single HTTP-only cookie, default name `df_session`) | Holds the signed JWT session. | 7 days   | Necessary |
| (No third-party cookies. No analytics or marketing cookies.)                |                               |          |           |

## What the Privacy Policy MUST say

When you finalize the Privacy Policy, the following sections are
required to be GDPR-compliant:

1. **Identity and contact details** of the controller.
2. **Contact details of the data protection officer** (if you have one).
3. **Purposes and legal basis** of processing (contract, legitimate
   interest, consent).
4. **Categories of data** collected (account, business data,
   technical).
5. **Recipients** of the data — i.e. this sub-processor list.
6. **Data transfers outside the EU/EEA** — disclose and reference
   Standard Contractual Clauses (SCCs) or an adequacy decision.
7. **Retention periods** for each category.
8. **Data subject rights** — access, rectification, erasure,
   restriction, portability, objection, withdrawal of consent.
9. **Right to lodge a complaint** with the supervisory authority.
10. **Whether provision of data is a statutory or contractual
    requirement**, and the consequences of not providing it.

## Before public launch

- [ ] Update `pages/privacy.tsx` with the company name, address,
      contact email, effective date.
- [ ] Add the sub-processor table above to the Privacy Policy.
- [ ] Add explicit consent (the signup checkbox is already in place).
- [ ] Sign a DPA with each sub-processor.
- [ ] Sign and store a reciprocal DPA template with paying customers
      on request.
- [ ] Confirm `security@dropflow.com`, `privacy@dropflow.com`, and
      `legal@dropflow.com` mailboxes are configured and monitored.
- [ ] Run a Data Protection Impact Assessment (DPIA) for the AI
      features if they are exposed to EU users.
