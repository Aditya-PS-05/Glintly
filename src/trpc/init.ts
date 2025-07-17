import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SuperJSON from 'superjson';

export const createTRPCContext = cache(async () => {
  const session = await getServerSession(authOptions);
  
  return { 
    session,
    user: session?.user 
  };
});

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: SuperJSON,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});