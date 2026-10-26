# 02: Notify instructors after coupon redemption

**What to build:** When a learner successfully redeems a course coupon, the course instructor sees the same persistent in-app enrollment notification as for an individual purchase.

**Blocked by:** 01: Show notifications for direct enrollments.

**Status:** ready-for-agent

- [ ] Successful coupon redemption creates one notification for the instructor who owns the course, using the same notification behavior and display as an individual purchase.
- [ ] Invalid, already-used, country-rejected, or duplicate enrollment attempts create no notification.
- [ ] Coupon consumption, enrollment creation, and notification creation succeed or fail together.
- [ ] Service-level tests verify successful redemption appears in the instructor’s notification data and unsuccessful redemption leaves no notification.
