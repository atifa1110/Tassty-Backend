import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

/**
 * 🔐 ADMIN CLIENT
 * Dipakai untuk semua query database di backend
 * Role = service_role (bypass RLS sesuai policy)
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * 🙋 AUTH CLIENT
 * Dipakai khusus untuk login / OTP / refresh token
 * Role = authenticated (user context)
 */
export const supabaseAuth = createClient(supabaseUrl, anonKey)

/**
 * 🔍 ADMIN HELPER
 */
export const findUserByEmail = async (email) => {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) return null
  return data.users.find(u => u.email === email) || null
}