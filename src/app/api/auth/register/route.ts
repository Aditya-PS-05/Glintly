import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { registerSchema } from "@/lib/validations/auth"

/**
 * Processes user registration requests by validating input, ensuring email uniqueness, securely hashing the password, and creating a new user record.
 *
 * Accepts a POST request with a JSON body containing `name`, `email`, and `password`. Returns a JSON response with the new user's id, name, email, and image on success, or an error message with an appropriate status code if registration fails.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

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
    })

    return NextResponse.json({
      success: true,
      user,
      message: 'User registered successfully',
    })
  } catch (error) {
    console.error("Registration error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    )
  }
}