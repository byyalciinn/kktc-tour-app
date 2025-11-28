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
} from './favoritesStore';

// UI store
export { 
  useUIStore, 
  selectIsSearchVisible,
  selectIsProfileSheetVisible,
  selectIsTourDetailVisible,
  selectSelectedTour,
  selectIsGlobalLoading,
  selectToast,
} from './uiStore';
