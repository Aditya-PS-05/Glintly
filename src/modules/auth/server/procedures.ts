import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { createTRPCRouter, baseProcedure, protectedProcedure } from '@/trpc/init';
import prisma from '@/lib/prisma';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  changePasswordSchema 
} from '@/lib/validations/auth';

export const authRouter = createTRPCRouter({
  // Register a new user
  register: baseProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      const { name, email, password } = input;

      try {
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User already exists with this email',
          });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        });

        return {
          success: true,
          user,
          message: 'User registered successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to register user',
        });
      }
    }),

  // Login with credentials (this will work with NextAuth)
  login: baseProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const { email, password } = input;

      try {
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            image: true,
          }
        });

        if (!user || !user.password) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials',
          });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials',
          });
        }

        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          },
          message: 'Login successful',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to login',
        });
      }
    }),

  // Get current session
  getSession: baseProcedure
    .query(async ({ ctx }) => {
      return {
        session: ctx.session,
        user: ctx.user,
      };
    }),

  // Get current user (protected)
  getMe: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        return user;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user',
        });
      }
    }),

  // Update profile (protected)
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await prisma.user.update({
          where: { id: ctx.user.id },
          data: input,
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        });

        return {
          success: true,
          user,
          message: 'Profile updated successfully',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }
    }),

  // List connected OAuth providers
  getConnections: protectedProcedure
    .query(async ({ ctx }) => {
      const accounts = await prisma.account.findMany({
        where: { userId: ctx.user.id },
        select: { id: true, provider: true },
      });
      return accounts;
    }),

  // Disconnect an OAuth provider (deletes the Account row).
  // Keeping one provider connected if no password is set keeps the user
  // from locking themselves out.
  disconnect: protectedProcedure
    .input(z.object({ provider: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: {
          password: true,
          accounts: { select: { id: true, provider: true } },
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const remaining = user.accounts.filter((a) => a.provider !== input.provider);
      if (!user.password && remaining.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Set a password before disconnecting your last login provider, or you'll be locked out.",
        });
      }
      await prisma.account.deleteMany({
        where: { userId: ctx.user.id, provider: input.provider },
      });
      return { success: true };
    }),

  // Current month's usage summary for the signed-in user.
  getUsage: protectedProcedure
    .query(async ({ ctx }) => {
      const since = new Date();
      since.setUTCDate(1);
      since.setUTCHours(0, 0, 0, 0);
      const events = await prisma.usageEvent.findMany({
        where: { userId: ctx.user.id, createdAt: { gte: since } },
        select: {
          kind: true,
          projectType: true,
          sandboxMs: true,
          inputTokens: true,
          outputTokens: true,
          createdAt: true,
        },
      });
      const totalRuns = events.length;
      const totalSandboxMs = events.reduce((acc, e) => acc + (e.sandboxMs ?? 0), 0);
      const totalInputTokens = events.reduce((acc, e) => acc + (e.inputTokens ?? 0), 0);
      const totalOutputTokens = events.reduce((acc, e) => acc + (e.outputTokens ?? 0), 0);
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { planTier: true },
      });
      return {
        periodStart: since.toISOString(),
        planTier: user?.planTier ?? "FREE",
        totals: { runs: totalRuns, sandboxMs: totalSandboxMs, inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      };
    }),

  // Change password (protected)
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: { password: true }
        });

        if (!user?.password) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Password change not available for this account',
          });
        }

        const isValid = await bcrypt.compare(input.currentPassword, user.password);

        if (!isValid) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Current password is incorrect',
          });
        }

        const hashedNewPassword = await bcrypt.hash(input.newPassword, 12);

        await prisma.user.update({
          where: { id: ctx.user.id },
          data: { password: hashedNewPassword }
        });

        return {
          success: true,
          message: 'Password changed successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to change password',
        });
      }
    }),
});