"use client"

import { useSession as useNextAuthSession } from "next-auth/react"

/**
 * Provides session and authentication state information for the current user.
 *
 * Returns the session data, user object, and boolean flags indicating whether the authentication state is loading, authenticated, or unauthenticated.
 * 
 * @returns An object containing `session`, `user`, `isLoading`, `isAuthenticated`, and `isUnauthenticated`.
 */
export function useSession() {
  const { data: session, status } = useNextAuthSession()
  
  return {
    session,
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  }
}