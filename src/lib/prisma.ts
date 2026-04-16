import { PrismaClient } from '../generated/prisma'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient
}

function getClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient
    }
    return globalForPrisma.prisma
}

const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
        return Reflect.get(getClient(), prop, receiver)
    },
}) as PrismaClient

export default prisma
