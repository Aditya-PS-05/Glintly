import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import { TRPCError } from "@trpc/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
    create: protectedProcedure
        .input(
            z.object({
                value: z.string()
                    .min(1, { message: "Prompt is required" })
                    .max(10000, { message: "Prompt is too long" })
            }),
        )

        .mutation(async ({ input, ctx }) => {
            const createdProject = await prisma.project.create({
                data: {
                    name: generateSlug(2, {
                        format: "kebab"
                    }),
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
                }
            })

            return createdProject;
        }),
    
    pushToGitHub: protectedProcedure
        .input(
            z.object({
                projectId: z.string().min(1, { message: "Project ID is required" }),
                commitMessage: z.string().min(1, { message: "Commit message is required" })
            })
        )
        .mutation(async ({ input, ctx }) => {
            const project = await prisma.project.findUnique({
                where: {
                    id: input.projectId,
                    userId: ctx.user.id
                }
            });

            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }

            try {
                // Get current working directory
                const cwd = process.cwd();
                
                // Check if we're in a git repository
                await execAsync('git rev-parse --is-inside-work-tree', { cwd });
                
                // Check git status
                const { stdout: status } = await execAsync('git status --porcelain', { cwd });
                
                if (status.trim()) {
                    // Add all changes
                    await execAsync('git add .', { cwd });
                    
                    // Commit changes
                    await execAsync(`git commit -m "${input.commitMessage}"`, { cwd });
                }
                
                // Push to GitHub
                await execAsync('git push origin main', { cwd });
                
                return { success: true, message: "Successfully pushed to GitHub" };
                
            } catch (error) {
                console.error('GitHub push error:', error);
                throw new TRPCError({ 
                    code: "INTERNAL_SERVER_ERROR", 
                    message: `Failed to push to GitHub: ${error instanceof Error ? error.message : 'Unknown error'}` 
                });
            }
        }),
})