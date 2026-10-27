import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import { enrollUser } from "./enrollmentService";
import {
  getInstructorNotifications,
  getUnreadInstructorNotificationCount,
  markAllInstructorNotificationsAsRead,
  markInstructorNotificationAsRead,
} from "./instructorNotificationService";

describe("instructorNotificationService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  it("creates an instructor notification with the enrollment", () => {
    const enrollment = enrollUser(base.user.id, base.course.id, false, false);
    const notifications = getInstructorNotifications(base.instructor.id);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      learnerId: base.user.id,
      learnerName: base.user.name,
      courseId: base.course.id,
      courseTitle: base.course.title,
      readAt: null,
    });
    expect(Date.parse(notifications[0].createdAt)).toBeGreaterThanOrEqual(
      Date.parse(enrollment.enrolledAt)
    );
    expect(getUnreadInstructorNotificationCount(base.instructor.id)).toBe(1);
  });

  it("does not create another notification for a rejected duplicate enrollment", () => {
    enrollUser(base.user.id, base.course.id, false, false);

    expect(() =>
      enrollUser(base.user.id, base.course.id, false, false)
    ).toThrow("User is already enrolled in this course");
    expect(getInstructorNotifications(base.instructor.id)).toHaveLength(1);
  });

  it("orders notifications newest first and scopes them to each instructor", () => {
    const secondLearner = testDb
      .insert(schema.users)
      .values({
        name: "Second Learner",
        email: "second-learner@example.com",
        role: schema.UserRole.Student,
      })
      .returning()
      .get();
    const otherInstructor = testDb
      .insert(schema.users)
      .values({
        name: "Other Instructor",
        email: "other-instructor@example.com",
        role: schema.UserRole.Instructor,
      })
      .returning()
      .get();
    const otherCourse = testDb
      .insert(schema.courses)
      .values({
        title: "Other Course",
        slug: "other-course",
        description: "Another course",
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        status: schema.CourseStatus.Published,
      })
      .returning()
      .get();

    const firstEnrollment = enrollUser(
      base.user.id,
      base.course.id,
      false,
      false
    );
    const secondEnrollment = enrollUser(
      secondLearner.id,
      base.course.id,
      false,
      false
    );
    enrollUser(secondLearner.id, otherCourse.id, false, false);

    const instructorNotifications = getInstructorNotifications(
      base.instructor.id
    );
    expect(instructorNotifications.map((item) => item.learnerId)).toEqual([
      secondLearner.id,
      base.user.id,
    ]);
    expect(instructorNotifications.map((item) => item.courseId)).toEqual([
      base.course.id,
      base.course.id,
    ]);
    expect(instructorNotifications[0].id).toBeGreaterThan(
      instructorNotifications[1].id
    );
    expect(getInstructorNotifications(otherInstructor.id)).toHaveLength(1);
    expect(firstEnrollment.id).toBeLessThan(secondEnrollment.id);
  });

  it("marks one or all of an instructor’s notifications as read", () => {
    enrollUser(base.user.id, base.course.id, false, false);
    const secondLearner = testDb
      .insert(schema.users)
      .values({
        name: "Second Learner",
        email: "second-learner@example.com",
        role: schema.UserRole.Student,
      })
      .returning()
      .get();
    enrollUser(secondLearner.id, base.course.id, false, false);
    const [latest, older] = getInstructorNotifications(base.instructor.id);
    const otherInstructor = testDb
      .insert(schema.users)
      .values({
        name: "Other Instructor",
        email: "other-instructor@example.com",
        role: schema.UserRole.Instructor,
      })
      .returning()
      .get();
    const otherCourse = testDb
      .insert(schema.courses)
      .values({
        title: "Other Course",
        slug: "other-course",
        description: "Another course",
        instructorId: otherInstructor.id,
        categoryId: base.category.id,
        status: schema.CourseStatus.Published,
      })
      .returning()
      .get();
    const thirdLearner = testDb
      .insert(schema.users)
      .values({
        name: "Third Learner",
        email: "third-learner@example.com",
        role: schema.UserRole.Student,
      })
      .returning()
      .get();
    enrollUser(thirdLearner.id, otherCourse.id, false, false);

    expect(
      markInstructorNotificationAsRead(base.instructor.id, latest.id)?.courseId
    ).toBe(base.course.id);
    expect(getUnreadInstructorNotificationCount(base.instructor.id)).toBe(1);
    expect(markAllInstructorNotificationsAsRead(base.instructor.id)).toBe(1);
    expect(getUnreadInstructorNotificationCount(base.instructor.id)).toBe(0);
    expect(
      markInstructorNotificationAsRead(base.instructor.id, older.id)?.readAt
    ).not.toBeNull();
    expect(getUnreadInstructorNotificationCount(otherInstructor.id)).toBe(1);
  });

  it("returns an empty list and zero unread count when no notifications exist", () => {
    expect(getInstructorNotifications(base.instructor.id)).toEqual([]);
    expect(getUnreadInstructorNotificationCount(base.instructor.id)).toBe(0);
  });

  it("does not expose another instructor’s notification to a read action", () => {
    const otherInstructor = testDb
      .insert(schema.users)
      .values({
        name: "Other Instructor",
        email: "other-instructor@example.com",
        role: schema.UserRole.Instructor,
      })
      .returning()
      .get();
    const enrollment = enrollUser(base.user.id, base.course.id, false, false);
    const notificationId = getInstructorNotifications(base.instructor.id)[0].id;

    expect(
      markInstructorNotificationAsRead(otherInstructor.id, notificationId)
    ).toBeUndefined();
    expect(enrollment.id).toBeDefined();
  });
});
