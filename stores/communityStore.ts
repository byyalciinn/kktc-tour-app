/**
 * Community Store - Zustand store for community posts
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  CommunityPost,
  CommunityPostData,
  CommunityComment,
  CommunityCommentData,
  CreatePostInput,
  ModerationStatus,
  postDataToPost,
  commentDataToComment,
} from '@/types';
import { createNotification, sendNotification } from '@/lib/notificationService';
import { useAuthStore } from './authStore';

/**
 * Helper function to enrich posts with user profiles and tour data
 * This avoids the foreign key relationship issue with Supabase
 */
async function enrichPostsWithRelations(posts: any[]): Promise<CommunityPostData[]> {
  if (!posts || posts.length === 0) return [];

  const userIds = [...new Set(posts.map(p => p.user_id))];
  const tourIds = [...new Set(posts.filter(p => p.tour_id).map(p => p.tour_id))];

  let profilesMap: Record<string, any> = {};
  let toursMap: Record<string, any> = {};

  // Fetch profiles
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);
    
    profilesData?.forEach(p => { profilesMap[p.id] = p; });
  }

  // Fetch tours
  if (tourIds.length > 0) {
    const { data: toursData } = await supabase
      .from('tours')
      .select('id, title, image')
      .in('id', tourIds);
    
    toursData?.forEach(t => { toursMap[t.id] = t; });
  }

  // Combine data
  return posts.map(post => ({
    ...post,
    profiles: profilesMap[post.user_id] || null,
    tours: post.tour_id ? toursMap[post.tour_id] : null,
  }));
}

// Report reason types
export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';

interface CommunityState {
  // Posts
  posts: CommunityPost[];
  userPosts: CommunityPost[];
  pendingPosts: CommunityPost[]; // For admin moderation
  selectedPost: CommunityPost | null;
  hiddenPostIds: string[]; // Posts hidden by user
  
  // Comments
  comments: CommunityComment[];
  
  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isLoadingComments: boolean;
  isSubmitting: boolean;
  
  // Pagination
  hasMore: boolean;
  page: number;
  
  // Error
  error: string | null;
  
  // Actions
  fetchPosts: (refresh?: boolean) => Promise<void>;
  fetchMorePosts: () => Promise<void>;
  fetchUserPosts: (userId: string) => Promise<void>;
  fetchPendingPosts: () => Promise<void>;
  fetchPostById: (postId: string) => Promise<CommunityPost | null>;
  createPost: (userId: string, input: CreatePostInput) => Promise<{ success: boolean; error?: string }>;
  deletePost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Likes
  toggleLike: (userId: string, postId: string) => Promise<{ isLiked: boolean; error?: string }>;
  checkIsLiked: (userId: string, postId: string) => Promise<boolean>;
  
