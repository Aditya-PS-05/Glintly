"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "@/hooks/use-session"
import { LogOut, Settings } from "lucide-react"
import Link from "next/link"

/**
 * Renders a user authentication menu with sign-in, sign-up, profile, and sign-out options.
 *
 * Displays a loading avatar while authentication state is loading. Shows sign-in and sign-up buttons if the user is not authenticated. When authenticated, presents a dropdown menu with the user's avatar, name, email, a link to the profile page, and a sign-out action.
 */
export function UserMenu() {
  const { user, isAuthenticated, isLoading } = useSession()

  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/auth/signin">Sign in</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signup">Sign up</Link>
        </Button>
      </div>
    )
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={user.name || ""} />
            <AvatarFallback>
              {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}