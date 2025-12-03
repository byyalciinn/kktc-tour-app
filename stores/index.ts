/**
 * Central export for all Zustand stores
 */

// Auth store
export { useAuthStore, selectUser, selectProfile, selectIsAuthenticated } from './authStore';
export type { } from './authStore';

// Tour store
export { 
  useTourStore, 
  selectTours, 
  selectCategories, 
  selectSelectedCategoryId,
  selectIsLoading as selectToursLoading,
  selectIsRefreshing,
  selectIsLoadingMore,
  selectHasMore,
  selectSearchResults,
  selectIsSearching,
  selectError as selectToursError,
} from './tourStore';

// Favorites store
export { 
  useFavoritesStore, 
  selectFavorites, 
  selectFavoriteIds,
  selectFavoriteCount,
  selectIsLoading as selectFavoritesLoading,
  selectCanAddMoreFavorites,
  selectRemainingFavoriteSlots,
} from './favoritesStore';
export type { FavoriteResult } from './favoritesStore';

// UI store
export { 
  useUIStore, 
  selectIsSearchVisible,
  selectIsProfileSheetVisible,
  selectIsTourDetailVisible,
  selectSelectedTour,
  selectIsGlobalLoading,
  selectUnreadNotificationCount,
  selectToast,
} from './uiStore';

// Theme store
export {
  useThemeStore,
  selectThemeMode,
  selectColorScheme,
  selectIsDarkMode,
} from './themeStore';
export type { ThemeMode } from './themeStore';

// Route store
export {
  useRouteStore,
  selectRoutes,
  selectHighlightedRoutes,
  selectSelectedRoute,
  selectIsLoading as selectRoutesLoading,
  selectIsLoadingHighlighted,
  selectError as selectRoutesError,
  selectSearchResults as selectRouteSearchResults,
  selectIsSearching as selectIsSearchingRoutes,
} from './routeStore';

// Community store
export {
  useCommunityStore,
  selectPosts,
  selectUserPosts,
  selectPendingPosts,
  selectSelectedPost,
  selectComments,
  selectIsLoading as selectCommunityLoading,
  selectIsSubmitting as selectCommunitySubmitting,
  selectError as selectCommunityError,
} from './communityStore';

// Onboarding store
export { useOnboardingStore } from './onboardingStore';

// Scan store
export {
  useScanStore,
  selectIsAnalyzing,
  selectAnalysisResult,
  selectScanHistory,
  selectImageUri,
} from './scanStore';

// Subscription store
export {
  useSubscriptionStore,
  selectIsPremium,
  selectCurrentPlan,
  selectSubscriptionStatus,
  PLANS,
  FREE_TIER_LIMITS,
} from './subscriptionStore';
export type { SubscriptionPlan, SubscriptionStatus, PlanInfo } from './subscriptionStore';

// Two-Factor Authentication store
export {
  useTwoFactorStore,
  selectIsPending,
  selectPendingAuth,
  selectTwoFactorEnabled,
  selectIsLoadingSettings,
  selectIsCheckingRequired,
} from './twoFactorStore';