  // Comments
  fetchComments: (postId: string) => Promise<void>;
  addComment: (userId: string, postId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  deleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Moderation (Admin)
  approvePost: (postId: string, adminId: string) => Promise<{ success: boolean; error?: string }>;
  rejectPost: (postId: string, adminId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  
  // Reporting & Hiding
  reportPost: (postId: string, reason: ReportReason, description?: string) => Promise<{ success: boolean; error?: string }>;
  hidePost: (postId: string) => Promise<{ success: boolean; error?: string }>;
  fetchHiddenPosts: () => Promise<void>;
  
  // UI
  setSelectedPost: (post: CommunityPost | null) => void;
  clearError: () => void;
}

const PAGE_SIZE = 10;

export const useCommunityStore = create<CommunityState>((set, get) => ({
  // Initial state
  posts: [],
  userPosts: [],
  pendingPosts: [],
  selectedPost: null,
  hiddenPostIds: [],
  comments: [],
  isLoading: false,
  isLoadingMore: false,
  isRefreshing: false,
  isLoadingComments: false,
  isSubmitting: false,
  hasMore: true,
  page: 0,
  error: null,

  // Fetch posts (public feed - Gold/Business see all, others see only approved)
  fetchPosts: async (refresh = false) => {
    const { isLoading, isRefreshing } = get();
    if (isLoading || isRefreshing) return;

    set({ 
      isLoading: !refresh, 
      isRefreshing: refresh, 
      error: null,
      page: 0,
      hasMore: true,
    });

    try {
      // All users see approved posts only
      let query = supabase
        .from('community_posts')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      const { data, error } = await query;

      if (error) throw error;

      const enrichedData = await enrichPostsWithRelations(data || []);
      const posts = enrichedData.map(post => postDataToPost(post));
      
      set({ 
        posts, 
        isLoading: false, 
        isRefreshing: false,
        hasMore: data.length === PAGE_SIZE,
        page: 1,
      });
    } catch (error: any) {
      set({ 
        error: error.message, 
        isLoading: false, 
        isRefreshing: false 
      });
    }
  },

  // Fetch more posts (pagination)
  fetchMorePosts: async () => {
    const { isLoadingMore, hasMore, page, posts } = get();
    if (isLoadingMore || !hasMore) return;

    set({ isLoadingMore: true });

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // All users see approved posts only
      let query = supabase
        .from('community_posts')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error } = await query;

      if (error) throw error;

      const enrichedData = await enrichPostsWithRelations(data || []);
      const newPosts = enrichedData.map(post => postDataToPost(post));
      
      // Filter out duplicates
      const existingIds = new Set(posts.map(p => p.id));
      const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
      
      set({ 
        posts: [...posts, ...uniqueNewPosts],
        isLoadingMore: false,
        hasMore: data.length === PAGE_SIZE,
        page: page + 1,
      });
    } catch (error: any) {
      set({ error: error.message, isLoadingMore: false });
    }
  },

  // Fetch user's own posts (all statuses)
  fetchUserPosts: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedData = await enrichPostsWithRelations(data || []);
      const userPosts = enrichedData.map(post => postDataToPost(post));
      set({ userPosts, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch pending posts (admin only)
  fetchPendingPosts: async () => {
    set({ isLoading: true, error: null });

    try {
      console.log('[CommunityStore] Fetching pending posts...');
      
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[CommunityStore] Error fetching pending posts:', error);
        throw error;
      }

      console.log('[CommunityStore] Pending posts fetched:', data?.length || 0);

      const enrichedData = await enrichPostsWithRelations(data || []);
      const pendingPosts = enrichedData.map(post => postDataToPost(post));
      set({ pendingPosts, isLoading: false });
    } catch (error: any) {
      console.error('[CommunityStore] fetchPendingPosts error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch single post by ID
  fetchPostById: async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;

      const enrichedData = await enrichPostsWithRelations([data]);
      return enrichedData.length > 0 ? postDataToPost(enrichedData[0]) : null;
    } catch (error) {
      return null;
    }
  },

  // Create new post
  createPost: async (userId: string, input: CreatePostInput) => {
    set({ isSubmitting: true, error: null });

    try {
      console.log('[CommunityStore] Creating post for user:', userId);
      console.log('[CommunityStore] Post data:', { type: input.type, title: input.title });
      
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: userId,
          type: input.type,
          title: input.title,
          content: input.content,
          images: input.images || [],
          tour_id: input.tourId,
          location: input.location,
          latitude: input.latitude,
          longitude: input.longitude,
          status: 'pending', // All posts start as pending
        })
        .select()
        .single();

      if (error) {
        console.error('[CommunityStore] Error creating post:', error);
        throw error;
      }

      console.log('[CommunityStore] Post created successfully:', data?.id);

      // Add to user posts
      const newPost = postDataToPost(data as CommunityPostData);
      set(state => ({
        userPosts: [newPost, ...state.userPosts],
        isSubmitting: false,
      }));

      return { success: true };
    } catch (error: any) {
      console.error('[CommunityStore] createPost error:', error);
      set({ error: error.message, isSubmitting: false });
      return { success: false, error: error.message };
    }
  },

  // Delete post
  deletePost: async (postId: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove from all lists
      set(state => ({
        posts: state.posts.filter(p => p.id !== postId),
        userPosts: state.userPosts.filter(p => p.id !== postId),
        pendingPosts: state.pendingPosts.filter(p => p.id !== postId),
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Toggle like
  toggleLike: async (userId: string, postId: string) => {
    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('community_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      if (existingLike) {
        // Unlike
        await supabase
          .from('community_likes')
          .delete()
          .eq('id', existingLike.id);

        // Update local state
        set(state => ({
          posts: state.posts.map(p => 
            p.id === postId 
              ? { ...p, likesCount: p.likesCount - 1, isLiked: false }
              : p
          ),
        }));

        return { isLiked: false };
      } else {
        // Like
        await supabase
          .from('community_likes')
          .insert({ user_id: userId, post_id: postId });

        // Update local state
        set(state => ({
          posts: state.posts.map(p => 
            p.id === postId 
              ? { ...p, likesCount: p.likesCount + 1, isLiked: true }
              : p
          ),
        }));

        return { isLiked: true };
      }
    } catch (error: any) {
      return { isLiked: false, error: error.message };
    }
  },

  // Check if user liked a post
  checkIsLiked: async (userId: string, postId: string) => {
    try {
      const { data } = await supabase
        .from('community_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      return !!data;
    } catch {
      return false;
    }
  },

  // Fetch comments for a post
  fetchComments: async (postId: string) => {
    set({ isLoadingComments: true });

    try {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set(data?.map(c => c.user_id) || [])];
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        profilesData?.forEach(p => { profilesMap[p.id] = p; });
      }

      const enrichedData = data?.map(comment => ({
        ...comment,
        profiles: profilesMap[comment.user_id] || null,
      })) || [];

      const comments = (enrichedData as CommunityCommentData[]).map(commentDataToComment);
      set({ comments, isLoadingComments: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingComments: false });
    }
  },

  // Add comment
  addComment: async (userId: string, postId: string, content: string) => {
    set({ isSubmitting: true });

    try {
      const { data, error } = await supabase
        .from('community_comments')
        .insert({
          user_id: userId,
          post_id: postId,
          content,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single();

      const enrichedData = {
        ...data,
        profiles: profileData || null,
      };

      const newComment = commentDataToComment(enrichedData as CommunityCommentData);
      
      set(state => ({
        comments: [...state.comments, newComment],
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, commentsCount: p.commentsCount + 1 }
            : p
        ),
        isSubmitting: false,
      }));

      return { success: true };
    } catch (error: any) {
      set({ isSubmitting: false });
      return { success: false, error: error.message };
    }
  },

  // Delete comment
  deleteComment: async (commentId: string) => {
    try {
      const comment = get().comments.find(c => c.id === commentId);
      
      const { error } = await supabase
        .from('community_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      set(state => ({
        comments: state.comments.filter(c => c.id !== commentId),
        posts: comment ? state.posts.map(p => 
          p.id === comment.postId 
            ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) }
            : p
        ) : state.posts,
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Approve post (admin)
  approvePost: async (postId: string, adminId: string) => {
    try {
      // First get the post to find the user
      const post = get().pendingPosts.find(p => p.id === postId);
      
      const { error } = await supabase
        .from('community_posts')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', postId);

      if (error) throw error;

      // Log moderation action
      await supabase
        .from('moderation_logs')
        .insert({
          post_id: postId,
          admin_id: adminId,
          action: 'approved',
        });

      // Send notification to the post owner
      if (post?.userId) {
        try {
          const { data: notification } = await createNotification(
            {
              title: 'Paylaşımınız Onaylandı! 🎉',
              message: post.title 
                ? `"${post.title}" başlıklı paylaşımınız onaylandı ve artık toplulukta görünür.`
                : 'Paylaşımınız onaylandı ve artık toplulukta görünür.',
              type: 'system',
              icon: 'checkmark-circle',
              target: 'user',
              target_user_id: post.userId,
              deep_link: `/community/${postId}`,
              data: { postId, action: 'post_approved' },
            },
            adminId
          );

          // Send push notification
          if (notification?.id) {
            await sendNotification(notification.id);
          }
        } catch (notifError) {
          console.error('[CommunityStore] Failed to send approval notification:', notifError);
          // Don't fail the approval if notification fails
        }
      }

      // Update local state
      set(state => ({
        pendingPosts: state.pendingPosts.filter(p => p.id !== postId),
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Reject post (admin)
  rejectPost: async (postId: string, adminId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', postId);

      if (error) throw error;

      // Log moderation action
      await supabase
        .from('moderation_logs')
        .insert({
          post_id: postId,
          admin_id: adminId,
          action: 'rejected',
          reason,
        });

      // Update local state
      set(state => ({
        pendingPosts: state.pendingPosts.filter(p => p.id !== postId),
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Report post
  reportPost: async (postId: string, reason: ReportReason, description?: string) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('community_reports')
        .insert({
          post_id: postId,
          reporter_id: userId,
          reason,
          description: description || null,
        });

      if (error) {
        // Handle duplicate report
        if (error.code === '23505') {
          return { success: false, error: 'You have already reported this post' };
        }
        // Handle rate limit
        if (error.message?.includes('Rate limit')) {
          return { success: false, error: 'Too many reports. Please try again later.' };
        }
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('[CommunityStore] Report post error:', error);
      return { success: false, error: error.message };
    }
  },

  // Hide post (not interested)
  hidePost: async (postId: string) => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('hidden_posts')
        .insert({
          user_id: userId,
          post_id: postId,
        });

      if (error) {
        // Handle duplicate
        if (error.code === '23505') {
          // Already hidden, just update local state
        } else {
          throw error;
        }
      }

      // Update local state to hide the post
      set(state => ({
        hiddenPostIds: [...state.hiddenPostIds, postId],
        posts: state.posts.filter(p => p.id !== postId),
      }));

      return { success: true };
    } catch (error: any) {
      console.error('[CommunityStore] Hide post error:', error);
      return { success: false, error: error.message };
    }
  },

  // Fetch hidden posts for current user
  fetchHiddenPosts: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('hidden_posts')
        .select('post_id')
        .eq('user_id', userId);

      if (error) throw error;

      const hiddenIds = data?.map(h => h.post_id) || [];
      set({ hiddenPostIds: hiddenIds });
    } catch (error) {
      console.error('[CommunityStore] Fetch hidden posts error:', error);
    }
  },

  // UI actions
  setSelectedPost: (post) => set({ selectedPost: post }),
  clearError: () => set({ error: null }),
}));

// Selectors
export const selectPosts = (state: CommunityState) => state.posts;
export const selectUserPosts = (state: CommunityState) => state.userPosts;
export const selectPendingPosts = (state: CommunityState) => state.pendingPosts;
export const selectSelectedPost = (state: CommunityState) => state.selectedPost;
export const selectComments = (state: CommunityState) => state.comments;
export const selectIsLoading = (state: CommunityState) => state.isLoading;
export const selectIsSubmitting = (state: CommunityState) => state.isSubmitting;
export const selectError = (state: CommunityState) => state.error;
