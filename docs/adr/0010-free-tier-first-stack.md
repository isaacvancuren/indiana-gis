# Free-tier-first stack

## Status

Accepted

## Context and Problem Statement

Mapnova is a public-good project with no revenue. Infrastructure costs must be near zero during the build phase, and the stack must remain operable if the founding contributor steps away — so it should avoid proprietary services that require ongoing manual billing, renewal, or account management by a specific individual. Every infrastructure choice carries implicit cost: monetary cost, operational cost, and the cost of onboarding new contributors who need access to paid services.

The practical consequence of this principle is that every service in the stack was evaluated first at its free tier. If the free tier was not adequate for the use case, the service was either not chosen or the use case was descoped. Paid tiers are not ruled out for the future but are evaluated only when a free-tier limit is demonstrably hit in production.

## Decision

Default every infrastructure choice to its free tier. The current stack is: Cloudflare Pages (free), Cloudflare Workers (free), Cloudflare D1 (free), and Clerk (free up to 10,000 MAU). No paid infrastructure is used. Paid tiers are considered only when a specific free-tier limit is hit and cannot be worked around.

## Consequences

**Positive:**
- Zero monthly infrastructure cost during development and early launch; a new contributor can fork and run the full stack without a credit card.
- Free tiers are publicly documented; onboarding does not require handing over billing credentials or adding contributors to a paid account.
- The constraint forces simplicity: features that cannot be built within free-tier limits are deferred or descoped rather than accruing infrastructure debt.
- Reduces the risk of an unexpected bill if traffic spikes or a bug causes runaway API calls.

**Negative:**
- Free tiers have hard limits (Workers CPU time, D1 row reads, Clerk MAU); hitting them unexpectedly during a traffic event could cause a service outage with no warning.
- Some Cloudflare features needed for scaling — Durable Objects (stateful edge compute), R2 egress beyond 10 GB/month, Workers paid compute time — are not available on the free tier and would require architectural changes to adopt.
- The project is dependent on Cloudflare's continued free-tier offering; a pricing model change would require re-evaluating the entire stack simultaneously.
- "Free tier first" can discourage investment in reliability features (monitoring, alerting, redundancy) that typically require paid plans.
