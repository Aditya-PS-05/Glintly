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
    const [repoName, setRepoName] = useState("");
    const [description, setDescription] = useState("");
    const trpc = useTRPC();
    
    const pushToGitHub = useMutation(trpc.projects.pushToGitHub.mutationOptions({
        onSuccess: (data) => {
            toast.success("Successfully created GitHub repository!");
            toast.success(
                <div>
                    <p>Repository created successfully!</p>
                    <a 
                        href={data.repoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                    >
                        View on GitHub
                    </a>
                </div>
            );
            setIsOpen(false);
            setRepoName("");
            setDescription("");
        },
        onError: (error) => {
            toast.error(error.message);
        }
    }));

    const handlePush = () => {
        if (!repoName.trim()) {
            toast.error("Please enter a repository name");
            return;
        }
        
        pushToGitHub.mutateAsync({
            projectId,
            repoName: repoName.trim(),
            description: description.trim() || undefined
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <GitBranch className="h-4 w-4" />
                    Create GitHub Repo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create GitHub Repository</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        This will create a new GitHub repository with your generated project files.
                    </p>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="repo-name" className="text-right">
                            Repository Name
                        </Label>
                        <Input
                            id="repo-name"
                            placeholder="my-awesome-project"
                            value={repoName}
                            onChange={(e) => setRepoName(e.target.value)}
                            className="col-span-3"
                            disabled={pushToGitHub.isPending}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Input
                            id="description"
                            placeholder="A project generated with AI (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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
                        Create Repository
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};