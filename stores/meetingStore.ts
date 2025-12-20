/**
 * Meeting Store - Zustand store for meeting sessions
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  CreateMeetingInput,
  MeetingSession,
  MeetingSessionData,
  MeetingParticipant,
  MeetingParticipantData,
  MeetingInviteData,
  meetingSessionDataToSession,
  meetingParticipantDataToParticipant,
  meetingInviteDataToInvite,
} from '@/types';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;

const generateInviteCode = (): string => {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    const idx = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length);
    code += INVITE_CODE_ALPHABET[idx];
  }
  return code;
};

async function enrichParticipantsWithProfiles(
  participants: MeetingParticipantData[]
): Promise<MeetingParticipantData[]> {
  if (!participants.length) return participants;

  const userIds = [...new Set(participants.map(p => p.user_id))];
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profilesMap: Record<string, any> = {};
  profilesData?.forEach(profile => {
    profilesMap[profile.id] = profile;
  });

  return participants.map(participant => ({
    ...participant,
    profiles: profilesMap[participant.user_id] || null,
  }));
}

interface MeetingState {
  sessions: MeetingSession[];
  currentSession: MeetingSession | null;
  participants: MeetingParticipant[];
  inviteCode: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  fetchMySessions: (userId: string) => Promise<MeetingSession[]>;
  fetchSessionById: (sessionId: string) => Promise<MeetingSession | null>;
  fetchParticipants: (sessionId: string) => Promise<MeetingParticipant[]>;
  fetchInviteCode: (sessionId: string) => Promise<string | null>;

  createSession: (input: CreateMeetingInput) => Promise<{
    success: boolean;
    session?: MeetingSession;
    inviteCode?: string;
    error?: string;
  }>;
  joinSessionByCode: (code: string) => Promise<{
    success: boolean;
    session?: MeetingSession;
    error?: string;
  }>;
  leaveSession: (sessionId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
  startSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  endSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  setCurrentSession: (session: MeetingSession | null) => void;
  clearError: () => void;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  sessions: [],
  currentSession: null,
  participants: [],
  inviteCode: null,
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchMySessions: async (userId: string) => {
    if (!userId) return [];
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('meeting_sessions')
      .select('*')
      .eq('host_id', userId)
      .in('status', ['draft', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      set({ isLoading: false, error: error.message });
      return [];
    }

    const sessions = (data as MeetingSessionData[]).map(meetingSessionDataToSession);
    set({ sessions, isLoading: false });
    return sessions;
  },

  fetchSessionById: async (sessionId: string) => {
    if (!sessionId) return null;
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('meeting_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      set({ isLoading: false, error: error?.message || 'Session not found' });
      return null;
    }

    const session = meetingSessionDataToSession(data as MeetingSessionData);
    set({ currentSession: session, isLoading: false });
    return session;
  },

  fetchParticipants: async (sessionId: string) => {
    if (!sessionId) return [];
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'joined')
      .order('joined_at', { ascending: true });

    if (error) {
      set({ isLoading: false, error: error.message });
      return [];
    }

    const enriched = await enrichParticipantsWithProfiles(data as MeetingParticipantData[]);
    const participants = enriched.map(meetingParticipantDataToParticipant);
    set({ participants, isLoading: false });
    return participants;
  },

  fetchInviteCode: async (sessionId: string) => {
    if (!sessionId) return null;
    const { data, error } = await supabase
      .from('meeting_invites')
      .select('*')
      .eq('session_id', sessionId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      set({ inviteCode: null });
      return null;
    }

    const invite = meetingInviteDataToInvite(data as MeetingInviteData);
    set({ inviteCode: invite.code });
    return invite.code;
  },

  createSession: async (input: CreateMeetingInput) => {
    set({ isSubmitting: true, error: null });
    const inviteCode = generateInviteCode();

    const { data, error } = await supabase.rpc('create_meeting_session', {
      p_title: input.title,
      p_description: input.description || null,
      p_destination_text: input.destinationText,
      p_destination_lat: input.destinationLat || null,
      p_destination_lng: input.destinationLng || null,
      p_scheduled_at: input.scheduledAt || null,
      p_invite_code: inviteCode,
    });

    if (error || !data || !data[0]?.session_id) {
      set({ isSubmitting: false, error: error?.message || 'Failed to create session' });
      return { success: false, error: error?.message || 'Failed to create session' };
    }

    const sessionId = data[0].session_id as string;
    const session = await get().fetchSessionById(sessionId);
    await get().fetchParticipants(sessionId);

    if (session) {
      set(state => ({
        sessions: [session, ...state.sessions.filter(s => s.id !== session.id)],
        inviteCode,
        isSubmitting: false,
      }));
      return { success: true, session, inviteCode };
    }

    set({ inviteCode, isSubmitting: false });
    return { success: true, inviteCode };
  },

  joinSessionByCode: async (code: string) => {
    set({ isSubmitting: true, error: null });

    const { data, error } = await supabase.rpc('join_meeting_session', {
      p_invite_code: code,
    });

    if (error || !data || !data[0]?.session_id) {
      set({ isSubmitting: false, error: error?.message || 'Failed to join session' });
      return { success: false, error: error?.message || 'Failed to join session' };
    }

    const sessionId = data[0].session_id as string;
    const session = await get().fetchSessionById(sessionId);
    await get().fetchParticipants(sessionId);

    set({ isSubmitting: false });
    return { success: true, session: session || undefined };
  },

  leaveSession: async (sessionId: string, userId: string) => {
    if (!sessionId || !userId) return { success: false, error: 'Missing data' };
    set({ isSubmitting: true, error: null });

    const { error } = await supabase
      .from('meeting_participants')
      .update({ status: 'left' })
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) {
      set({ isSubmitting: false, error: error.message });
      return { success: false, error: error.message };
    }

    await get().fetchParticipants(sessionId);
    set({ isSubmitting: false });
    return { success: true };
  },

  startSession: async (sessionId: string) => {
    if (!sessionId) return { success: false, error: 'Missing session' };
    set({ isSubmitting: true, error: null });

    const { data, error } = await supabase
      .from('meeting_sessions')
      .update({ status: 'active' })
      .eq('id', sessionId)
      .select()
      .single();

    if (error || !data) {
      set({ isSubmitting: false, error: error?.message || 'Failed to start session' });
      return { success: false, error: error?.message || 'Failed to start session' };
    }

    const session = meetingSessionDataToSession(data as MeetingSessionData);
    set({ currentSession: session, isSubmitting: false });
    return { success: true };
  },

  endSession: async (sessionId: string) => {
    if (!sessionId) return { success: false, error: 'Missing session' };
    set({ isSubmitting: true, error: null });

    const { data, error } = await supabase
      .from('meeting_sessions')
      .update({ status: 'ended' })
      .eq('id', sessionId)
      .select()
      .single();

    if (error || !data) {
      set({ isSubmitting: false, error: error?.message || 'Failed to end session' });
      return { success: false, error: error?.message || 'Failed to end session' };
    }

    const session = meetingSessionDataToSession(data as MeetingSessionData);
    set({ currentSession: session, isSubmitting: false });
    return { success: true };
  },

  setCurrentSession: (session) => set({ currentSession: session }),
  clearError: () => set({ error: null }),
}));
