# 01: Show notifications for direct enrollments

**What to build:** When a learner enrolls through an individual course purchase, the instructor can see a persistent in-app notification with the learner, course, and enrollment time, and can review it from the app.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A successful individual purchase creates one persistent notification for the instructor who owns the course, together with the enrollment.
- [ ] Failed or duplicate enrollment attempts do not create notifications.
- [ ] Instructors can see their notifications newest first, including learner name, course title, and enrollment time, with a useful empty state.
- [ ] The instructor navigation shows the unread count; instructors can mark one notification or all notifications as read.
- [ ] Opening a notification marks it read and links to the relevant course’s student view.
- [ ] Notification data and read actions require an authenticated instructor and are scoped to that instructor’s courses and notifications.
- [ ] Service-level tests verify creation, content, transaction behavior, read state, ordering, unread count, empty results, and cross-instructor isolation; route tests verify authorization behavior.
- [ ] The notification view and unread indicator remain usable on narrow screens.
