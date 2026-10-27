import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { setCurrentUserId } from "~/lib/session";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

import { enrollUser } from "~/services/enrollmentService";
import { action, loader } from "./instructor.notifications";

function routeArgs(request: Request) {
  return { request } as never;
}

async function requestFor(userId?: number, form?: Record<string, string>) {
  const request = new Request("http://localhost/instructor/notifications", {
    method: form ? "POST" : "GET",
    ...(form
      ? { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      : {}),
    ...(form ? { body: new URLSearchParams(form) } : {}),
  });
  if (userId === undefined) return request;
  const cookie = await setCurrentUserId(
    new Request("http://localhost"),
    userId
  );
  return new Request(request.url, {
    method: request.method,
    headers: {
      Cookie: cookie,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(form ? { body: new URLSearchParams(form) } : {}),
  });
}

describe("instructor notifications route", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  it("requires an authenticated instructor", async () => {
    await expect(loader(routeArgs(await requestFor()))).rejects.toMatchObject({
      init: { status: 401 },
    });
    await expect(
      loader(routeArgs(await requestFor(base.user.id)))
    ).rejects.toMatchObject({ init: { status: 403 } });
  });

  it("returns only the instructor’s notification data", async () => {
    enrollUser(base.user.id, base.course.id, false, false);

    const result = (await loader(
      routeArgs(await requestFor(base.instructor.id))
    )) as {
      notifications: Array<{ learnerName: string; courseTitle: string }>;
      unreadCount: number;
    };

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toMatchObject({
      learnerName: base.user.name,
      courseTitle: base.course.title,
    });
    expect(result.unreadCount).toBe(1);
  });

  it("marks an opened notification read and redirects to its course roster", async () => {
    enrollUser(base.user.id, base.course.id, false, false);
    const notificationId = testDb
      .select({ id: schema.instructorNotifications.id })
      .from(schema.instructorNotifications)
      .get()!.id;

    const response = await action(
      routeArgs(
        await requestFor(base.instructor.id, {
          intent: "open-notification",
          notificationId: String(notificationId),
        })
      )
    );

    expect(response).toMatchObject({ status: 302 });
    expect((response as Response).headers.get("Location")).toBe(
      `/instructor/${base.course.id}/students`
    );
    expect(
      testDb
        .select({ readAt: schema.instructorNotifications.readAt })
        .from(schema.instructorNotifications)
        .get()?.readAt
    ).not.toBeNull();
  });

  it("prevents an instructor from opening another instructor’s notification", async () => {
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
    enrollUser(base.user.id, otherCourse.id, false, false);
    const notificationId = testDb
      .select({ id: schema.instructorNotifications.id })
      .from(schema.instructorNotifications)
      .get()!.id;

    await expect(
      action(
        routeArgs(
          await requestFor(base.instructor.id, {
            intent: "open-notification",
            notificationId: String(notificationId),
          })
        )
      )
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("marks all of the current instructor’s notifications read", async () => {
    enrollUser(base.user.id, base.course.id, false, false);

    const response = await action(
      routeArgs(
        await requestFor(base.instructor.id, { intent: "mark-all-read" })
      )
    );

    expect((response as Response).headers.get("Location")).toBe(
      "/instructor/notifications"
    );
    expect(
      testDb
        .select({ readAt: schema.instructorNotifications.readAt })
        .from(schema.instructorNotifications)
        .get()?.readAt
    ).not.toBeNull();
  });
});
