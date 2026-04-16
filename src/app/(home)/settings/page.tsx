"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GithubIcon, ChromeIcon, KeyIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

const PROVIDER_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    github: { label: "GitHub", icon: GithubIcon },
    google: { label: "Google", icon: ChromeIcon },
    credentials: { label: "Email & password", icon: KeyIcon },
};

function formatDuration(ms: number) {
    if (ms < 1000) return `${ms} ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
}

const SettingsPage = () => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const connectionsQuery = useQuery(trpc.auth.getConnections.queryOptions());
    const usageQuery = useQuery(trpc.auth.getUsage.queryOptions());
    const subscriptionQuery = useQuery(trpc.billing.getSubscription.queryOptions());

    const disconnect = useMutation(
        trpc.auth.disconnect.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.auth.getConnections.queryOptions());
                toast.success("Provider disconnected");
            },
            onError: (error) => toast.error(error.message),
        }),
    );

    const cancelSubscription = useMutation(
        trpc.billing.cancelSubscription.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.billing.getSubscription.queryOptions());
                queryClient.invalidateQueries(trpc.auth.getUsage.queryOptions());
                toast.success("Subscription will cancel at period end.");
            },
            onError: (error) => toast.error(error.message),
        }),
    );

    const connections = connectionsQuery.data ?? [];
    const usage = usageQuery.data;
    const subscription = subscriptionQuery.data?.subscription;
    const planTier = subscriptionQuery.data?.planTier ?? "FREE";

    return (
        <div className="flex flex-col max-w-3xl mx-auto w-full py-10 gap-8">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your connected accounts and view your usage.
                </p>
            </header>

            <section className="rounded-2xl border bg-sidebar p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Billing</h2>
                        <p className="text-xs text-muted-foreground">
                            Manage your subscription and plan tier.
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/pricing">View plans</Link>
                    </Button>
                </div>
                {subscriptionQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                    <div className="space-y-3">
                        <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <dt className="text-xs uppercase text-muted-foreground">Plan</dt>
                                <dd className="font-semibold">{planTier}</dd>
                            </div>
                            {subscription && (
                                <>
                                    <div>
                                        <dt className="text-xs uppercase text-muted-foreground">Status</dt>
                                        <dd className="font-semibold">{subscription.status}</dd>
                                    </div>
                                    {subscription.currentEnd && (
                                        <div>
                                            <dt className="text-xs uppercase text-muted-foreground">
                                                {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"}
                                            </dt>
                                            <dd className="font-semibold">
                                                {new Date(subscription.currentEnd).toLocaleDateString()}
                                            </dd>
                                        </div>
                                    )}
                                </>
                            )}
                        </dl>
                        {subscription && !subscription.cancelAtPeriodEnd && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={cancelSubscription.isPending}
                                onClick={() => {
                                    if (confirm("Cancel your subscription at the end of the current period?")) {
                                        cancelSubscription.mutate();
                                    }
                                }}
                            >
                                {cancelSubscription.isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
                                Cancel subscription
                            </Button>
                        )}
                        {subscription?.cancelAtPeriodEnd && (
                            <p className="text-xs text-muted-foreground">
                                Your subscription will not renew. Access continues until the period ends.
                            </p>
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-2xl border bg-sidebar p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Connected accounts</h2>
                    <p className="text-xs text-muted-foreground">
                        Disconnecting removes access from this provider. You can reconnect by signing in again.
                    </p>
                </div>
                {connectionsQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : connections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No OAuth providers connected.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {connections.map((acc) => {
                            const meta = PROVIDER_META[acc.provider] ?? { label: acc.provider, icon: KeyIcon };
                            const Icon = meta.icon;
                            return (
                                <li key={acc.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-3">
                                        <Icon className="size-5 text-muted-foreground" />
                                        <div className="text-sm">{meta.label}</div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={disconnect.isPending}
                                        onClick={() => disconnect.mutate({ provider: acc.provider })}
                                    >
                                        Disconnect
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="rounded-2xl border bg-sidebar p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Usage this month</h2>
                    <p className="text-xs text-muted-foreground">
                        Resets on the 1st of each month. Limits depend on your plan tier.
                    </p>
                </div>
                {usageQuery.isLoading || !usage ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <dt className="text-xs uppercase text-muted-foreground">Plan</dt>
                            <dd className="font-semibold">{usage.planTier}</dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase text-muted-foreground">Agent runs</dt>
                            <dd className="font-semibold">{usage.totals.runs}</dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase text-muted-foreground">Sandbox time</dt>
                            <dd className="font-semibold">{formatDuration(usage.totals.sandboxMs)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs uppercase text-muted-foreground">Tokens</dt>
                            <dd className="font-semibold">
                                {usage.totals.inputTokens + usage.totals.outputTokens}
                            </dd>
                        </div>
                    </dl>
                )}
            </section>
        </div>
    );
};

export default SettingsPage;
