import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import { TRPCError } from "@trpc/server";
import { Octokit } from "@octokit/rest";

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
                repoName: z.string().min(1, { message: "Repository name is required" }),
                description: z.string().optional()
            })
        )
        .mutation(async ({ input, ctx }) => {
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

                const octokit = new Octokit({
                    auth: ctx.session.accessToken,
                });

                // Create a new repository with auto-init
                const repo = await octokit.rest.repos.createForAuthenticatedUser({
                    name: input.repoName,
                    description: input.description || `Generated project: ${project.name}`,
                    private: false,
                    auto_init: true,
                });

                // Wait a moment for repository initialization
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Get the project files from the fragment
                const files = latestFragment.files as Record<string, string>;
                
                // Create/update each file using the contents API
                for (const [filePath, content] of Object.entries(files)) {
                    try {
                        await octokit.rest.repos.createOrUpdateFileContents({
                            owner: repo.data.owner.login,
                            repo: repo.data.name,
                            path: filePath,
                            message: `Add ${filePath}`,
                            content: Buffer.from(content).toString('base64'),
                            branch: 'main',
                        });
                    } catch (error) {
                        console.error(`Error creating file ${filePath}:`, error);
                        // Continue with other files even if one fails
                    }
                }

                return { 
                    success: true, 
                    message: "Successfully created GitHub repository!",
                    repoUrl: repo.data.html_url,
                    repoName: repo.data.full_name
                };
                
            } catch (error) {
                console.error('GitHub repo creation error:', error);
                throw new TRPCError({ 
                    code: "INTERNAL_SERVER_ERROR", 
                    message: `Failed to create GitHub repository: ${error instanceof Error ? error.message : 'Unknown error'}` 
                });
            }
        }),
})