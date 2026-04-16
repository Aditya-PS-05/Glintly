import type { PlanTier } from "@/generated/prisma";

export interface PlanLimits {
    tier: PlanTier;
    label: string;
    priceLabel: string;
    dailyGenerations: number | null; // null = unlimited
    hourlyGenerations: number;
    hourlyGithubPushes: number;
    allowMobile: boolean;
    allowPrivateRepo: boolean;
    sandboxTimeoutMs: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
    FREE: {
        tier: "FREE",
        label: "Free",
        priceLabel: "₹0",
        dailyGenerations: 5,
        hourlyGenerations: 10,
        hourlyGithubPushes: 5,
        allowMobile: false,
        allowPrivateRepo: false,
        sandboxTimeoutMs: 60_000,
    },
    PRO: {
        tier: "PRO",
        label: "Pro",
        priceLabel: "₹799 / mo",
        dailyGenerations: null,
        hourlyGenerations: 60,
        hourlyGithubPushes: 30,
        allowMobile: true,
        allowPrivateRepo: true,
        sandboxTimeoutMs: 180_000,
    },
    TEAM: {
        tier: "TEAM",
        label: "Team",
        priceLabel: "Contact sales",
        dailyGenerations: null,
        hourlyGenerations: 240,
        hourlyGithubPushes: 120,
        allowMobile: true,
        allowPrivateRepo: true,
        sandboxTimeoutMs: 300_000,
    },
};

export function getPlan(tier: PlanTier | null | undefined): PlanLimits {
    return PLAN_LIMITS[tier ?? "FREE"] ?? PLAN_LIMITS.FREE;
}
