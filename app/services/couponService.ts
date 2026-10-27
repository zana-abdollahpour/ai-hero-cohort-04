import { eq, and, isNull } from "drizzle-orm";
import { db } from "~/db";
import { coupons, purchases, enrollments } from "~/db/schema";
import { createEnrollmentInTransaction } from "./enrollmentService";
import crypto from "crypto";

// ─── Coupon Service ───
// Handles coupon generation, redemption (with validation), and listing.
// Each coupon grants one seat for a specific course within a team.

function generateCode(): string {
  return crypto.randomBytes(12).toString("base64url");
}

export function generateCoupons(
  teamId: number,
  courseId: number,
  purchaseId: number,
  quantity: number
) {
  const created: (typeof coupons.$inferSelect)[] = [];
  for (let i = 0; i < quantity; i++) {
    const coupon = db
      .insert(coupons)
      .values({
        teamId,
        courseId,
        code: generateCode(),
        purchaseId,
      })
      .returning()
      .get();
    created.push(coupon);
  }
  return created;
}

export function getCouponByCode(code: string) {
  return db.select().from(coupons).where(eq(coupons.code, code)).get();
}

export function getCouponsForTeam(teamId: number, courseId?: number) {
  if (courseId !== undefined) {
    return db
      .select()
      .from(coupons)
      .where(and(eq(coupons.teamId, teamId), eq(coupons.courseId, courseId)))
      .all();
  }
  return db.select().from(coupons).where(eq(coupons.teamId, teamId)).all();
}

export type RedeemResult =
  | { ok: true; enrollment: typeof enrollments.$inferSelect }
  | { ok: false; error: string };

export function redeemCoupon(
  code: string,
  userId: number,
  userCountry: string
): RedeemResult {
  return db.transaction((tx): RedeemResult => {
    const coupon = tx
      .select()
      .from(coupons)
      .where(eq(coupons.code, code))
      .get();
    if (!coupon) {
      return { ok: false, error: "Coupon not found" };
    }

    if (coupon.redeemedByUserId !== null) {
      return { ok: false, error: "Coupon has already been redeemed" };
    }

    const existingEnrollment = tx
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.courseId, coupon.courseId)
        )
      )
      .get();

    if (existingEnrollment) {
      return { ok: false, error: "You are already enrolled in this course" };
    }

    const purchase = tx
      .select()
      .from(purchases)
      .where(eq(purchases.id, coupon.purchaseId))
      .get();

    if (purchase?.country && purchase.country !== userCountry) {
      return {
        ok: false,
        error:
          "This coupon can only be redeemed from the same country as the purchaser",
      };
    }

    const redeemedCoupon = tx
      .update(coupons)
      .set({
        redeemedByUserId: userId,
        redeemedAt: new Date().toISOString(),
      })
      .where(and(eq(coupons.id, coupon.id), isNull(coupons.redeemedByUserId)))
      .returning()
      .get();

    if (!redeemedCoupon) {
      return { ok: false, error: "Coupon has already been redeemed" };
    }

    const enrollment = createEnrollmentInTransaction(
      tx,
      userId,
      coupon.courseId
    );
    return { ok: true, enrollment };
  });
}
