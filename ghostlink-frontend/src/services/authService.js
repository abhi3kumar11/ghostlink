const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : 'http://localhost:3000'

class AuthService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/auth`
  }

  /**
   * Generate anonymous ID and temporary token
   */
  async generateAnonId() {
    try {
      const response = await fetch(`${this.baseURL}/generate-anon-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate anonymous ID')
      }

      return data
    } catch (error) {
      console.error('Generate anonymous ID error:', error)
      throw error
    }
  }

  /**
   * Verify temporary token
   */
  async verifyToken(token) {
    try {
      const response = await fetch(`${this.baseURL}/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tempToken: token }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Token verification error:', error)
      throw error
    }
  }

  /**
   * Refresh temporary token
   */
  async refreshToken(currentToken) {
    try {
      const response = await fetch(`${this.baseURL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tempToken: currentToken }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
  }

  /**
   * Validate anonymous ID format
   */
  async validateAnonId(anonId) {
    try {
      const response = await fetch(`${this.baseURL}/validate-anon-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ anonId }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Anonymous ID validation error:', error)
      throw error
    }
  }

  /**
   * Generate session ID
   */
  async generateSession() {
    try {
      const response = await fetch(`${this.baseURL}/generate-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Session generation error:', error)
      throw error
    }
  }

  /**
   * Get authentication service status
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.baseURL}/status`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Auth service status error:', error)
      throw error
    }
  }

  /**
   * Get stored token from localStorage
   */
  getStoredToken() {
    return localStorage.getItem('ghostlink_token')
  }

  /**
   * Get stored anonymous ID from localStorage
   */
  getStoredAnonId() {
    return localStorage.getItem('ghostlink_anon_id')
  }

  /**
   * Clear stored authentication data
   */
  clearStoredAuth() {
    localStorage.removeItem('ghostlink_token')
    localStorage.removeItem('ghostlink_anon_id')
  }

  /**
   * Check if token is close to expiry (within 10 minutes)
   */
  isTokenNearExpiry(token) {
    try {
      // Decode JWT payload (simple base64 decode, not cryptographically verified)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiryTime = payload.exp * 1000 // Convert to milliseconds
      const currentTime = Date.now()
      const timeUntilExpiry = expiryTime - currentTime
      
      return timeUntilExpiry < 10 * 60 * 1000 // 10 minutes
    } catch (error) {
      console.error('Token parsing error:', error)
      return true // Assume expired if can't parse
    }
  }

  /**
   * Auto-refresh token if needed
   */
  async autoRefreshToken() {
    const currentToken = this.getStoredToken()
    
    if (!currentToken) {
      return null
    }

    if (this.isTokenNearExpiry(currentToken)) {
      try {
        const refreshResponse = await this.refreshToken(currentToken)
        
        if (refreshResponse.success && refreshResponse.tempToken) {
          localStorage.setItem('ghostlink_token', refreshResponse.tempToken)
          return refreshResponse.tempToken
        }
      } catch (error) {
        console.error('Auto-refresh failed:', error)
        this.clearStoredAuth()
        return null
      }
    }

    return currentToken
  }
}

export const authService = new AuthService()
