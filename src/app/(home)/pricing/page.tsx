"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Loader2Icon } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type TierId = "FREE" | "PRO" | "TEAM";

const tiers: Array<{
    id: TierId;
    name: string;
    price: string;
    cadence: string;
    description: string;
    highlighted: boolean;
    features: string[];
}> = [
    {
        id: "FREE",
        name: "Free",
        price: "₹0",
        cadence: "forever",
        description: "Kick the tires. Build a couple of quick apps a day.",
        highlighted: false,
        features: [
            "5 generations per day",
            "Public sandbox previews",
            "Web projects (Next.js)",
            "Push to public GitHub repos",
        ],
    },
    {
        id: "PRO",
        name: "Pro",
        price: "₹799",
        cadence: "/ month",
        description: "For builders shipping real apps on a steady cadence.",
        highlighted: true,
        features: [
            "Unlimited daily generations",
            "Web + mobile projects",
            "Private GitHub pushes",
            "Longer sandbox lifetimes",
            "Priority rate limits",
        ],
    },
    {
        id: "TEAM",
        name: "Team",
        price: "Contact",
        cadence: "sales",
        description: "Shared workspaces, per-seat billing, single sign-on.",
        highlighted: false,
        features: [
            "Everything in Pro",
            "Shared project workspaces",
            "SSO (Google / GitHub org)",
            "Usage analytics dashboard",
            "Priority email support",
        ],
    },
];

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    }
}

const Page = () => {
    const router = useRouter();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { status: sessionStatus } = useSession();

    const subscription = useQuery(trpc.billing.getSubscription.queryOptions());
    const [pendingTier, setPendingTier] = useState<TierId | null>(null);
    const [scriptReady, setScriptReady] = useState(false);

    const currentTier: TierId = (subscription.data?.planTier as TierId) ?? "FREE";

    const checkout = useMutation(
        trpc.billing.createCheckoutSubscription.mutationOptions({
            onSuccess: ({ subscriptionId, keyId }) => {
                if (!window.Razorpay) {
                    toast.error("Razorpay failed to load. Refresh and try again.");
                    setPendingTier(null);
                    return;
                }
                if (!keyId) {
                    toast.error("Razorpay is not configured. Contact support.");
                    setPendingTier(null);
                    return;
                }
                const rz = new window.Razorpay({
                    key: keyId,
                    subscription_id: subscriptionId,
                    name: "Glintly",
                    description: `${pendingTier} plan subscription`,
                    theme: { color: "#6366f1" },
                    handler: () => {
                        toast.success("Payment authorized. Your plan will activate shortly.");
                        queryClient.invalidateQueries(trpc.billing.getSubscription.queryOptions());
                        queryClient.invalidateQueries(trpc.auth.getUsage.queryOptions());
                        setPendingTier(null);
                    },
                    modal: {
                        ondismiss: () => setPendingTier(null),
                    },
                });
                rz.open();
            },
            onError: (error) => {
                toast.error(error.message);
                setPendingTier(null);
            },
        }),
    );

    useEffect(() => {
        if (typeof window !== "undefined" && window.Razorpay) setScriptReady(true);
    }, []);

    const onSelect = (tier: (typeof tiers)[number]) => {
        if (tier.id === "FREE") {
            router.push("/");
            return;
        }
        if (tier.id === "TEAM") {
            window.location.href = "mailto:hello@glintly.app";
            return;
        }
        if (sessionStatus !== "authenticated") {
            router.push("/sign-in?callbackUrl=/pricing");
            return;
        }
        if (currentTier === tier.id) {
            toast.info("You're already on this plan.");
            return;
        }
        setPendingTier(tier.id);
        checkout.mutate({ tier: tier.id as "PRO" | "TEAM" });
    };

    const ctaLabel = (tier: (typeof tiers)[number]) => {
        if (tier.id === "FREE") return currentTier === "FREE" ? "Current plan" : "Start building";
        if (tier.id === "TEAM") return "Contact sales";
        if (currentTier === tier.id) return "Current plan";
        if (currentTier === "TEAM" && tier.id === "PRO") return "Downgrade";
        return "Upgrade to Pro";
    };

    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full">
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="afterInteractive"
                onLoad={() => setScriptReady(true)}
            />
            <section className="space-y-6 py-[10vh] 2xl:py-24">
                <div className="flex flex-col items-center">
                    <Image
                        src="/logo.svg"
                        alt="Glintly"
                        width={50}
                        height={50}
                        className="hidden md:block"
                    />
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-center">
                    Simple pricing for every stage
                </h1>
                <p className="text-base md:text-xl text-muted-foreground text-center max-w-2xl mx-auto">
                    Start free. Upgrade when you need more generations, longer sandboxes, or to share workspaces with teammates.
                </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-16">
                {tiers.map((tier) => {
                    const isCurrent = currentTier === tier.id;
                    const isBusy = pendingTier === tier.id && checkout.isPending;
                    return (
                        <div
                            key={tier.id}
                            className={
                                "rounded-2xl border bg-sidebar p-6 flex flex-col gap-4 " +
                                (tier.highlighted ? "border-primary shadow-lg ring-1 ring-primary/30 " : "") +
                                (isCurrent ? "ring-2 ring-primary/60" : "")
                            }
                        >
                            <div className="flex items-baseline justify-between">
                                <h2 className="text-xl font-semibold">{tier.name}</h2>
                                {isCurrent ? (
                                    <span className="text-[10px] font-medium uppercase tracking-wide bg-primary text-primary-foreground rounded px-2 py-0.5">
                                        Current
                                    </span>
                                ) : tier.highlighted ? (
                                    <span className="text-[10px] font-medium uppercase tracking-wide bg-primary text-primary-foreground rounded px-2 py-0.5">
                                        Most popular
                                    </span>
                                ) : null}
                            </div>
                            <div className="flex items-end gap-1">
                                <span className="text-3xl font-bold">{tier.price}</span>
                                <span className="text-muted-foreground text-sm pb-1">{tier.cadence}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{tier.description}</p>
                            <ul className="space-y-2 text-sm flex-1">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2">
                                        <Check className="size-4 mt-0.5 text-primary shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            {tier.id === "TEAM" ? (
                                <Button asChild variant={tier.highlighted ? "default" : "outline"} className="w-full">
                                    <Link href="mailto:hello@glintly.app">{ctaLabel(tier)}</Link>
                                </Button>
                            ) : (
                                <Button
                                    variant={tier.highlighted ? "default" : "outline"}
                                    className="w-full"
                                    disabled={isCurrent || isBusy || (tier.id !== "FREE" && !scriptReady)}
                                    onClick={() => onSelect(tier)}
                                >
                                    {isBusy && <Loader2Icon className="size-4 mr-2 animate-spin" />}
                                    {ctaLabel(tier)}
                                </Button>
                            )}
                        </div>
                    );
                })}
            </section>

            <p className="text-center text-xs text-muted-foreground pb-8">
                Payments processed securely by Razorpay. Cancel anytime from <Link className="underline" href="/settings">Settings</Link>.
            </p>
        </div>
    );
};

export default Page;
