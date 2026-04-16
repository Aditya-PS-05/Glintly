import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import { TRPCError } from "@trpc/server";
import { Octokit } from "@octokit/rest";
import { sanitizeFilesForGitHub } from "@/lib/sanitize-paths";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPlan } from "@/lib/billing/plans";

async function getUserPlan(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { planTier: true },
    });
    return getPlan(user?.planTier);
}

export const projectsRouter = createTRPCRouter({

    getOne: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1, {message: "Id is required"})
            })
        )
        .query(async ({input, ctx}) => {
            const existingProject = await prisma.project.findUnique({
                where: {
                    id: input.id,
                    userId: ctx.user.id
                }
            });

            if(!existingProject) {
                throw new TRPCError({code: "NOT_FOUND", message:"Project not found"})
            }

            return existingProject;
        }),
    getMany: protectedProcedure
        .query(async ({ctx}) => {
            const projects = await prisma.project.findMany({
                where: {
                    userId: ctx.user.id
                },
                orderBy: {
                    updatedAt: "desc"
                }
            });

            return projects;
        }),
    rename: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
                name: z
                    .string()
                    .trim()
                    .min(1, { message: "Name is required" })
                    .max(80, { message: "Name is too long" }),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const project = await prisma.project.findUnique({
                where: { id: input.id, userId: ctx.user.id },
            });
            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }
            return prisma.project.update({
                where: { id: input.id },
                data: { name: input.name },
            });
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ input, ctx }) => {
            const project = await prisma.project.findUnique({
                where: { id: input.id, userId: ctx.user.id },
            });
            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }
            await prisma.project.delete({ where: { id: input.id } });
            return { success: true };
        }),
    create: protectedProcedure
        .input(
            z.object({
                value: z.string()
                    .min(1, { message: "Prompt is required" })
                    .max(10000, { message: "Prompt is too long" }),
                type: z.enum(["WEB", "MOBILE"]).optional().default("WEB"),
            }),
        )

        .mutation(async ({ input, ctx }) => {
            const plan = await getUserPlan(ctx.user.id);

            if (input.type === "MOBILE" && !plan.allowMobile) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Mobile apps are a Pro feature. Upgrade at /pricing.",
                });
            }

            const hourly = await checkRateLimit({
                key: `project-create:${ctx.user.id}`,
                limit: plan.hourlyGenerations,
                windowMs: 60 * 60 * 1000,
            });
            if (!hourly.allowed) {
                throw new TRPCError({
                    code: "TOO_MANY_REQUESTS",
                    message: "Hourly generation limit reached. Try again later.",
                });
            }

            if (plan.dailyGenerations != null) {
                const startOfDay = new Date();
                startOfDay.setUTCHours(0, 0, 0, 0);
                const dailyCount = await prisma.project.count({
                    where: { userId: ctx.user.id, createdAt: { gte: startOfDay } },
                });
                if (dailyCount >= plan.dailyGenerations) {
                    throw new TRPCError({
                        code: "TOO_MANY_REQUESTS",
                        message: `Daily limit of ${plan.dailyGenerations} generations reached on the ${plan.label} plan. Upgrade at /pricing.`,
                    });
                }
            }

            const createdProject = await prisma.project.create({
                data: {
                    name: generateSlug(2, {
                        format: "kebab"
                    }),
                    type: input.type,
                    userId: ctx.user.id,
                    messages: {
                        create: {
                            content: input.value,
                            role: "USER",
                            type: "RESULT"
                        }
                    },
                },
            });

            await inngest.send({
                name: "code-agent/run",
                data: {
                    value: input.value,
                    projectId: createdProject.id,
                    projectType: input.type,
                }
            })

            return createdProject;
        }),

    pushToGitHub: protectedProcedure
        .input(
            z.object({
                projectId: z.string().min(1, { message: "Project ID is required" }),
                repoName: z
                    .string()
                    .min(1, { message: "Repository name is required" })
                    .max(100)
                    .regex(/^[A-Za-z0-9._-]+$/, {
                        message: "Invalid repository name",
                    }),
                description: z.string().max(350).optional(),
                isPrivate: z.boolean().optional().default(true),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const plan = await getUserPlan(ctx.user.id);

            if (input.isPrivate && !plan.allowPrivateRepo) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Private repositories require a Pro plan. Upgrade at /pricing.",
                });
            }

            const rl = await checkRateLimit({
                key: `gh-push:${ctx.user.id}`,
                limit: plan.hourlyGithubPushes,
                windowMs: 60 * 60 * 1000,
            });
            if (!rl.allowed) {
                throw new TRPCError({
                    code: "TOO_MANY_REQUESTS",
                    message: "Rate limit exceeded. Try again later.",
                });
            }
            const project = await prisma.project.findUnique({
                where: {
                    id: input.projectId,
                    userId: ctx.user.id
                },
                include: {
                    messages: {
                        include: {
                            fragment: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }

            // Find the latest fragment with files
            const latestFragment = project.messages.find(msg => msg.fragment?.files)?.fragment;
            
            if (!latestFragment || !latestFragment.files) {
                throw new TRPCError({ 
                    code: "NOT_FOUND", 
                    message: "No generated files found for this project" 
                });
            }

            try {
                // Get GitHub access token from session
                if (ctx.session.provider !== 'github' || !ctx.session.accessToken) {
                    throw new TRPCError({ 
                        code: "UNAUTHORIZED", 
                        message: "GitHub account not connected. Please sign in with GitHub." 
                    });
                }

                const rawFiles = latestFragment.files as Record<string, string>;
                let sanitized;
                try {
                    sanitized = sanitizeFilesForGitHub(rawFiles);
                } catch (error) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: error instanceof Error ? error.message : "Invalid files",
                    });
                }

                if (sanitized.files.length === 0) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "No files passed path sanitization",
                    });
                }

                const octokit = new Octokit({
                    auth: ctx.session.accessToken,
                });

                const repo = await octokit.rest.repos.createForAuthenticatedUser({
                    name: input.repoName,
                    description: input.description || `Generated project: ${project.name}`,
                    private: input.isPrivate,
                    auto_init: true,
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

                const fileErrors: { path: string; reason: string }[] = [];
                for (const file of sanitized.files) {
                    try {
                        await octokit.rest.repos.createOrUpdateFileContents({
                            owner: repo.data.owner.login,
                            repo: repo.data.name,
                            path: file.path,
                            message: `Add ${file.path}`,
                            content: Buffer.from(file.content, "utf8").toString("base64"),
                            branch: "main",
                        });
                    } catch (error) {
                        fileErrors.push({
                            path: file.path,
                            reason: error instanceof Error ? error.message : "unknown",
                        });
                    }
                }

                return {
                    success: true,
                    message: "Successfully created GitHub repository!",
                    repoUrl: repo.data.html_url,
                    repoName: repo.data.full_name,
                    rejected: sanitized.rejected,
                    fileErrors,
                };

            } catch (error) {
                if (error instanceof TRPCError) throw error;
                console.error('GitHub repo creation error:', error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to create GitHub repository: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }),
})