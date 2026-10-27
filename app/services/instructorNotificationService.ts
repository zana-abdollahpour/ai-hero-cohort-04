import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "~/db";
import { instructorNotifications, users, courses } from "~/db/schema";

export function getInstructorNotifications(instructorId: number) {
  return db
    .select({
      id: instructorNotifications.id,
      learnerId: instructorNotifications.learnerId,
      courseId: instructorNotifications.courseId,
      createdAt: instructorNotifications.createdAt,
      readAt: instructorNotifications.readAt,
      learnerName: users.name,
      courseTitle: courses.title,
    })
    .from(instructorNotifications)
    .innerJoin(users, eq(instructorNotifications.learnerId, users.id))
    .innerJoin(courses, eq(instructorNotifications.courseId, courses.id))
    .where(eq(instructorNotifications.instructorId, instructorId))
    .orderBy(
      desc(instructorNotifications.createdAt),
      desc(instructorNotifications.id)
    )
    .all();
}

export function getUnreadInstructorNotificationCount(instructorId: number) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(instructorNotifications)
    .where(
      and(
        eq(instructorNotifications.instructorId, instructorId),
        isNull(instructorNotifications.readAt)
      )
    )
    .get();

  return result?.count ?? 0;
}

export function markInstructorNotificationAsRead(
  instructorId: number,
  notificationId: number
) {
  const notification = db
    .select({
      courseId: instructorNotifications.courseId,
      readAt: instructorNotifications.readAt,
    })
    .from(instructorNotifications)
    .where(
      and(
        eq(instructorNotifications.id, notificationId),
        eq(instructorNotifications.instructorId, instructorId)
      )
    )
    .get();

  if (!notification) return undefined;

  if (notification.readAt === null) {
    db.update(instructorNotifications)
      .set({ readAt: new Date().toISOString() })
      .where(
        and(
          eq(instructorNotifications.id, notificationId),
          eq(instructorNotifications.instructorId, instructorId),
          isNull(instructorNotifications.readAt)
        )
      )
      .run();
  }

  return notification;
}

export function markAllInstructorNotificationsAsRead(instructorId: number) {
  return db
    .update(instructorNotifications)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(
        eq(instructorNotifications.instructorId, instructorId),
        isNull(instructorNotifications.readAt)
      )
    )
    .run().changes;
}
