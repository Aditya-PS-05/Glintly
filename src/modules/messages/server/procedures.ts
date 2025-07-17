import { inngest } from "@/inngest/client";
import prisma from "@/lib/prisma";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const messagesRouter = createTRPCRouter({
    getMany: protectedProcedure
        .input(
            z.object({
                projectId: z.string().min(1, {message: "ProjectID is required"})
            }),
        )
        .query(async ({input, ctx}) => {
            // Verify user owns the project
            const project = await prisma.project.findUnique({
                where: {
                    id: input.projectId,
                    userId: ctx.user.id
                }
            });

            if (!project) {
                throw new TRPCError({code: "NOT_FOUND", message: "Project not found"});
            }

            const messages = await prisma.message.findMany({
                where:{
                    projectId: input.projectId
                },
                include: {
                    fragment: true
                },
                orderBy: {
                    updatedAt: "asc"
                }
            });

            return messages;
        }),
    create: protectedProcedure
        .input(
            z.object({
                value: z.string()
                    .min(1, { message: "value is required" })
                    .max(10000, { message: "value is too long" }),
                projectId: z.string().min(1, {message: "ProjectID is required"})
            }),
        )

        .mutation(async ({input, ctx}) => {
            // Verify user owns the project
            const project = await prisma.project.findUnique({
                where: {
                    id: input.projectId,
                    userId: ctx.user.id
                }
            });

            if (!project) {
                throw new TRPCError({code: "NOT_FOUND", message: "Project not found"});
            }

            const newMessage = await prisma.message.create({
                data: {
                    projectId: input.projectId,
                    content: input.value,
                    role: "USER",
                    type: "RESULT"
                },
            });

            await inngest.send({
                name: "code-agent/run",
                data: {
                  value: input.value,
                  projectId: input.projectId
                }
              })

            return newMessage;
        }),
})