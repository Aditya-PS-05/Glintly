import { registerSchema } from '@/lib/validations/auth'

// Mock dependencies
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => mockPrisma)
const mockHashFn = jest.fn()
const mockCompareFn = jest.fn()

jest.mock('bcryptjs', () => ({
  hash: mockHashFn,
  compare: mockCompareFn,
}))

const mockBcrypt = {
  hash: mockHashFn,
  compare: mockCompareFn,
}

// Simulate the registration route logic
const simulateRegistrationRoute = async (body: any) => {
  try {
    const { name, email, password } = registerSchema.parse(body)

    const existingUser = await mockPrisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return {
        status: 409,
        json: { error: "User already exists with this email" }
      }
    }

    const hashedPassword = await mockBcrypt.hash(password, 12)

    const user = await mockPrisma.user.create({
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

    return {
      status: 200,
      json: {
        success: true,
        user,
        message: 'User registered successfully',
      }
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return {
        status: 400,
        json: { error: error.errors[0].message }
      }
    }
    
    return {
      status: 500,
      json: { error: "Failed to register user" }
    }
  }
}

describe('Registration Route Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully register a new user', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    }

    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockBcrypt.hash.mockResolvedValue('hashedPassword')
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      image: null,
    })

    const response = await simulateRegistrationRoute(userData)

    expect(response.status).toBe(200)
    expect(response.json.success).toBe(true)
    expect(response.json.user.email).toBe('john@example.com')
    expect(response.json.message).toBe('User registered successfully')
    expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12)
  })

  it('should return 409 for existing user', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    }

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      email: 'john@example.com'
    })

    const response = await simulateRegistrationRoute(userData)

    expect(response.status).toBe(409)
    expect(response.json.error).toBe('User already exists with this email')
  })

  it('should return 400 for invalid email', async () => {
    const userData = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'password123'
    }

    const response = await simulateRegistrationRoute(userData)

    expect(response.status).toBe(400)
    expect(response.json.error).toBe('Invalid email')
  })

  it('should return 400 for short password', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: '123'
    }

    const response = await simulateRegistrationRoute(userData)

    expect(response.status).toBe(400)
    expect(response.json.error).toBe('Password must be at least 6 characters')
  })

  it('should return 400 for missing name', async () => {
    const userData = {
      email: 'john@example.com',
      password: 'password123'
    }

    const response = await simulateRegistrationRoute(userData)

    expect(response.status).toBe(400)
    expect(response.json.error).toBe('Required')
  })

  it('should return 500 for database errors', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    }

    mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

    const response = await simulateRegistrationRoute(userData)

    expect(response.status).toBe(500)
    expect(response.json.error).toBe('Failed to register user')
  })

  it('should handle empty request body', async () => {
    const response = await simulateRegistrationRoute({})

    expect(response.status).toBe(400)
    expect(response.json.error).toContain('Required')
  })
})