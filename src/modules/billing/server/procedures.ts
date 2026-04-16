import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/prisma";
import { getRazorpay, PLAN_ID_BY_TIER } from "@/lib/billing/razorpay";

type PaidTier = "PRO" | "TEAM";
const paidTierEnum = z.enum(["PRO", "TEAM"]);

export const billingRouter = createTRPCRouter({
    getSubscription: protectedProcedure.query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: { planTier: true, email: true, name: true },
        });
        const active = await prisma.subscription.findFirst({
            where: {
                userId: ctx.user.id,
                status: { in: ["CREATED", "AUTHENTICATED", "ACTIVE", "PAUSED"] },
            },
            orderBy: { createdAt: "desc" },
        });
        return {
            planTier: user?.planTier ?? "FREE",
            subscription: active,
        };
    }),

    createCheckoutSubscription: protectedProcedure
        .input(z.object({ tier: paidTierEnum }))
        .mutation(async ({ ctx, input }) => {
            const planId = PLAN_ID_BY_TIER[input.tier as PaidTier];
            if (!planId) {
                throw new TRPCError({
                    code: "PRECONDITION_FAILED",
                    message: `Razorpay plan id missing for ${input.tier}. Set RAZORPAY_${input.tier}_PLAN_ID.`,
                });
            }
            const existing = await prisma.subscription.findFirst({
                where: {
                    userId: ctx.user.id,
                    status: { in: ["CREATED", "AUTHENTICATED", "ACTIVE"] },
                },
            });
            if (existing) {
                return {
                    subscriptionId: existing.razorpaySubscriptionId,
                    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
                };
            }

            const rzp = getRazorpay();
            const subscription = await rzp.subscriptions.create({
                plan_id: planId,
                total_count: 12,
                customer_notify: 1,
                notes: {
                    userId: ctx.user.id,
                    tier: input.tier,
                },
            });

            await prisma.subscription.create({
                data: {
                    userId: ctx.user.id,
                    razorpaySubscriptionId: subscription.id,
                    razorpayPlanId: planId,
                    planTier: input.tier,
                    status: "CREATED",
                },
            });

            return {
                subscriptionId: subscription.id,
                keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
            };
        }),

    cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
        const active = await prisma.subscription.findFirst({
            where: {
                userId: ctx.user.id,
                status: { in: ["AUTHENTICATED", "ACTIVE", "PAUSED"] },
            },
            orderBy: { createdAt: "desc" },
        });
        if (!active) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No active subscription to cancel",
            });
        }
        const rzp = getRazorpay();
        await rzp.subscriptions.cancel(active.razorpaySubscriptionId, true);
        await prisma.subscription.update({
            where: { id: active.id },
            data: { cancelAtPeriodEnd: true },
        });
        return { success: true };
    }),
});
