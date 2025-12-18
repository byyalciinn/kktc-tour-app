import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type BlockSource = 'post' | 'comment' | 'profile' | 'other';

export interface BlockedUserInfo {
  id: string;
  blockedId: string;
  blockedAt: string;
  reason?: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

interface BlockState {
  blockedUserIds: string[];
  blockedUsers: BlockedUserInfo[];
  isLoading: boolean;
  
  fetchBlockedUsers: (userId: string) => Promise<void>;
  fetchBlockedUsersWithDetails: (userId: string) => Promise<BlockedUserInfo[]>;
  blockUser: (blockerId: string, blockedId: string, reason?: string, source?: BlockSource, sourceId?: string) => Promise<{ success: boolean; error?: string }>;
  unblockUser: (blockerId: string, blockedId: string) => Promise<{ success: boolean; error?: string }>;
  isBlocked: (userId: string) => boolean;
  reset: () => void;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blockedUserIds: [],
  blockedUsers: [],
  isLoading: false,
  
  fetchBlockedUsers: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', userId);
      
      if (error) {
        console.error('[blockStore] Error fetching blocked users:', error);
        set({ blockedUserIds: [], isLoading: false });
        return;
      }
      
      set({ 
        blockedUserIds: data?.map(b => b.blocked_id) || [],
        isLoading: false 
      });
    } catch (err) {
      console.error('[blockStore] Exception fetching blocked users:', err);
      set({ blockedUserIds: [], isLoading: false });
    }
  },

  fetchBlockedUsersWithDetails: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id, blocked_id, reason, created_at')
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[blockStore] Error fetching blocked users with details:', error);
        set({ blockedUsers: [], isLoading: false });
        return [];
      }

      // Fetch user profiles for blocked users
      const blockedIds = data?.map(b => b.blocked_id) || [];
      const usersMap: Record<string, any> = {};
      
      if (blockedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', blockedIds);
        
        profiles?.forEach(p => { usersMap[p.id] = p; });
      }

      const blockedUsers: BlockedUserInfo[] = (data || []).map(block => ({
        id: block.id,
        blockedId: block.blocked_id,
        blockedAt: block.created_at,
        reason: block.reason,
        user: usersMap[block.blocked_id] ? {
          id: usersMap[block.blocked_id].id,
          fullName: usersMap[block.blocked_id].full_name || 'Unknown User',
          avatarUrl: usersMap[block.blocked_id].avatar_url,
        } : undefined,
      }));

      set({ blockedUsers, isLoading: false });
      return blockedUsers;
    } catch (err) {
      console.error('[blockStore] Exception fetching blocked users with details:', err);
      set({ blockedUsers: [], isLoading: false });
      return [];
    }
  },
  
  blockUser: async (blockerId: string, blockedId: string, reason?: string, source?: BlockSource, sourceId?: string) => {
    try {
      // Insert block record
      const { error } = await supabase
        .from('blocked_users')
        .insert({ 
          blocker_id: blockerId, 
          blocked_id: blockedId, 
          reason 
        });
      
      if (error) {
        console.error('[blockStore] Error blocking user:', error);
        return { success: false, error: error.message };
      }
      
      // Update local state immediately for instant UI feedback
      set(state => ({ 
        blockedUserIds: [...state.blockedUserIds, blockedId] 
      }));
      
      // Auto-create report for admin review (UGC Compliance)
      try {
        const reportData: {
          reporter_id: string;
          reported_user_id: string;
          reason: string;
          description: string;
          source: string;
          status: string;
          post_id?: string;
          comment_id?: string;
        } = {
          reporter_id: blockerId,
          reported_user_id: blockedId,
          reason: 'user_blocked',
          description: reason || 'User blocked by another user',
          source: source || 'other',
          status: 'pending',
        };
        
        // Add source reference if available
        if (source === 'post' && sourceId) {
          reportData.post_id = sourceId;
        } else if (source === 'comment' && sourceId) {
          reportData.comment_id = sourceId;
        }
        
        await supabase
          .from('user_block_reports')
          .insert(reportData);
      } catch (reportErr) {
        // Don't fail the block if report creation fails
        console.error('[blockStore] Failed to create block report:', reportErr);
      }
      
      return { success: true };
    } catch (err) {
      console.error('[blockStore] Exception blocking user:', err);
      return { success: false, error: 'Failed to block user' };
    }
  },
  
  unblockUser: async (blockerId: string, blockedId: string) => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);
      
      if (error) {
        console.error('[blockStore] Error unblocking user:', error);
        return { success: false, error: error.message };
      }
      
      set(state => ({ 
        blockedUserIds: state.blockedUserIds.filter(id => id !== blockedId) 
      }));
      
      return { success: true };
    } catch (err) {
      console.error('[blockStore] Exception unblocking user:', err);
      return { success: false, error: 'Failed to unblock user' };
    }
  },
  
  isBlocked: (userId: string) => {
    return get().blockedUserIds.includes(userId);
  },
  
  reset: () => {
    set({ blockedUserIds: [], blockedUsers: [], isLoading: false });
  },
}));
