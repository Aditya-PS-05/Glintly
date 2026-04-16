"use client";

import { Button } from '@/components/ui/button'
import { useTRPC } from '@/trpc/client'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { ChevronDownIcon, PencilIcon, SunMoonIcon, Trash2Icon } from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
    projectId: string;
}

const ProjectHeader = ({ projectId }: Props) => {
    const router = useRouter();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const { data: project } = useSuspenseQuery(
        trpc.projects.getOne.queryOptions({ id: projectId })
    );

    const { setTheme, theme } = useTheme();

    const [renameOpen, setRenameOpen] = useState(false);
    const [renameValue, setRenameValue] = useState(project.name);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const renameMutation = useMutation(
        trpc.projects.rename.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.projects.getOne.queryOptions({ id: projectId }));
                queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
                setRenameOpen(false);
                toast.success("Project renamed");
            },
            onError: (error) => toast.error(error.message),
        }),
    );

    const deleteMutation = useMutation(
        trpc.projects.delete.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
                toast.success("Project deleted");
                router.push("/");
            },
            onError: (error) => toast.error(error.message),
        }),
    );

    const openRename = () => {
        setRenameValue(project.name);
        setRenameOpen(true);
    };

    return (
        <header className='p-2 flex justify-between items-center border-b'>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className='focus-visible:ring-0 hover:bg-transparent hover:opacity-75 transition-opacity !pl-2'
                    >
                        <Image src="/logo.svg" alt="Glintly" width={18} height={18} />
                        <span className='text-sm font-medium'>{project.name}</span>
                        <ChevronDownIcon />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start">
                    <DropdownMenuItem asChild>
                        <Link href="/" className='text-sm'>
                            <span>Go to Dashboard</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onSelect={openRename}>
                        <PencilIcon className="size-4 text-muted-foreground" />
                        <span>Rename project</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => setDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                    >
                        <Trash2Icon className="size-4" />
                        <span>Delete project</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className='gap-2'>
                            <SunMoonIcon className='size-4 text-muted-foreground' />
                            <span>Appearance</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                                    <DropdownMenuRadioItem value='light'>
                                        <span>Light</span>
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value='dark'>
                                        <span>Dark</span>
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value='system'>
                                        <span>System</span>
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename project</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="Project name"
                        maxLength={80}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
                        <Button
                            disabled={
                                renameMutation.isPending ||
                                renameValue.trim().length === 0 ||
                                renameValue.trim() === project.name
                            }
                            onClick={() =>
                                renameMutation.mutate({ id: projectId, name: renameValue.trim() })
                            }
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently removes all messages and fragments for this project. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate({ id: projectId })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </header>
    )
}

export default ProjectHeader
