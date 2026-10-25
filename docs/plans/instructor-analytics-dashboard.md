# Instructor Analytics Dashboard: Delivery Plan

## Goal

Give instructors a private, mobile-friendly view of purchase activity and current learner progress across their courses, with enough context to identify where they may want to investigate.

## Agreed product scope

- Instructors see only analytics for courses they own. Include inactive or archived courses with historical data and label their status. Admin analytics are out of scope for this release.
- The overview shows purchase count, current enrollment count, and current completion rate, followed by purchase trends and lesson progression details.
- Default the purchase range to the last 30 days and compare with the immediately preceding range of equal length. The course filter applies across the overview.
- Learning metrics are current snapshots, independent of the purchase date range. Completion is completed current enrollments divided by current enrollments; show both counts.
- The lesson funnel follows the ordered lesson sequence. A learner has reached a lesson when its status is in progress or completed; moving to the next step means the next lesson is in progress or completed. Show counts and rates.
- Suppress rates when fewer than five learners are in the relevant group, while retaining useful counts.
- Refresh at least daily and show the last-updated time. Prefer on-demand reads if they meet the refresh and response needs; use scheduled snapshots only if needed.
- Show evidence-based purchase decline and lesson drop-off flags with their values and course context. Link flags to course details, allow dismissal, and resurface only after the condition clears and recurs or materially worsens.
- Keep the overview, filters, summaries, and key trends usable on mobile.
- V1 excludes revenue, refunds, conversion, video engagement, learner-level detail, side-by-side course comparisons, CSV export, and admin analytics.

## Phases

### Phase 0 — Finish delivery setup

1. Complete GitHub CLI device authentication for the selected repository.
2. Create any missing default triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`.
3. Publish the prepared instructor analytics spec as a GitHub issue with the `ready-for-agent` label.

**Exit:** The issue is available in GitHub and the repository labels match `docs/agents/triage-labels.md`.

### Phase 1 — Establish the analytics read model

1. Confirm query definitions for purchase counts, current enrollments, current completion, and lesson progression against the existing schema and data services.
2. Aggregate only data belonging to the authenticated instructor’s owned courses; include inactive owned courses.
3. Apply the date range and equal-length previous-period comparison to purchases only. Keep completion and progression independent of that range and label them as current snapshots.
4. Centralize the small-cohort threshold and initial flag thresholds: flag a purchase decline at 30% or more when the previous period has at least five purchases; flag lesson drop-off at 50% or more when at least five learners reached that lesson.
5. Define how dismissed flags are stored and how recurrence or material worsening is recognized, using existing persistence patterns where possible.

**Exit:** The dashboard loader can return a typed, instructor-scoped view model with correct metric values, period context, data timestamp, and flags.

### Phase 2 — Add the protected dashboard data route

1. Extend the existing instructor dashboard flow with analytics data and course/date filter inputs.
2. Require an authenticated Instructor role and validate ownership for every requested course. Reject unauthorized course IDs without returning their analytics.
3. Return aggregate data only; do not expose learner identities or individual progress records.
4. Include empty states, status labels, update time, and clear metric scope in the returned data.

**Exit:** The route loader returns the intended analytics for authorized instructors and denies unauthenticated, wrong-role, and cross-owner access.

### Phase 3 — Build the dashboard interface

1. Add overview cards for purchase count, current enrollments, and completion rate with numerator and denominator.
2. Add a course filter that includes owned courses with historical data and a purchase date-range selector defaulted to 30 days.
3. Show purchase trends and comparison with the preceding equal-length period.
4. Show current completion and the ordered lesson progression funnel, with rates suppressed below the minimum cohort threshold and counts retained.
5. Add loading, empty, insufficient-data, and error states; make the different time scopes explicit in labels.
6. Adapt charts and controls for mobile without hiding essential counts or comparison context.

**Exit:** Instructors can use the overview on desktop and mobile, and every displayed value is understandable without inferring an unstated date scope.

### Phase 4 — Add and verify evidence-based flags

1. Show a purchase decline flag only when the previous-period minimum count and decline threshold are met.
2. Show lesson drop-off flags only when the reached-learner minimum and drop-off threshold are met.
3. Include measured values and course context; link each flag to the relevant detail.
4. Implement dismissal, clearing, recurrence, and material-worsening behavior without asserting a cause for the metric change.

**Exit:** Flags are actionable, repeatable from data, dismissible, and do not appear for undersized groups.

### Phase 5 — Verify behavior and release

1. Test the instructor analytics route loader through its external interface using the existing in-memory SQLite setup and real data modules.
2. Cover role and ownership access, inactive owned courses, date filtering and comparison, current enrollment/completion definitions, lesson ordering and drop-off, small cohorts, empty data, flag lifecycle, and update metadata.
3. Check user-visible responsive behavior and that labels distinguish purchase periods from current learning snapshots.
4. Review metric results against representative seeded data before release. Do not add tests of SQL structure, private helper layout, or CSS class names.

**Exit:** Access rules, calculations, flag behavior, and visible metric context meet the agreed scope.

## Data constraints and risks

- Purchase records contain a paid amount but no reliable currency or refund fields. Do not aggregate those amounts into revenue.
- Enrollment records include enrollment and completion dates, but deleting an enrollment may erase its history. Do not report historical completion cohorts.
- Lesson progress has status and completion time but no reliable last-activity timestamp. Do not claim that a learner is stalled or inactive for a duration.
- Video events are not standardized enough for consistent engagement metrics. Keep them out of V1.
- If on-demand aggregation cannot meet the dashboard’s performance needs, add a daily read snapshot without changing the user-facing metric definitions.

## Completion criteria

- An instructor can see analytics only for their own courses, including inactive courses with historical data.
- Purchase counts use the selected date range and previous equal-length comparison; current learning metrics remain clearly labeled snapshots.
- Completion and lesson progression show interpretable counts, suppress unstable small-sample rates, and do not expose learner identities.
- Flags meet their thresholds, link to relevant course details, and follow the agreed dismissal lifecycle.
- The dashboard works on mobile and shows when its data was updated.
