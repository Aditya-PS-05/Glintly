"use client";

import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from '@/lib/utils';
import { Form, FormField } from '@/components/ui/form';
import TextareaAutosize from "react-textarea-autosize";
import { Button } from '@/components/ui/button';
import { ArrowUpIcon, LockIcon, Loader2Icon } from 'lucide-react';
import { useTRPC } from '@/trpc/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { PROJECT_TEMPLATES } from '../../constants';

const formSchema = z.object({
    value: z.string()
        .min(1, { message: "value is required" })
        .max(10000, { message: "value is too long" }),
    type: z.enum(["WEB", "MOBILE"]),
})

const ProjectForm = () => {
    const router = useRouter();
    const trpc = useTRPC();
    const queryclient = useQueryClient();

    const usage = useQuery(trpc.auth.getUsage.queryOptions());
    const planTier = usage.data?.planTier ?? "FREE";
    const mobileLocked = planTier === "FREE";

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: "",
            type: "WEB",
        }
    })

    const createProject = useMutation(trpc.projects.create.mutationOptions({
        onSuccess: (data) => {
            queryclient.invalidateQueries(
                trpc.projects.getMany.queryOptions()
            );
            router.push(`/projects/${data.id}`)
        },
        onError: (error) => {
            toast.error(error.message)
        }
    }))

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        await createProject.mutateAsync({
            value: values.value,
            type: values.type,
        })
    }

    const selectedType = form.watch("type");

    const onSelect = (value: string) => {
        form.setValue("value", value, {
            shouldDirty: true,
            shouldValidate: true,
            shouldTouch: true
        })

    }

    const [isFocused, setIsFocused] = useState<boolean>(false);
    const isPending = createProject.isPending;
    const isDisabled = isPending || !form.formState.isValid;

    return (
        <Form {...form}>
            <section className='space-y-6'>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className={cn(
                        "relative border p-4 pt-3 rounded-xl bg-sidebar dark:bg-siderbar transition-all",
                        isFocused && "shadow-xs",
                    )}
                >
                    <div className="flex items-center gap-1 pb-2">
                        {(["WEB", "MOBILE"] as const).map((t) => {
                            const locked = t === "MOBILE" && mobileLocked;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                        if (locked) {
                                            toast.info("Mobile generation is a Pro feature.");
                                            router.push("/pricing");
                                            return;
                                        }
                                        form.setValue("type", t, { shouldDirty: true });
                                    }}
                                    aria-pressed={selectedType === t}
                                    className={cn(
                                        "px-3 py-1 text-xs rounded-md border transition-colors inline-flex items-center gap-1",
                                        selectedType === t
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-muted text-muted-foreground hover:bg-muted/70",
                                        locked && "opacity-80",
                                    )}
                                >
                                    {t === "WEB" ? "🌐 Web" : "📱 Mobile"}
                                    {locked && <LockIcon className="size-3" />}
                                </button>
                            );
                        })}
                    </div>
                    <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                            <TextareaAutosize
                                {...field}
                                disabled={isPending}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                minRows={2}
                                maxRows={8}
                                className="pt-4 resize-none border-none w-full outline-none bg-transparent"
                                placeholder={
                                    selectedType === "MOBILE"
                                        ? "Describe the mobile app you want to build…"
                                        : "What would you like to build?"
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault();
                                        form.handleSubmit(onSubmit)();
                                    }
                                }}
                            />
                        )}
                    />

                    <div className='flex gap-x-2 items-end justify-between pt-2'>
                        <div className='text-[10px] text-muted-foreground font-mono'>
                            <kbd className='ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground'>
                                <span className=''>
                                    &#8984;
                                </span>
                                Enter
                            </kbd>
                            &nbsp; to submit
                        </div>
                        <Button
                            className={cn(
                                "size-8 rounded-full",
                                isDisabled && "bg-muted-foreground border"
                            )}
                            disabled={isDisabled}

                        >
                            {isPending ? (
                                <Loader2Icon className='size-4 animate-spin' />
                            ) : (
                                <ArrowUpIcon />
                            )}
                        </Button>
                    </div>

                </form>
                <div className='flex-wrap justify-center gap-2 hidden md:flex max-w-3xl'>
                    {PROJECT_TEMPLATES.map((template) => (
                        <Button
                            key={template.title}
                            variant="outline"
                            size="sm"
                            className='bg-white dark:bg-sidebar'
                            onClick={() => onSelect(template.prompt)}
                        >
                            {template.emoji} {template.title}
                        </Button>
                    ))}
                </div>
            </section>
        </Form>
    )
}

export default ProjectForm