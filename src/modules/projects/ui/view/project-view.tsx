"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { MessagesContainer } from "../components/messages-container";
import { Suspense, useMemo, useState } from "react";
import { Fragment } from "@/generated/prisma";
import ProjectHeader from "../components/project-header";
import FragmentWeb from "../components/fragment-web";
import { FragmentMobile } from "../components/fragment-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeIcon, CrownIcon, EyeIcon, SmartphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileExplorer } from "@/components/file-explorer";
import { GitHubPushButton } from "../components/github-push-button";

interface Props {
    projectId: string
}

type TabValue = "preview" | "device" | "code";

export const ProjectView = ({ projectId }: Props) => {
    const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
    const [tabState, setTabState] = useState<TabValue>("preview");

    const isMobile = (activeFragment as Fragment | null)?.type === "MOBILE";
    const expoUrl = (activeFragment as (Fragment & { expoUrl?: string | null }) | null)?.expoUrl ?? null;

    const availableTabs = useMemo<TabValue[]>(
        () => (isMobile ? ["preview", "device", "code"] : ["preview", "code"]),
        [isMobile],
    );

    const effectiveTab: TabValue = availableTabs.includes(tabState) ? tabState : "preview";

    return (
        <div className="h-screen">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={35}
                    minSize={20}
                    className="flex flex-col min-h-0"
                >
                    <Suspense fallback={<p>Loading Project...</p>}>
                        <ProjectHeader projectId={projectId} />
                    </Suspense>
                    <Suspense fallback={<p>Loading Message...</p>}>
                        <MessagesContainer
                            projectId={projectId}
                            activeFragment={activeFragment}
                            setActiveFragment={setActiveFragment}
                        />
                    </Suspense>
                </ResizablePanel>
                <ResizableHandle className="hover:bg-primary transition-colors" />
                <ResizablePanel
                    defaultSize={65}
                    minSize={50}
                >
                    <Tabs
                        className="h-full gap-y-0"
                        defaultValue="preview"
                        value={effectiveTab}
                        onValueChange={(value) => setTabState(value as TabValue)}
                    >
                        <div className="w-full flex items-center p-2 border-b gap-x-2">
                            <TabsList className="h-8 p-0 border rounded-md">
                                <TabsTrigger value="preview" className="rounded-md">
                                    <EyeIcon /> <span>Demo</span>
                                </TabsTrigger>
                                {isMobile && (
                                    <TabsTrigger value="device" className="rounded-md">
                                        <SmartphoneIcon /> <span>Device</span>
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="code" className="rounded-md">
                                    <CodeIcon /> <span>Code</span>
                                </TabsTrigger>
                            </TabsList>
                            <div className="ml-auto flex items-center gap-x-2">
                                <GitHubPushButton projectId={projectId} />
                                <Button asChild size="sm" value="default" variant="tertiary">
                                    <Link href="pricing">
                                        <CrownIcon /> Upgrade
                                    </Link>
                                </Button>
                            </div>
                        </div>
                        <TabsContent value="preview">
                            {!!activeFragment && <FragmentWeb data={activeFragment} />}
                        </TabsContent>
                        {isMobile && (
                            <TabsContent value="device" className="min-h-0">
                                {!!activeFragment && (
                                    <FragmentMobile
                                        expoUrl={expoUrl}
                                        webPreviewUrl={activeFragment.sandboxUrl}
                                    />
                                )}
                            </TabsContent>
                        )}
                        <TabsContent value="code" className="min-h-0">
                            {!!activeFragment?.files && (
                                <FileExplorer files={activeFragment?.files as { [path: string]: string }} />
                            )}
                        </TabsContent>
                    </Tabs>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
