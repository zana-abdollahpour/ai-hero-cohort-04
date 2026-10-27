import { eq, and, sql } from "drizzle-orm";
import { db } from "~/db";
import {
  enrollments,
  courses,
  modules,
  lessons,
  lessonProgress,
  instructorNotifications,
  LessonProgressStatus,
} from "~/db/schema";

// ─── Enrollment Service ───
// Handles enrollment, unenrollment, duplicate prevention, and enrollment validation.
// Uses positional parameters (project convention).

export type EnrollmentTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export function createEnrollmentInTransaction(
  tx: EnrollmentTransaction,
  userId: number,
  courseId: number
) {
  const enrollment = tx
    .insert(enrollments)
    .values({ userId, courseId })
    .returning()
    .get();

  const course = tx
    .select({ instructorId: courses.instructorId })
    .from(courses)
    .where(eq(courses.id, courseId))
    .get();

  if (!course) {
    throw new Error("Course not found");
  }

  tx.insert(instructorNotifications)
    .values({
      instructorId: course.instructorId,
      learnerId: userId,
      courseId,
      enrollmentId: enrollment.id,
    })
    .run();

  return enrollment;
}

export function getEnrollmentById(id: number) {
  return db.select().from(enrollments).where(eq(enrollments.id, id)).get();
}

export function getEnrollmentsByUser(userId: number) {
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, userId))
    .all();
}

export function getEnrollmentsByCourse(courseId: number) {
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .all();
}

export function getEnrollmentCountForCourse(courseId: number) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .get();

  return result?.count ?? 0;
}

export function findEnrollment(userId: number, courseId: number) {
  return db
    .select()
    .from(enrollments)
    .where(
      and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
    )
    .get();
}

export function isUserEnrolled(userId: number, courseId: number) {
  return !!findEnrollment(userId, courseId);
}

export function enrollUser(
  userId: number,
  courseId: number,
  sendEmail: boolean,
  skipValidation: boolean
) {
  return db.transaction((tx) => {
    if (!skipValidation) {
      const existing = tx
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, userId),
            eq(enrollments.courseId, courseId)
          )
        )
        .get();
      if (existing) {
        throw new Error("User is already enrolled in this course");
      }

      const course = tx
        .select()
        .from(courses)
        .where(eq(courses.id, courseId))
        .get();
      if (!course) {
        throw new Error("Course not found");
      }
    }

    const enrollment = createEnrollmentInTransaction(tx, userId, courseId);

    // sendEmail is retained for existing callers; external email is out of scope.
    void sendEmail;

    return enrollment;
  });
}

export function unenrollUser(userId: number, courseId: number) {
  const existing = findEnrollment(userId, courseId);
  if (!existing) {
    throw new Error("User is not enrolled in this course");
  }

  return db
    .delete(enrollments)
    .where(
      and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
    )
    .returning()
    .get();
}

export function markEnrollmentComplete(userId: number, courseId: number) {
  return db
    .update(enrollments)
    .set({ completedAt: new Date().toISOString() })
    .where(
      and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
    )
    .returning()
    .get();
}

export function getUserEnrolledCourses(userId: number) {
  return db
    .select({
      enrollmentId: enrollments.id,
      courseId: enrollments.courseId,
      enrolledAt: enrollments.enrolledAt,
      completedAt: enrollments.completedAt,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      courseDescription: courses.description,
      coverImageUrl: courses.coverImageUrl,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, userId))
    .all();
}

export function getCourseEnrolledStudents(courseId: number) {
  return db
    .select({
      enrollmentId: enrollments.id,
      userId: enrollments.userId,
      enrolledAt: enrollments.enrolledAt,
      completedAt: enrollments.completedAt,
    })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .all();
}
