import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "~/db";
import { lessonComments, users } from "~/db/schema";

export function getCommentsForLesson(lessonId: number) {
  return db
    .select({
      id: lessonComments.id,
      lessonId: lessonComments.lessonId,
      userId: lessonComments.userId,
      content: lessonComments.content,
      createdAt: lessonComments.createdAt,
      updatedAt: lessonComments.updatedAt,
      deletedAt: lessonComments.deletedAt,
      authorName: users.name,
      authorRole: users.role,
    })
    .from(lessonComments)
    .innerJoin(users, eq(lessonComments.userId, users.id))
    .where(eq(lessonComments.lessonId, lessonId))
    .orderBy(asc(lessonComments.createdAt), asc(lessonComments.id))
    .all();
}

export function getCommentById(id: number) {
  return db
    .select()
    .from(lessonComments)
    .where(eq(lessonComments.id, id))
    .get();
}

export function createLessonComment(
  lessonId: number,
  userId: number,
  content: string
) {
  return db
    .insert(lessonComments)
    .values({ lessonId, userId, content })
    .returning()
    .get();
}

export function updateLessonComment(id: number, content: string) {
  const now = new Date().toISOString();
  return db
    .update(lessonComments)
    .set({ content, updatedAt: now })
    .where(and(eq(lessonComments.id, id), isNull(lessonComments.deletedAt)))
    .returning()
    .get();
}

export function softDeleteLessonComment(id: number) {
  return db
    .update(lessonComments)
    .set({ deletedAt: new Date().toISOString() })
    .where(and(eq(lessonComments.id, id), isNull(lessonComments.deletedAt)))
    .returning()
    .get();
}

export function restoreLessonComment(id: number) {
  return db
    .update(lessonComments)
    .set({ deletedAt: null })
    .where(and(eq(lessonComments.id, id), isNotNull(lessonComments.deletedAt)))
    .returning()
    .get();
}
