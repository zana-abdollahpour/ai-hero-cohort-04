import { Form, Link, data, redirect } from "react-router";
import type { Route } from "./+types/instructor.notifications";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { UserRole } from "~/db/schema";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import {
  getInstructorNotifications,
  getUnreadInstructorNotificationCount,
  markAllInstructorNotificationsAsRead,
  markInstructorNotificationAsRead,
} from "~/services/instructorNotificationService";

async function requireInstructor(request: Request) {
  const instructorId = await getCurrentUserId(request);
  if (!instructorId) {
    throw data("Sign in as an instructor to view notifications.", {
      status: 401,
    });
  }

  const instructor = getUserById(instructorId);
  if (!instructor || instructor.role !== UserRole.Instructor) {
    throw data("Only instructors can access notifications.", { status: 403 });
  }

  return instructorId;
}

export function meta() {
  return [
    { title: "Notifications — Cadence" },
    {
      name: "description",
      content: "Enrollment notifications for your courses",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const instructorId = await requireInstructor(request);
  return {
    notifications: getInstructorNotifications(instructorId),
    unreadCount: getUnreadInstructorNotificationCount(instructorId),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const instructorId = await requireInstructor(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "mark-all-read") {
    markAllInstructorNotificationsAsRead(instructorId);
    return redirect("/instructor/notifications");
  }

  if (intent !== "open-notification") {
    throw data("Invalid notification action.", { status: 400 });
  }

  const notificationId = Number(form.get("notificationId"));
  if (!Number.isInteger(notificationId) || notificationId < 1) {
    throw data("Invalid notification.", { status: 400 });
  }

  const notification = markInstructorNotificationAsRead(
    instructorId,
    notificationId
  );
  if (!notification) {
    throw data("Notification not found.", { status: 404 });
  }

  return redirect(`/instructor/${notification.courseId}/students`);
}

function formatTimestamp(value: string) {
  return `${new Date(value).toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  })} UTC`;
}

export default function InstructorNotifications({
  loaderData,
}: Route.ComponentProps) {
  const { notifications, unreadCount } = loaderData;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/instructor" className="hover:text-foreground">
          My Courses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Notifications</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enrollment activity for your courses
          </p>
        </div>
        {unreadCount > 0 && (
          <Form method="post">
            <input type="hidden" name="intent" value="mark-all-read" />
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck />
              Mark all as read
            </Button>
          </Form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Bell className="mb-3 size-8 text-muted-foreground/60" />
            <h2 className="font-semibold">You’re all caught up</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New course enrollments will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={
                notification.readAt ? "" : "border-primary/40 bg-primary/5"
              }
            >
              <CardContent className="p-0">
                <Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value="open-notification"
                  />
                  <input
                    type="hidden"
                    name="notificationId"
                    value={notification.id}
                  />
                  <button
                    type="submit"
                    className="flex w-full flex-col gap-3 rounded-lg p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium">
                        {!notification.readAt && (
                          <span
                            aria-label="Unread"
                            className="size-2 shrink-0 rounded-full bg-primary"
                          />
                        )}
                        <span>
                          {notification.learnerName} enrolled in{" "}
                          {notification.courseTitle}
                        </span>
                      </span>
                      <time
                        dateTime={notification.createdAt}
                        className="mt-1 block text-sm text-muted-foreground"
                      >
                        {formatTimestamp(notification.createdAt)}
                      </time>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-primary">
                      View students
                    </span>
                  </button>
                </Form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
