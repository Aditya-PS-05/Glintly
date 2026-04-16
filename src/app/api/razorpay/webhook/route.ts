import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/billing/razorpay";
import type { PlanTier, SubscriptionStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_MAP: Record<string, SubscriptionStatus> = {
    "subscription.authenticated": "AUTHENTICATED",
    "subscription.activated": "ACTIVE",
    "subscription.charged": "ACTIVE",
    "subscription.resumed": "ACTIVE",
    "subscription.updated": "ACTIVE",
    "subscription.paused": "PAUSED",
    "subscription.halted": "HALTED",
    "subscription.cancelled": "CANCELLED",
    "subscription.completed": "COMPLETED",
    "subscription.pending": "CREATED",
};

const ACTIVE_STATUSES: SubscriptionStatus[] = ["AUTHENTICATED", "ACTIVE"];

interface RazorpaySubscriptionEntity {
    id: string;
    status: string;
    plan_id: string;
    current_start?: number;
    current_end?: number;
    notes?: { userId?: string; tier?: PlanTier };
}

export async function POST(req: NextRequest) {
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
        return NextResponse.json({ error: "missing signature" }, { status: 400 });
    }

    const raw = await req.text();
    let ok = false;
    try {
        ok = verifyWebhookSignature(raw, signature);
    } catch (error) {
        console.error("[razorpay webhook] signature verification failed", error);
        return NextResponse.json({ error: "config" }, { status: 500 });
    }
    if (!ok) {
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    let body: { event?: string; payload?: { subscription?: { entity?: RazorpaySubscriptionEntity } } };
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const event = body.event;
    const entity = body.payload?.subscription?.entity;
    if (!event || !entity) {
        return NextResponse.json({ ok: true, skipped: true });
    }

    const mapped = STATUS_MAP[event];
    if (!mapped) {
        return NextResponse.json({ ok: true, ignored: event });
    }

    const sub = await prisma.subscription.findUnique({
        where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) {
        console.warn("[razorpay webhook] subscription not tracked locally", { id: entity.id, event });
        return NextResponse.json({ ok: true, untracked: true });
    }

    await prisma.subscription.update({
        where: { id: sub.id },
        data: {
            status: mapped,
            currentStart: entity.current_start ? new Date(entity.current_start * 1000) : sub.currentStart,
            currentEnd: entity.current_end ? new Date(entity.current_end * 1000) : sub.currentEnd,
        },
    });

    if (ACTIVE_STATUSES.includes(mapped)) {
        await prisma.user.update({
            where: { id: sub.userId },
            data: { planTier: sub.planTier },
        });
    } else if (["CANCELLED", "COMPLETED", "EXPIRED", "HALTED"].includes(mapped)) {
        const stillActive = await prisma.subscription.findFirst({
            where: {
                userId: sub.userId,
                id: { not: sub.id },
                status: { in: ACTIVE_STATUSES },
            },
        });
        if (!stillActive) {
            await prisma.user.update({
                where: { id: sub.userId },
                data: { planTier: "FREE" },
            });
        }
    }

    return NextResponse.json({ ok: true });
}
