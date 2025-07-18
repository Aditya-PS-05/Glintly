"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitBranch, Loader2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
    projectId: string;
}

export const GitHubPushButton = ({ projectId }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [commitMessage, setCommitMessage] = useState("");
    const trpc = useTRPC();
    
    const pushToGitHub = useMutation(trpc.projects.pushToGitHub.mutationOptions({
        onSuccess: () => {
            toast.success("Successfully pushed to GitHub!");
            setIsOpen(false);
            setCommitMessage("");
        },
        onError: (error) => {
            toast.error(error.message);
        }
    }));

    const handlePush = () => {
        if (!commitMessage.trim()) {
            toast.error("Please enter a commit message");
            return;
        }
        
        pushToGitHub.mutateAsync({
            projectId,
            commitMessage: commitMessage.trim()
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <GitBranch className="h-4 w-4" />
                    Push to GitHub
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Push to GitHub</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="commit-message" className="text-right">
                            Commit Message
                        </Label>
                        <Input
                            id="commit-message"
                            placeholder="Enter commit message..."
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            className="col-span-3"
                            disabled={pushToGitHub.isPending}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={pushToGitHub.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePush}
                        disabled={pushToGitHub.isPending}
                    >
                        {pushToGitHub.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Push to GitHub
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};