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
  },
  realtime: {
    params: {
      eventsPerSecond: 10 
    }
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

/**
 * 🛵 DRIVER SIMULATOR (BROADCAST)
 * Fungsi ini akan mengirimkan index posisi driver setiap 5 detik
 */

export const startDriverSimulation = (orderId, steps) => {
    return new Promise((resolve) => {
        const channel = supabaseAdmin.channel(`tracking:${orderId}`);

        channel.subscribe((status) => {
            console.log(`📡 [Realtime] Status: ${status}`);

            if (status === 'SUBSCRIBED') {
                console.log(`🚀 Simulator started for ${orderId}`);
                
                resolve();

                let currentIndex = 0;
                const interval = setInterval(async () => {
                    currentIndex++;
                    try {
                        await channel.send({
                            type: 'broadcast',
                            event: 'location_update',
                            payload: { 
                                currentStepIndex: currentIndex,
                                isSimulated: true
                            }
                        });
                        console.log(`Step ${currentIndex}`);
                    } catch (e) {
                        console.error(`Send failed`, e);
                    }

                    if (currentIndex >= steps) {
                        clearInterval(interval);
                        console.log(`Driver arrived: ${orderId}`);
                        supabaseAdmin.removeChannel(channel);
                    }
                }, 5000);
            }
        });
    });
};