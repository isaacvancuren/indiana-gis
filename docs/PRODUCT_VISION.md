# Mapnova — Product Vision

> **This is the source of truth that drives autonomous agent decision-making.**
> When agents (the `@claude` action, the overnight queue, the vision-driver) need
> to decide between approaches, they should default to whatever this document says.
> Style choices, feature prioritization, and copy decisions all reference this.
>
> **Owner:** @isaacvancuren — only the owner edits this. PRs that propose changes
> here go to the owner first.

---

## ⚠️ Fill in the sections marked TODO before the autonomous workflows are useful

The autonomous workflows (`vision-driver.yml`, overnight queue, etc.) read this
document and base every decision on it. Empty TODOs = thin output. Rich TODOs =
agent ships features that match your vision.

Recommended: spend 30 minutes filling this in tonight. It compounds — every PR
agents ship from now on uses this as context.

---

## 1. Who is this for?

**Primary user:** TODO
> e.g., "Indiana realtors who need parcel + ownership + zoning data on one map without
> bouncing between county GIS websites." Or "land surveyors quoting jobs." Or
> "title companies running ownership chains."

**Secondary users:** TODO
> Any adjacent personas who'd also use this. Be honest about which you'll prioritize.

**Not for:** TODO
> Who explicitly is NOT the target user. (e.g., "not for hobbyists", "not for
> developers building their own tools on top of our data.") Anti-personas keep
> agents from shipping features for the wrong audience.

---

## 2. The job-to-be-done

When a user opens mapnova, what are they trying to accomplish in the next 60 seconds?

TODO — list the top 3 jobs. Examples:
> 1. "Look up the owner of a parcel I just walked past."
> 2. "Find every parcel in a polygon I draw and export their owner contacts."
> 3. "Save a project of selected parcels with my notes for later."

The order matters — feature priority should reflect this order.

---

## 3. What makes this 10× better than alternatives?

Existing alternatives the user could choose: ArcGIS Online, county GIS sites,
Beacon, Regrid, Google Maps + Zillow.

For each, what does mapnova do that they don't?

TODO — fill in:
- vs. county GIS sites: TODO
- vs. Regrid / Beacon: TODO
- vs. ArcGIS Online: TODO

This drives feature decisions. If a feature doesn't move us further from any of
these, it's noise.

---

## 4. Core feature surface (locked-in)

Things mapnova MUST do, and is doing or planning to do:

- [x] Statewide parcel discovery for Indiana (92 counties)
- [x] Search by address / parcel ID / owner (search bar, currently in progress per Issue #3)
- [x] Click-select / box / polygon / line selection of parcels
- [x] Annotate (draw shapes, add text, measurements)
- [x] Save selections + annotations as a Project (D1-backed via Clerk)
- [x] Auth via Clerk (Google + Microsoft + email)
- [ ] Per-feature color persistence
- [ ] Export selected parcels to CSV / KMZ / shapefile
- [ ] AI parcel search (Issue #4 epic)
- [ ] TODO — what else MUST exist for this to be useful?

---

## 5. Anti-features (explicitly NOT building)

Things we're NOT going to do, even if users ask:

- TODO — Social features (commenting, sharing user-to-user)? Yes/no.
- TODO — User-uploaded data layers? Yes/no.
- TODO — Marketplace / paid listings? Yes/no.
- TODO — Multi-state expansion before we nail Indiana? Yes/no.

Anti-features are as important as features. Without these, agents will helpfully
build everything anyone has ever asked for.

---

## 6. Pricing & monetization

TODO — what's the model?

- Free tier: TODO (what's free, for whom, indefinitely?)
- Paid tier(s): TODO (price points, what unlocks)
- Per-seat? Per-feature? Per-API-call?
- When does the user pay (timing, trigger)?

This drives engineering priorities — if monetization needs feature X (e.g., usage
quotas, billing UI), the agent prioritizes that.

---

## 7. Voice / tone / personality

How does the app talk to users?

TODO — pick:
- [ ] Professional & technical (think QGIS — terse, accurate, jargon OK)
- [ ] Friendly & accessible (think Notion — warm, plain English)
- [ ] Powerful but inviting (think Linear — confident, direct, no hand-holding)

Examples of copy in your preferred voice:
- Empty state: TODO
- Error message: TODO
- Onboarding tooltip: TODO

---

## 8. North Star metric

The single number that moving up = winning.

TODO — pick one:
- [ ] Weekly active users
- [ ] Projects saved per user
- [ ] Parcels selected per session
- [ ] Paid conversions
- [ ] Searches per session
- [ ] Other: TODO

When agents weigh feature trade-offs, they should pick the one that moves this
number, all else equal.

---

## 9. Out-of-scope decisions agents should escalate (not decide unilaterally)

TODO — fill in. Examples:
- Anything touching the pricing model or billing
- Adding a new dependency to package.json
- Changing the data model for existing user records (D1 schema migrations that drop columns)
- Touching the canary tokens in `docs/security-canaries.md`
- Adding a new external API integration (new third-party service)
- Switching from Clerk to another auth provider
- TODO

These get a comment on the issue from the agent: "This requires owner decision
because: [reason]. Pausing." Owner replies "approved: [direction]" and agent
continues.

---

## 10. Living changelog

Updates to this document are themselves PRs. Track major shifts here so the
history is greppable.

| Date | Change | PR |
|---|---|---|
| 2026-05-07 | Initial scaffolding created | (this PR) |
