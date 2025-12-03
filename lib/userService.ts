/**
 * User Management Service
 * 
 * Provides functions for managing users in the admin panel:
 * - List all users with pagination
 * - Search users
 * - Update user roles and status
 * - View user details
 */

import { supabase } from './supabase';

// Membership duration types
export type MembershipDuration = '1_day' | '1_week' | '1_month' | '1_year' | 'unlimited';

// User profile interface
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  member_class: 'Normal' | 'Gold' | 'Business';
  member_number: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  // Membership expiry
  membership_expires_at: string | null;
  // Stats
  post_count?: number;
  tour_booking_count?: number;
}

export interface UserListResult {
  users: UserProfile[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface UserFilters {
  search?: string;
  role?: 'user' | 'admin' | 'all';
  memberClass?: 'Normal' | 'Gold' | 'Business' | 'all';
  isActive?: boolean | 'all';
  sortBy?: 'created_at' | 'full_name' | 'last_sign_in_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get paginated list of users
 */
export const getUsers = async (
  page: number = 1,
  pageSize: number = 20,
  filters?: UserFilters
): Promise<{ data: UserListResult | null; error: string | null }> => {
  try {
    const offset = (page - 1) * pageSize;
    
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,member_number.ilike.%${filters.search}%`);
    }
    
    if (filters?.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }
    
    if (filters?.memberClass && filters.memberClass !== 'all') {
      query = query.eq('member_class', filters.memberClass);
    }
    
    if (filters?.isActive !== undefined && filters.isActive !== 'all') {
      query = query.eq('is_active', filters.isActive);
    }
    
    // Apply sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Get users error:', error);
      return { data: null, error: error.message };
    }
    
    // Get email from auth.users for each profile
    const usersWithEmail = await Promise.all(
      (data || []).map(async (profile) => {
        // Try to get email from the profile's id (which is the user id)
        const { data: authData } = await supabase.auth.admin.getUserById(profile.id);
        return {
          ...profile,
          email: authData?.user?.email || profile.email || 'N/A',
          last_sign_in_at: authData?.user?.last_sign_in_at || null,
        };
      })
    );
    
    const total = count || 0;
    
    return {
      data: {
        users: usersWithEmail as UserProfile[],
        total,
        page,
        pageSize,
        hasMore: offset + pageSize < total,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Get users error:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Get users without admin API (fallback)
 */
export const getUsersPublic = async (
  page: number = 1,
  pageSize: number = 20,
  filters?: UserFilters
): Promise<{ data: UserListResult | null; error: string | null }> => {
  try {
    const offset = (page - 1) * pageSize;
    
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,member_number.ilike.%${filters.search}%`);
    }
    
    if (filters?.role && filters.role !== 'all') {
      query = query.eq('role', filters.role);
    }
    
    if (filters?.memberClass && filters.memberClass !== 'all') {
      query = query.eq('member_class', filters.memberClass);
    }
    
    if (filters?.isActive !== undefined && filters.isActive !== 'all') {
      query = query.eq('is_active', filters.isActive);
    }
    
    // Apply sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Get users error:', error);
      return { data: null, error: error.message };
    }
    
    const total = count || 0;
    
    return {
      data: {
        users: (data || []) as UserProfile[],
        total,
        page,
        pageSize,
        hasMore: offset + pageSize < total,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Get users error:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Get single user details
 */
export const getUserById = async (
  userId: string
): Promise<{ data: UserProfile | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data: data as UserProfile, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'member_class' | 'role' | 'is_active'>>
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Toggle user active status
 */
export const toggleUserStatus = async (
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> => {
  return updateUserProfile(userId, { is_active: isActive });
};

/**
 * Update user role
 */
export const updateUserRole = async (
  userId: string,
  role: 'user' | 'admin'
): Promise<{ success: boolean; error: string | null }> => {
  return updateUserProfile(userId, { role });
};

/**
 * Calculate expiry date based on duration
 */
const calculateExpiryDate = (duration: MembershipDuration): string | null => {
  if (duration === 'unlimited') return null;
  
  const now = new Date();
  switch (duration) {
    case '1_day':
      now.setDate(now.getDate() + 1);
      break;
    case '1_week':
      now.setDate(now.getDate() + 7);
      break;
    case '1_month':
      now.setMonth(now.getMonth() + 1);
      break;
    case '1_year':
      now.setFullYear(now.getFullYear() + 1);
      break;
  }
  return now.toISOString();
};

/**
 * Update user member class with optional duration for Gold
 */
export const updateUserMemberClass = async (
  userId: string,
  memberClass: 'Normal' | 'Gold' | 'Business',
  duration?: MembershipDuration
): Promise<{ success: boolean; error: string | null }> => {
  try {
    let expiresAt: string | null = null;
    
    // Gold membership requires duration
    if (memberClass === 'Gold' && duration) {
      expiresAt = calculateExpiryDate(duration);
    } else if (memberClass === 'Normal') {
      // Reset expiry when downgrading to Normal
      expiresAt = null;
    }
    // Business is always unlimited
    
    const { error } = await supabase
      .from('profiles')
      .update({
        member_class: memberClass,
        membership_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Check and reset expired memberships
 */
export const checkExpiredMemberships = async (): Promise<void> => {
  try {
    const now = new Date().toISOString();
    
    // Find expired Gold memberships and reset to Normal
    await supabase
      .from('profiles')
      .update({
        member_class: 'Normal',
        membership_expires_at: null,
        updated_at: now,
      })
      .eq('member_class', 'Gold')
      .not('membership_expires_at', 'is', null)
      .lt('membership_expires_at', now);
  } catch (error) {
    console.error('Check expired memberships error:', error);
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (): Promise<{
  data: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    usersByClass: { Normal: number; Gold: number; Business: number };
  } | null;
  error: string | null;
}> => {
  try {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Get active users
    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    // Get new users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count: newUsersThisMonth } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());
    
    // Get users by member class
    const { data: classData } = await supabase
      .from('profiles')
      .select('member_class');
    
    const usersByClass = {
      Normal: 0,
      Gold: 0,
      Business: 0,
    };
    
    (classData || []).forEach((user) => {
      const memberClass = user.member_class as keyof typeof usersByClass;
      if (memberClass in usersByClass) {
        usersByClass[memberClass]++;
      }
    });
    
    return {
      data: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        usersByClass,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};
