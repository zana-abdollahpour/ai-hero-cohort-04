import { Link, Form, data, isRouteErrorResponse, useFetcher, useNavigation } from "react-router";
import type { Route } from "./+types/instructor.analytics";
import { getCurrentUserId } from "~/lib/session";
import { getUserById } from "~/services/userService";
import { dismissInstructorAnalyticsFlag, getInstructorAnalytics } from "~/services/analyticsService";
import { UserRole } from "~/db/schema";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, CircleAlert, Users } from "lucide-react";

const allowedRanges = [7, 30, 90];

async function requireInstructor(request: Request) {
  const instructorId = await getCurrentUserId(request);
  if (!instructorId) throw data("Select an instructor from the DevUI panel to view analytics.", { status: 401 });
  const instructor = getUserById(instructorId);
  if (!instructor || instructor.role !== UserRole.Instructor) throw data("Only instructors can access analytics.", { status: 403 });
  return instructorId;
}

export function meta() {
  return [{ title: "Instructor Analytics — Cadence" }, { name: "description", content: "Purchase and learner progress analytics for your courses" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const instructorId = await requireInstructor(request);
  const url = new URL(request.url);
  const rawCourseId = url.searchParams.get("course");
  const courseId = rawCourseId === null || rawCourseId === "all" ? null : Number(rawCourseId);
  if (courseId !== null && (!Number.isInteger(courseId) || courseId < 1)) throw data("Invalid course filter.", { status: 400 });
  const rawDays = url.searchParams.get("days");
  const days = rawDays === null ? 30 : Number(rawDays);
  if (!allowedRanges.includes(days)) throw data("Invalid purchase range.", { status: 400 });
  const analytics = getInstructorAnalytics(instructorId, { courseId, days });
  if (analytics === null) throw data("Course not found in your instructor account.", { status: 404 });
  return { analytics, courseFilter: courseId === null ? "all" : String(courseId), days };
}

export async function action({ request }: Route.ActionArgs) {
  const instructorId = await requireInstructor(request);
  const form = await request.formData();
  if (form.get("intent") !== "dismiss-flag") throw data("Invalid action.", { status: 400 });
  const courseId = Number(form.get("courseId"));
  const key = String(form.get("key") ?? "");
  const days = allowedRanges.includes(Number(form.get("days"))) ? Number(form.get("days")) : 30;
  if (!Number.isInteger(courseId) || courseId < 1 || !key) throw data("Invalid flag.", { status: 400 });
  const current = getInstructorAnalytics(instructorId, { courseId, days });
  const flag = current?.flags.find((item) => item.key === key);
  if (!flag) throw data("This flag is no longer active.", { status: 409 });
  dismissInstructorAnalyticsFlag(instructorId, courseId, key, flag.severity);
  return { success: true };
}

function MetricCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: typeof Users }) {
  return <Card className="min-w-0"><CardHeader className="flex flex-row items-center justify-between gap-3 pb-2"><p className="text-sm font-medium text-muted-foreground">{title}</p><Icon className="size-4 shrink-0 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></CardContent></Card>;
}

function formatPercent(value: number | null) {
  return value === null ? "Not shown (<5 learners)" : `${Math.round(value * 100)}%`;
}

function formatDateRange(start: string, end: string) {
  const inclusiveEnd = new Date(end);
  inclusiveEnd.setUTCDate(inclusiveEnd.getUTCDate() - 1);
  return `${new Date(start).toLocaleDateString()} – ${inclusiveEnd.toLocaleDateString()}`;
}

function DismissFlag({ flag, days }: { flag: { courseId: number; key: string; severity: number }; days: number }) {
  const fetcher = useFetcher();
  return <fetcher.Form method="post"><input type="hidden" name="intent" value="dismiss-flag" /><input type="hidden" name="courseId" value={flag.courseId} /><input type="hidden" name="key" value={flag.key} /><input type="hidden" name="days" value={days} /><Button type="submit" size="sm" variant="outline" disabled={fetcher.state !== "idle"}>{fetcher.state === "submitting" ? "Dismissing…" : "Dismiss"}</Button></fetcher.Form>;
}

