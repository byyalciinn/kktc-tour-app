import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

const CURRENT_TERMS_VERSION = '1.0';

interface TermsState {
  hasAcceptedTerms: boolean;
  isChecking: boolean;
  checkedUserId: string | null;
  termsVersion: string | null;
  
  checkTermsAcceptance: (userId: string) => Promise<boolean>;
  acceptTerms: (userId: string) => Promise<{ success: boolean; error?: string }>;
  reset: () => void;
}

export const useTermsStore = create<TermsState>((set, get) => ({
  hasAcceptedTerms: false,
  isChecking: true,
  checkedUserId: null,
  termsVersion: null,
  
  checkTermsAcceptance: async (userId: string) => {
    set({ isChecking: true, hasAcceptedTerms: false, checkedUserId: null });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('terms_accepted_at, terms_version')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[termsStore] Error checking terms:', error);
        set({ hasAcceptedTerms: false, isChecking: false, checkedUserId: userId });
        return false;
      }
      
      const accepted = !!data?.terms_accepted_at && 
        (data?.terms_version || '0') >= CURRENT_TERMS_VERSION;
      
      set({ 
        hasAcceptedTerms: accepted, 
        checkedUserId: userId,
        termsVersion: data?.terms_version,
        isChecking: false 
      });
      return accepted;
    } catch (err) {
      console.error('[termsStore] Exception checking terms:', err);
      set({ hasAcceptedTerms: false, isChecking: false, checkedUserId: userId });
      return false;
    }
  },
  
  acceptTerms: async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION
        })
        .eq('id', userId);
      
      if (error) {
        console.error('[termsStore] Error accepting terms:', error);
        return { success: false, error: error.message };
      }
      
      set({ hasAcceptedTerms: true, checkedUserId: userId, termsVersion: CURRENT_TERMS_VERSION, isChecking: false });
      return { success: true };
    } catch (err) {
      console.error('[termsStore] Exception accepting terms:', err);
      return { success: false, error: 'Failed to accept terms' };
    }
  },
  
  reset: () => {
    set({ hasAcceptedTerms: false, isChecking: true, checkedUserId: null, termsVersion: null });
  },
}));
