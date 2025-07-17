import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  changePasswordSchema 
} from '@/lib/validations/auth'

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      }
      
      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        email: 'john@example.com',
        password: 'password123'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Name is required')
    })

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid email')
    })

    it('should reject short password', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: '123'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Password must be at least 6 characters')
    })

    it('should reject missing fields', () => {
      const invalidData = {
        name: 'John Doe'
      }
      
      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues).toHaveLength(2) // email and password missing
    })
  })

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Invalid email')
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'john@example.com',
        password: ''
      }
      
      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Password is required')
    })
  })

  describe('updateProfileSchema', () => {
    it('should validate valid profile update data', () => {
      const validData = {
        name: 'John Updated',
        image: 'https://example.com/avatar.jpg'
      }
      
      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept partial updates', () => {
      const validData = {
        name: 'John Updated'
      }
      
      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const validData = {}
      
      const result = updateProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid image URL', () => {
      const invalidData = {
        name: 'John Updated',
        image: 'not-a-url'
      }
      
      const result = updateProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty name when provided', () => {
      const invalidData = {
        name: ''
      }
      
      const result = updateProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('changePasswordSchema', () => {
    it('should validate valid password change data', () => {
      const validData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      }
      
      const result = changePasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty current password', () => {
      const invalidData = {
        currentPassword: '',
        newPassword: 'newpassword123'
      }
      
      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject short new password', () => {
      const invalidData = {
        currentPassword: 'oldpassword',
        newPassword: '123'
      }
      
      const result = changePasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})