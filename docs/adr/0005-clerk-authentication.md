# Clerk for authentication

## Status

Accepted

## Context and Problem Statement

The application needs user accounts to support saved searches and project features. Building authentication from scratch — password hashing, session management, OAuth provider integration, email verification, and account recovery — is high-risk and time-consuming for a small team. The security surface of a hand-rolled auth system is large and the maintenance burden is ongoing.

The alternatives evaluated were: Auth.js (NextAuth), Supabase Auth, and Clerk. Auth.js requires a server session store (incompatible with the stateless Workers model without extra plumbing). Supabase Auth bundles a Postgres database that is not needed here. Clerk provides a hosted auth service with a JavaScript SDK, JWT-based sessions that work naturally in a stateless Worker, and a generous free tier.

## Decision

Use Clerk as the authentication provider. Clerk handles sign-up, sign-in, session management, and JWT issuance. The Worker validates Clerk-issued JWTs on every protected request using Clerk's public keys, keeping auth stateless at the edge.

## Consequences

**Positive:**
- Drop-in JavaScript SDK handles all auth UI (sign-in, sign-up, account management) with no custom login pages required.
- Clerk free tier supports 10,000 monthly active users — sufficient for current and near-term scale.
- JWT-based sessions fit the Workers stateless model naturally; no session database or cookie store is needed.
- Clerk manages OAuth provider integrations (Google, GitHub, etc.) behind a single API.

**Negative:**
- External dependency on Clerk's availability and pricing; a pricing change could require migrating all user accounts to a different provider.
- Clerk's JWT public keys must be fetched and cached by the Worker; adds a step to the cold-start path that can fail if Clerk's JWKS endpoint is unavailable.
- User data (email, profile) lives in Clerk; exporting and migrating it to another provider is a manual, disruptive process.
- Clerk's free tier limits and terms of service can change; the project has no contractual guarantee beyond what's publicly posted.
