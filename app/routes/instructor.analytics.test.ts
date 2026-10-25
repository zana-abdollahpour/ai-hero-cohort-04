import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { setCurrentUserId } from "~/lib/session";
import { eq, inArray } from "drizzle-orm";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;
let purchaseUserCount = 0;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import { action, loader } from "./instructor.analytics";

function routeArgs(request: Request) {
  return { request } as never;
}

async function requestFor(userId?: number, search = "") {
  const request = new Request(`http://localhost/instructor/analytics${search}`);
  if (userId === undefined) return request;
  const cookie = await setCurrentUserId(new Request("http://localhost"), userId);
  return new Request(request.url, { headers: { Cookie: cookie } });
}

function utcDayOffset(offset: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString();
}

function addPurchases(courseId: number, offset: number, count: number) {
  for (let index = 0; index < count; index++) {
    const user = testDb.insert(schema.users).values({
      name: `Buyer ${courseId}-${offset}-${index}`,
      email: `buyer-${purchaseUserCount++}@example.com`,
      role: schema.UserRole.Student,
    }).returning().get();
    testDb.insert(schema.purchases).values({
      userId: user.id,
      courseId,
      pricePaid: 1000,
      createdAt: utcDayOffset(offset),
    }).run();
  }
}

describe("instructor analytics route", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
    purchaseUserCount = 0;
  });

  it("requires an authenticated instructor", async () => {
    await expect(loader(routeArgs(await requestFor()))).rejects.toMatchObject({ init: { status: 401 } });
    await expect(loader(routeArgs(await requestFor(base.user.id)))).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("rejects course filters owned by another instructor", async () => {
    const otherInstructor = testDb.insert(schema.users).values({
      name: "Other Instructor",
      email: "other-instructor@example.com",
      role: schema.UserRole.Instructor,
    }).returning().get();
    const otherCourse = testDb.insert(schema.courses).values({
      title: "Private Course",
      slug: "private-course",
      description: "Private",
      instructorId: otherInstructor.id,
      categoryId: base.category.id,
      status: schema.CourseStatus.Published,
    }).returning().get();

    await expect(loader(routeArgs(await requestFor(base.instructor.id, `?course=${otherCourse.id}`))))
      .rejects.toMatchObject({ init: { status: 404 } });
  });

  it("includes inactive owned courses and compares purchase windows while keeping learning metrics current", async () => {
    testDb.update(schema.courses).set({ status: schema.CourseStatus.Archived }).where(eq(schema.courses.id, base.course.id)).run();
    addPurchases(base.course.id, -10, 5);
    addPurchases(base.course.id, -2, 2);
    const student = testDb.insert(schema.users).values({
      name: "Current learner",
      email: "current-learner@example.com",
      role: schema.UserRole.Student,
    }).returning().get();
    testDb.insert(schema.enrollments).values({ userId: student.id, courseId: base.course.id, completedAt: "2026-01-01T00:00:00.000Z" }).run();

    const result = await loader(routeArgs(await requestFor(base.instructor.id, "?days=7"))) as { analytics: any; days: number };
    expect(result.days).toBe(7);
    expect(result.analytics.courses[0].status).toBe(schema.CourseStatus.Archived);
    expect(result.analytics.purchases.count).toBe(2);
    expect(result.analytics.purchases.previousCount).toBe(5);
    expect(result.analytics.learning.enrollments).toBe(1);
    expect(result.analytics.learning.completions).toBe(1);
    expect(result.analytics.learning.completionRate).toBeNull();
    expect(result.analytics.period.start).toBe(result.analytics.period.previousEnd);
    expect(result.analytics.updatedAt).toBeTruthy();
  });

  it("orders lessons and suppresses rates for undersized cohorts while retaining counts", async () => {
    const moduleLater = testDb.insert(schema.modules).values({ courseId: base.course.id, title: "Later", position: 2 }).returning().get();
    const moduleFirst = testDb.insert(schema.modules).values({ courseId: base.course.id, title: "First", position: 1 }).returning().get();
    const laterLesson = testDb.insert(schema.lessons).values({ moduleId: moduleLater.id, title: "Lesson B", position: 1 }).returning().get();
    const firstLesson = testDb.insert(schema.lessons).values({ moduleId: moduleFirst.id, title: "Lesson A", position: 1 }).returning().get();
    const learners = Array.from({ length: 4 }, (_, index) => testDb.insert(schema.users).values({
      name: `Learner ${index}`,
      email: `learner-${index}@example.com`,
      role: schema.UserRole.Student,
    }).returning().get());
    learners.forEach((learner, index) => {
      testDb.insert(schema.enrollments).values({ userId: learner.id, courseId: base.course.id }).run();
      testDb.insert(schema.lessonProgress).values({
        userId: learner.id,
        lessonId: firstLesson.id,
        status: schema.LessonProgressStatus.InProgress,
      }).run();
      if (index < 2) testDb.insert(schema.lessonProgress).values({
        userId: learner.id,
        lessonId: laterLesson.id,
        status: schema.LessonProgressStatus.Completed,
      }).run();
    });

    const { analytics } = await loader(routeArgs(await requestFor(base.instructor.id))) as { analytics: any };
    expect(analytics.learning.lessons.map((lesson: any) => lesson.title)).toEqual(["Lesson A", "Lesson B"]);
    expect(analytics.learning.lessons[0]).toMatchObject({ reached: 4, progressed: 2, reachedRate: null, progressionRate: null });
    expect(analytics.flags).toHaveLength(0);
  });

  it("shows qualifying drop-off flags with context and handles dismissal, clearing, recurrence, and worsening", async () => {
    const moduleRow = testDb.insert(schema.modules).values({ courseId: base.course.id, title: "Module", position: 1 }).returning().get();
    const first = testDb.insert(schema.lessons).values({ moduleId: moduleRow.id, title: "Start", position: 1 }).returning().get();
    const next = testDb.insert(schema.lessons).values({ moduleId: moduleRow.id, title: "Continue", position: 2 }).returning().get();
    const learners = Array.from({ length: 10 }, (_, index) => testDb.insert(schema.users).values({
      name: `Enrolled learner ${index}`,
      email: `enrolled-${index}@example.com`,
      role: schema.UserRole.Student,
    }).returning().get());
    learners.forEach((learner, index) => {
      testDb.insert(schema.enrollments).values({ userId: learner.id, courseId: base.course.id }).run();
      testDb.insert(schema.lessonProgress).values({ userId: learner.id, lessonId: first.id, status: schema.LessonProgressStatus.InProgress }).run();
      if (index < 4) testDb.insert(schema.lessonProgress).values({ userId: learner.id, lessonId: next.id, status: schema.LessonProgressStatus.InProgress }).run();
    });
    addPurchases(base.course.id, -35, 10);
    addPurchases(base.course.id, -2, 6);

    let response = await loader(routeArgs(await requestFor(base.instructor.id))) as { analytics: any };
    expect(response.analytics.flags.map((flag: any) => flag.kind)).toEqual(["purchase_decline", "lesson_dropoff"]);
    expect(response.analytics.flags[1].detail).toContain("4 reached the next lesson");
    expect(response.analytics.flags[1].lessonId).toBe(first.id);

    const dismissRequest = await requestFor(base.instructor.id);
    const form = new URLSearchParams({ intent: "dismiss-flag", courseId: String(base.course.id), key: "purchase-decline", days: "30" });
    const actionResult = await action(routeArgs(new Request(dismissRequest.url, {
      method: "POST",
      headers: { Cookie: dismissRequest.headers.get("Cookie") ?? "", "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    })));
    expect(actionResult).toEqual({ success: true });
    response = await loader(routeArgs(await requestFor(base.instructor.id))) as { analytics: any };
    expect(response.analytics.flags.some((flag: any) => flag.kind === "purchase_decline")).toBe(false);

    const selectedPurchases = testDb.select({ id: schema.purchases.id, createdAt: schema.purchases.createdAt })
      .from(schema.purchases).where(eq(schema.purchases.courseId, base.course.id)).all()
      .filter((purchase) => purchase.createdAt === utcDayOffset(-2));
    testDb.delete(schema.purchases).where(inArray(schema.purchases.id, selectedPurchases.slice(0, 2).map((purchase) => purchase.id))).run();
    response = await loader(routeArgs(await requestFor(base.instructor.id))) as { analytics: any };
    expect(response.analytics.flags.find((flag: any) => flag.kind === "purchase_decline")?.severity).toBeCloseTo(0.6);
    addPurchases(base.course.id, -2, 6);
    response = await loader(routeArgs(await requestFor(base.instructor.id))) as { analytics: any };
    expect(response.analytics.flags.some((flag: any) => flag.kind === "purchase_decline")).toBe(false);
    const latestPurchases = testDb.select({ id: schema.purchases.id, createdAt: schema.purchases.createdAt })
      .from(schema.purchases).where(eq(schema.purchases.courseId, base.course.id)).all()
      .filter((purchase) => purchase.createdAt === utcDayOffset(-2));
    testDb.delete(schema.purchases).where(inArray(schema.purchases.id, latestPurchases.slice(0, 4).map((purchase) => purchase.id))).run();
    response = await loader(routeArgs(await requestFor(base.instructor.id))) as { analytics: any };
    expect(response.analytics.flags.find((flag: any) => flag.kind === "purchase_decline")?.severity).toBeCloseTo(0.4);
  });

  it("returns a useful empty state model for an instructor with no courses", async () => {
    const instructor = testDb.insert(schema.users).values({
      name: "Empty Instructor",
      email: "empty-instructor@example.com",
      role: schema.UserRole.Instructor,
    }).returning().get();
    const result = await loader(routeArgs(await requestFor(instructor.id))) as { analytics: any };
    expect(result.analytics.courses).toHaveLength(0);
    expect(result.analytics.purchases.count).toBe(0);
  });
});
