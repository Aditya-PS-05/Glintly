"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"

interface Props {
  children: ReactNode
}

/**
 * Provides authentication session context to its child components using NextAuth.
 *
 * Wraps the given children in a `SessionProvider` to enable access to authentication session data throughout the component tree.
 *
 * @param children - The React nodes that will have access to the authentication session context
 */
export default function AuthSessionProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>
}