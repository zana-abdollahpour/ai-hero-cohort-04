import { and, eq, inArray } from "drizzle-orm";
import { db } from "~/db";
import {
  analyticsFlagDismissals,
  courses,
  enrollments,
  lessons,
  lessonProgress,
  modules,
  purchases,
  CourseStatus,
  LessonProgressStatus,
} from "~/db/schema";

const SMALL_COHORT = 5;
const PURCHASE_DECLINE_THRESHOLD = 0.3;
const LESSON_DROPOFF_THRESHOLD = 0.5;
const MATERIAL_WORSENING = 0.15;

type Flag = {
  key: string;
  courseId: number;
  kind: "purchase_decline" | "lesson_dropoff";
  title: string;
  detail: string;
  severity: number;
  lessonId: number | null;
};

export type InstructorAnalyticsViewModel = {
  courses: Array<{ id: number; title: string; slug: string; status: CourseStatus }>;
  selectedCourseId: number | null;
  period: {
    days: number;
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  purchases: {
    count: number;
    previousCount: number;
    trend: Array<{ date: string; count: number }>;
  };
  learning: {
    enrollments: number;
    completions: number;
    completionRate: number | null;
    lessons: Array<{
      lessonId: number;
      title: string;
      reached: number;
      progressed: number | null;
      dropoff: number | null;
      courseId: number;
      courseTitle: string;
      reachedRate: number | null;
      progressionRate: number | null;
    }>;
  };
  flags: Array<Flag & { courseSlug: string; courseTitle: string }>;
  updatedAt: string;
  thresholds: { smallCohort: number };
};

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export function getInstructorAnalytics(
  instructorId: number,
  options: { courseId: number | null; days: number; now?: Date },
): InstructorAnalyticsViewModel | null {
  const now = options.now ?? new Date();
  const end = startOfDay(now);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - options.days);
  const previousStart = new Date(start);
  previousStart.setUTCDate(previousStart.getUTCDate() - options.days);
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const previousStartIso = previousStart.toISOString();

  const ownedCourses = db.select({
    id: courses.id,
    title: courses.title,
    slug: courses.slug,
    status: courses.status,
  }).from(courses).where(eq(courses.instructorId, instructorId)).all();
  const selectedCourses = options.courseId === null
    ? ownedCourses
    : ownedCourses.filter((course) => course.id === options.courseId);

  if (options.courseId !== null && selectedCourses.length === 0) {
    return null;
  }

  const allCourseMetrics = ownedCourses.map((course) => {
    const coursePurchases = db.select({ createdAt: purchases.createdAt })
      .from(purchases).where(eq(purchases.courseId, course.id)).all();
    const currentPurchases = coursePurchases.filter((purchase) => purchase.createdAt >= startIso && purchase.createdAt < endIso).length;
    const previousPurchases = coursePurchases.filter((purchase) => purchase.createdAt >= previousStartIso && purchase.createdAt < startIso).length;
    const moduleRows = db.select({ id: modules.id, position: modules.position })
      .from(modules).where(eq(modules.courseId, course.id)).orderBy(modules.position).all();
    const moduleIds = moduleRows.map((module) => module.id);
    const modulePositionById = new Map(moduleRows.map((module) => [module.id, module.position]));
    const lessonRows = moduleIds.length === 0 ? [] : db.select({
      id: lessons.id,
      title: lessons.title,
      position: lessons.position,
      moduleId: lessons.moduleId,
    }).from(lessons).where(inArray(lessons.moduleId, moduleIds)).all();
    const orderedLessons = lessonRows.sort((a, b) => {
      const modulePositionDifference = (modulePositionById.get(a.moduleId) ?? 0) - (modulePositionById.get(b.moduleId) ?? 0);
      return modulePositionDifference || a.moduleId - b.moduleId || a.position - b.position || a.id - b.id;
    });
    const currentEnrollments = db.select({ userId: enrollments.userId, completedAt: enrollments.completedAt })
      .from(enrollments).where(eq(enrollments.courseId, course.id)).all();
    const enrolledUserIds = new Set(currentEnrollments.map((enrollment) => enrollment.userId));
    const progressRows = orderedLessons.length === 0 ? [] : db.select({
      userId: lessonProgress.userId,
      lessonId: lessonProgress.lessonId,
      status: lessonProgress.status,
    }).from(lessonProgress).where(inArray(lessonProgress.lessonId, orderedLessons.map((lesson) => lesson.id))).all()
      .filter((progress) => enrolledUserIds.has(progress.userId));
    const reachedLessonKeys = new Set(progressRows
      .filter((progress) => progress.status === LessonProgressStatus.InProgress || progress.status === LessonProgressStatus.Completed)
      .map((progress) => `${progress.userId}:${progress.lessonId}`));
    const reachedByLesson = orderedLessons.map((lesson) => {
      const reached = currentEnrollments.filter((enrollment) => {
        return reachedLessonKeys.has(`${enrollment.userId}:${lesson.id}`);
      }).length;
      return { lessonId: lesson.id, title: lesson.title, reached, rate: ratio(reached, currentEnrollments.length) };
    });
    const steps = reachedByLesson.map((step, index) => {
      const next = reachedByLesson[index + 1];
      const progressed = next?.reached ?? null;
      const dropoff = progressed === null || step.reached === 0 ? null : (step.reached - progressed) / step.reached;
      return { ...step, progressed, dropoff };
    });
    return {
      course,
      purchases: currentPurchases,
      previousPurchases,
      purchaseDates: coursePurchases.map((purchase) => purchase.createdAt),
      enrollments: currentEnrollments.length,
      completions: currentEnrollments.filter((enrollment) => enrollment.completedAt !== null).length,
      lessons: steps,
    };
  });
  const courseMetrics = options.courseId === null
    ? allCourseMetrics
    : allCourseMetrics.filter((course) => course.course.id === options.courseId);

  const allFlags: Flag[] = [];
  for (const course of allCourseMetrics) {
    if (course.previousPurchases >= SMALL_COHORT && course.purchases < course.previousPurchases) {
      const decline = (course.previousPurchases - course.purchases) / course.previousPurchases;
      if (decline >= PURCHASE_DECLINE_THRESHOLD) {
        allFlags.push({
          key: "purchase-decline",
          courseId: course.course.id,
          kind: "purchase_decline",
          title: "Purchase decline",
          detail: `${Math.round(decline * 100)}% fewer purchases (${course.purchases} vs ${course.previousPurchases}) for ${course.course.title}`,
          severity: decline,
          lessonId: null,
        });
      }
    }
    for (const lesson of course.lessons.slice(0, -1)) {
      if (lesson.reached >= SMALL_COHORT && lesson.dropoff !== null && lesson.dropoff >= LESSON_DROPOFF_THRESHOLD) {
        allFlags.push({
          key: `lesson:${lesson.lessonId}`,
          courseId: course.course.id,
          kind: "lesson_dropoff",
          title: "Lesson progression drop-off",
          detail: `${Math.round(lesson.dropoff * 100)}% drop-off after “${lesson.title}” (${lesson.reached} reached, ${lesson.progressed} reached the next lesson) in ${course.course.title}`,
          severity: lesson.dropoff,
          lessonId: lesson.lessonId,
        });
      }
    }
  }

  const dismissals = ownedCourses.length === 0 ? [] : db.select().from(analyticsFlagDismissals)
    .where(and(eq(analyticsFlagDismissals.instructorId, instructorId), inArray(analyticsFlagDismissals.courseId, ownedCourses.map((course) => course.id))))
    .all();
  const activeKeys = new Set(allFlags.map((flag) => `${flag.courseId}:${flag.key}`));
  const dismissedAt = now.toISOString();
  for (const dismissal of dismissals) {
    const stillActive = activeKeys.has(`${dismissal.courseId}:${dismissal.flagKey}`);
    if (!stillActive && dismissal.clearedAt === null) {
      db.update(analyticsFlagDismissals).set({ clearedAt: dismissedAt }).where(eq(analyticsFlagDismissals.id, dismissal.id)).run();
    }
  }
  const visibleFlags = allFlags.filter((flag) => {
    if (options.courseId !== null && flag.courseId !== options.courseId) return false;
    const dismissal = dismissals.find((item) => item.courseId === flag.courseId && item.flagKey === flag.key);
    return !dismissal || dismissal.clearedAt !== null || flag.severity >= dismissal.dismissedValue + MATERIAL_WORSENING;
  });

  const dailyPurchases = Array.from({ length: options.days }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    const count = courseMetrics.reduce((total, courseMetric) => total + courseMetric.purchaseDates.filter((date) => date.slice(0, 10) === key).length, 0);
    return { date: key, count };
  });

  const purchaseCount = courseMetrics.reduce((total, course) => total + course.purchases, 0);
  const previousPurchaseCount = courseMetrics.reduce((total, course) => total + course.previousPurchases, 0);
  const enrollmentCount = courseMetrics.reduce((total, course) => total + course.enrollments, 0);
  const completionCount = courseMetrics.reduce((total, course) => total + course.completions, 0);

  return {
    courses: selectedCourses,
    selectedCourseId: options.courseId,
    period: { days: options.days, start: startIso, end: endIso, previousStart: previousStartIso, previousEnd: startIso },
    purchases: { count: purchaseCount, previousCount: previousPurchaseCount, trend: dailyPurchases },
    learning: {
      enrollments: enrollmentCount,
      completions: completionCount,
      completionRate: enrollmentCount >= SMALL_COHORT ? ratio(completionCount, enrollmentCount) : null,
      lessons: courseMetrics.flatMap((course) => course.lessons.map((lesson) => ({
        ...lesson,
        courseId: course.course.id,
        courseTitle: course.course.title,
        reachedRate: lesson.reached >= SMALL_COHORT ? lesson.rate : null,
        progressionRate: lesson.reached >= SMALL_COHORT && lesson.progressed !== null ? ratio(lesson.progressed, lesson.reached) : null,
      }))),
    },
    flags: visibleFlags.map((flag) => ({ ...flag, courseSlug: allCourseMetrics.find((course) => course.course.id === flag.courseId)?.course.slug ?? "", courseTitle: allCourseMetrics.find((course) => course.course.id === flag.courseId)?.course.title ?? "" })),
    updatedAt: dismissedAt,
    thresholds: { smallCohort: SMALL_COHORT },
  };
}

export function dismissInstructorAnalyticsFlag(instructorId: number, courseId: number, flagKey: string, value: number) {
  const now = new Date().toISOString();
  const existing = db.select().from(analyticsFlagDismissals).where(and(
    eq(analyticsFlagDismissals.instructorId, instructorId),
    eq(analyticsFlagDismissals.courseId, courseId),
    eq(analyticsFlagDismissals.flagKey, flagKey),
  )).get();
  if (existing) {
    return db.update(analyticsFlagDismissals).set({ dismissedValue: value, dismissedAt: now, clearedAt: null })
      .where(eq(analyticsFlagDismissals.id, existing.id)).returning().get();
  }
  return db.insert(analyticsFlagDismissals).values({ instructorId, courseId, flagKey, dismissedValue: value, dismissedAt: now }).returning().get();
}

export { PURCHASE_DECLINE_THRESHOLD, LESSON_DROPOFF_THRESHOLD, SMALL_COHORT };
