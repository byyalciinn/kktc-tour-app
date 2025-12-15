import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface BlockState {
  blockedUserIds: string[];
  isLoading: boolean;
  
  fetchBlockedUsers: (userId: string) => Promise<void>;
  blockUser: (blockerId: string, blockedId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  unblockUser: (blockerId: string, blockedId: string) => Promise<{ success: boolean; error?: string }>;
  isBlocked: (userId: string) => boolean;
  reset: () => void;
}

export const useBlockStore = create<BlockState>((set, get) => ({
  blockedUserIds: [],
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
  
  blockUser: async (blockerId: string, blockedId: string, reason?: string) => {
    try {
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
    set({ blockedUserIds: [], isLoading: false });
  },
}));
