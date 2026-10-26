# Instructor Enrollment Notifications: Feature Spec

## Problem Statement

Instructors have no in-app signal when a learner enrolls in one of their courses. They must discover new enrollments by checking student lists or other course views.

## Solution

Create a persistent in-app notification for the instructor whenever a learner successfully enrolls in their course. Give instructors a notification view with unread status and a direct link to the relevant course and student list. Cover both individual purchases and coupon redemption.

## User Stories

1. As an instructor, I want a notification when someone enrolls in one of my courses, so that I can stay informed without checking each course manually.
2. As an instructor with several courses, I want each notification to identify the course, so that I know where the enrollment happened.
3. As an instructor, I want each notification to identify the learner, so that I can recognize who joined.
4. As an instructor, I want to see when the enrollment happened, so that I can understand how recent it is.
5. As an instructor, I want to see which notifications are unread, so that I can identify updates I have not yet reviewed.
6. As an instructor, I want an unread count in the app navigation, so that I can notice new enrollments from other pages.
7. As an instructor, I want to open a notification and go to the relevant course’s student view, so that I can follow up without searching for the course.
8. As an instructor, I want to mark a notification as read, so that I can keep track of updates I have already reviewed.
9. As an instructor, I want to mark all notifications as read, so that I can clear the unread count after reviewing the list.
10. As an instructor, I want to see recent notifications first, so that the newest enrollment activity is easy to find.
11. As an instructor, I want an empty state when I have no notifications, so that the notification view remains understandable for new instructors.
12. As an instructor, I want my notification list to contain enrollments only from my courses, so that another instructor’s learner activity remains private.
13. As an instructor, I want the unread count to reflect only my unread notifications, so that activity from other instructors does not affect my navigation.
14. As an instructor, I want successful coupon redemptions to notify me just like direct purchases, so that team-provided course seats are visible too.
15. As an instructor, I want unsuccessful or duplicate enrollment attempts to produce no notification, so that the list reflects actual enrollments.
16. As an instructor, I want a notification to remain available after I leave the page or sign back in, so that I do not miss activity while away.
17. As an instructor, I want notification links to remain scoped to courses I own, so that I cannot use another instructor’s notification to access their course data.
18. As an instructor, I want the notification view and unread indicator to work on narrow screens, so that I can check activity from a phone.

## Implementation Decisions

- Add persistent notification records associated with the recipient instructor and the enrollment, learner, and course that caused the notification. Store creation time and read time; a missing read time means unread.
- Create the notification as part of the successful enrollment operation so enrollment and notification persistence succeed or fail together.
- Route all enrollment-producing flows through a shared enrollment operation, including purchase and coupon redemption, so no successful path silently skips notifications.
- Create one notification for each newly created enrollment. Validation failures, duplicate prevention, and unsuccessful coupon redemption create none.
- Notify the instructor who owns the course when the enrollment occurs. Notification queries and read mutations must be scoped to the authenticated instructor.
- Provide an instructor notification list and unread count, with newest items first. Each item includes learner name, course title, and enrollment time.
- Provide a navigation indicator for unread notifications and controls to mark one or all notifications as read. Opening a notification marks it read and links to that course’s student list.
- Require an authenticated instructor role for notification data and mutations. Do not expose notification records to learners, admins, or instructors who do not own the course.
- Load notification state through normal app requests. Live push delivery is not required for this release.
- Keep notification wording and UI focused on enrollment; other notification types can be added separately.

## Testing Decisions

- Test externally visible service behavior using the existing in-memory SQLite setup and real service modules. Assert notification records and returned notification data, not SQL structure, private helper organization, or component class names.
- Use the enrollment service boundary as the primary seam, as agreed. Verify an enrollment and its notification are created together, notification content and recipient are correct, and rejected or duplicate enrollment attempts do not create extra notifications.
- Exercise both current enrollment paths: direct purchase and coupon redemption. Verify both produce the same instructor-facing notification behavior.
- Test the notification service’s list ordering, unread count, mark-one-read and mark-all-read behavior, empty results, and isolation between instructors.
- Test the instructor-facing route boundary for unauthenticated access, wrong roles, cross-instructor access, and links/data scoped to owned courses.
- Prior art: enrollment, coupon, and purchase service tests use seeded in-memory SQLite databases; the instructor analytics route tests exercise authenticated instructor access and ownership boundaries.

## Out of Scope

- Email, SMS, browser push, or external messaging.
- Real-time delivery while an instructor is already using the app.
- Notification preferences, digests, batching, or delivery scheduling.
- Notification types for purchases, comments, course updates, completions, or analytics.
- Admin notification feeds or student-facing notifications.
- Deleting notifications or configuring retention periods.

## Further Notes

- The current code creates enrollments through both the enrollment service and coupon redemption logic. The implementation must account for both paths to make the feature complete.
- The repository has no root glossary or ADRs at this time. The feature should follow existing instructor authorization and service-test patterns.