export default function InstructorAnalytics({ loaderData }: Route.ComponentProps) {
  const { analytics, courseFilter, days } = loaderData;
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const purchaseChange = analytics.purchases.previousCount === 0 ? null : (analytics.purchases.count - analytics.purchases.previousCount) / analytics.purchases.previousCount;
  const visibleTrend = analytics.purchases.trend.filter((item) => item.count > 0);
  const maxTrend = Math.max(1, ...analytics.purchases.trend.map((item) => item.count));
  const updatedLabel = new Date(analytics.updatedAt).toLocaleString();
  return <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
    <nav className="text-sm text-muted-foreground"><Link to="/" className="hover:text-foreground">Home</Link><span className="mx-2">/</span><Link to="/instructor" className="hover:text-foreground">My Courses</Link><span className="mx-2">/</span><span className="text-foreground">Analytics</span></nav>
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-3xl font-bold">Instructor analytics</h1><p className="mt-1 text-muted-foreground">Purchase activity and current learner progress across your courses.</p><p className="mt-2 text-xs text-muted-foreground">Updated {updatedLabel}</p></div>
      <Form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy={isLoading}>
        <label className="grid gap-1 text-sm font-medium">Course<select name="course" defaultValue={courseFilter} className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All courses</option>{analytics.courses.map((course) => <option key={course.id} value={course.id}>{course.title} · {course.status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Purchase range<select name="days" defaultValue={days} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
        <Button className="sm:col-span-2" type="submit" variant="outline" disabled={isLoading}>{isLoading ? "Updating analytics…" : "Apply filters"}</Button>
      </Form>
    </header>

    {isLoading && <p role="status" aria-live="polite" className="text-sm text-muted-foreground">Loading analytics for the selected filters…</p>}

    {analytics.courses.length === 0 ? <Card><CardContent className="py-12 text-center"><BookOpen className="mx-auto mb-3 size-8 text-muted-foreground"/><h2 className="font-semibold">No courses to analyze yet</h2><p className="mt-1 text-sm text-muted-foreground">Analytics will appear after you create a course.</p></CardContent></Card> : <>
      <section aria-label="Overview metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title={`Purchases · last ${days} days`} value={String(analytics.purchases.count)} detail={purchaseChange === null ? `${analytics.purchases.previousCount} in previous period` : `${purchaseChange >= 0 ? "+" : ""}${Math.round(purchaseChange * 100)}% vs ${analytics.purchases.previousCount} in previous ${days} days`} icon={BarChart3}/>
        <MetricCard title="Current enrollments" value={String(analytics.learning.enrollments)} detail="Current snapshot · independent of purchase range" icon={Users}/>
        <MetricCard title="Current completion" value={formatPercent(analytics.learning.completionRate)} detail={`${analytics.learning.completions} of ${analytics.learning.enrollments} current enrollments completed`} icon={ArrowUpRight}/>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="min-w-0"><CardHeader><h2 className="text-lg font-semibold">Purchase trend</h2><p className="text-sm text-muted-foreground">Selected period ({formatDateRange(analytics.period.start, analytics.period.end)}): {analytics.purchases.count} purchases. Previous equal-length period ({formatDateRange(analytics.period.previousStart, analytics.period.previousEnd)}): {analytics.purchases.previousCount} purchases.</p></CardHeader><CardContent>
          {visibleTrend.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No purchases in this period.</p> : <div className="overflow-x-auto"><div className="flex h-48 min-w-[34rem] items-end gap-1 border-b border-border px-1" role="img" aria-label="Daily purchase counts"><div className="flex h-full w-full items-end gap-1">{analytics.purchases.trend.map((item) => <div key={item.date} className="group flex h-full min-w-1 flex-1 flex-col justify-end" title={`${item.date}: ${item.count} purchases`}><div className="w-full rounded-t-sm bg-primary/80" style={{ height: `${item.count === 0 ? 1 : Math.max(4, item.count / maxTrend * 100)}%` }} /><span className="sr-only">{item.date}: {item.count} purchases</span></div>)}</div></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{analytics.purchases.trend[0]?.date}</span><span>{analytics.purchases.trend.at(-1)?.date}</span></div></div>}
        </CardContent></Card>
        <Card><CardHeader><h2 className="text-lg font-semibold">Course context</h2><p className="text-sm text-muted-foreground">Included in this view, including inactive courses with history.</p></CardHeader><CardContent className="space-y-3">{analytics.courses.map((course) => <div key={course.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0"><div className="min-w-0"><Link to={`/instructor/${course.id}`} className="font-medium hover:underline">{course.title}</Link><p className="text-xs capitalize text-muted-foreground">{course.status}</p></div><ArrowDownRight className="mt-1 size-4 shrink-0 text-muted-foreground"/></div>)}</CardContent></Card>
      </section>

      <section><div className="mb-4"><h2 className="text-xl font-semibold">Lesson progression</h2><p className="text-sm text-muted-foreground">Current snapshot. Reached means in progress or completed; progression means the next lesson is in progress or completed. Rates are hidden below five learners.</p></div>
        {analytics.learning.lessons.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No lessons are available in the selected courses.</CardContent></Card> : <div className="grid gap-3">{analytics.learning.lessons.map((lesson) => <Card key={`${lesson.courseId}:${lesson.lessonId}`}><CardContent className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="min-w-0"><p className="font-medium">{lesson.title}</p><p className="truncate text-sm text-muted-foreground">{lesson.courseTitle}</p></div><p className="text-sm">Reached <strong>{lesson.reached}</strong><span className="text-muted-foreground"> · {formatPercent(lesson.reachedRate)}</span></p><p className="text-sm">Next lesson <strong>{lesson.progressed ?? "—"}</strong><span className="text-muted-foreground"> · {formatPercent(lesson.progressionRate)}</span></p></CardContent></Card>)}</div>}
      </section>

      <section><div className="mb-4"><h2 className="text-xl font-semibold">Signals to review</h2><p className="text-sm text-muted-foreground">Evidence-based changes only; these signals do not imply a cause.</p></div>
        {analytics.flags.length === 0 ? <Card><CardContent className="flex items-center gap-3 py-5 text-sm text-muted-foreground"><CircleAlert className="size-5"/>No qualifying signals for the selected scope.</CardContent></Card> : <div className="grid gap-3">{analytics.flags.map((flag) => <Card key={`${flag.courseId}:${flag.key}`}><CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600"/><div><p className="font-medium">{flag.title}</p><p className="text-sm text-muted-foreground">{flag.detail}</p><Link to={`/instructor/${flag.courseId}`} className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline">Open {flag.courseTitle}</Link></div></div><DismissFlag flag={flag} days={days}/></CardContent></Card>)}</div>}
      </section>
      <p className="text-xs text-muted-foreground">Current enrollment and completion counts are snapshots, not historical cohorts. Purchase records do not provide reliable refund or currency data, so revenue is not shown.</p>
    </>}
  </main>;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Analytics unavailable";
  let message = "We couldn't load your course analytics.";
  if (isRouteErrorResponse(error)) {
    title = error.status === 401 ? "Sign in required" : error.status === 403 ? "Access denied" : `Error ${error.status}`;
    message = typeof error.data === "string" ? error.data : error.statusText;
  }
  return <div className="flex min-h-[50vh] items-center justify-center p-6"><div className="text-center"><AlertTriangle className="mx-auto mb-4 size-10 text-muted-foreground"/><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-muted-foreground">{message}</p><Link to="/instructor" className="mt-5 inline-block"><Button variant="outline">Back to My Courses</Button></Link></div></div>;
}
