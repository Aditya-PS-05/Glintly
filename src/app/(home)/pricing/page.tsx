import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const tiers = [
    {
        name: "Free",
        price: "$0",
        cadence: "forever",
        description: "Kick the tires. Build a couple of quick apps a day.",
        cta: { label: "Start building", href: "/" },
        highlighted: false,
        features: [
            "5 generations per day",
            "Public sandbox previews",
            "Web projects (Next.js)",
            "Push to GitHub",
        ],
    },
    {
        name: "Pro",
        price: "$20",
        cadence: "/ month",
        description: "For builders shipping real apps on a steady cadence.",
        cta: { label: "Upgrade to Pro", href: "/" },
        highlighted: true,
        features: [
            "Unlimited generations",
            "Web + mobile projects",
            "Priority sandbox queue",
            "Private GitHub pushes",
            "Longer sandbox lifetimes",
        ],
    },
    {
        name: "Team",
        price: "$60",
        cadence: "/ user / month",
        description: "Shared workspaces, per-seat billing, single sign-on.",
        cta: { label: "Contact sales", href: "mailto:hello@glintly.app" },
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

const Page = () => {
    return (
        <div className="flex flex-col max-w-5xl mx-auto w-full">
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
                {tiers.map((tier) => (
                    <div
                        key={tier.name}
                        className={
                            "rounded-2xl border bg-sidebar p-6 flex flex-col gap-4 " +
                            (tier.highlighted ? "border-primary shadow-lg ring-1 ring-primary/30" : "")
                        }
                    >
                        <div className="flex items-baseline justify-between">
                            <h2 className="text-xl font-semibold">{tier.name}</h2>
                            {tier.highlighted && (
                                <span className="text-[10px] font-medium uppercase tracking-wide bg-primary text-primary-foreground rounded px-2 py-0.5">
                                    Most popular
                                </span>
                            )}
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
                        <Button asChild variant={tier.highlighted ? "default" : "outline"} className="w-full">
                            <Link href={tier.cta.href}>{tier.cta.label}</Link>
                        </Button>
                    </div>
                ))}
            </section>

            <p className="text-center text-xs text-muted-foreground pb-8">
                Billing and subscription management are coming soon. Questions? <a className="underline" href="mailto:hello@glintly.app">Contact us</a>.
            </p>
        </div>
    );
};

export default Page;
