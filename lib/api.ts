// Centralized API Configuration
// In Vercel, set NEXT_PUBLIC_API_URL to your deployed backend URL

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws'

// API Endpoints
export const API_ENDPOINTS = {
    // Auth
    signin: `${API_URL}/api/auth/signin`,
    signup: `${API_URL}/api/auth/signup`,
    verify: `${API_URL}/api/auth/verify`,
    forgotPassword: `${API_URL}/api/auth/forgot-password`,
    resetPassword: `${API_URL}/api/auth/reset-password`,

    // Users
    users: `${API_URL}/api/users`,
    currentUser: `${API_URL}/api/users/me`,

    // Messages
    messages: `${API_URL}/api/messages`,

    // Friends
    friends: `${API_URL}/api/friends`,
    friendRequests: `${API_URL}/api/friends/requests`,

    // Files
    upload: `${API_URL}/api/files/upload`,
}

// Helper function for authenticated requests
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    }

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(endpoint, {
        ...options,
        headers,
    })

    return response
}
