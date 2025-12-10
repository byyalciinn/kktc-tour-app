/**
 * Cyprigo Color Palette
 * Primary: #F89C28 (Accent/Hover)
 * Background: #F3F2EE
 * Cards/Buttons: #FFFFFF
 * Text: #212529
 */

export const Colors = {
  light: {
    // Primary colors
    primary: '#F89C28',
    background: '#F3F2EE',
    card: '#FFFFFF',
    text: '#212529',
    
    // Secondary colors
    textSecondary: '#6C757D',
    border: '#E9ECEF',
    
    // Accent
    tint: '#F89C28',
    accent: '#F89C28',
    
    // Tab bar
    icon: '#6C757D',
    tabIconDefault: '#6C757D',
    tabIconSelected: '#F89C28',
    
    // Glass effect fallback
    glass: 'rgba(255, 255, 255, 0.9)',
    
    // Tag colors
    tagBackground: '#FFFFFF',
    tagActiveBackground: '#F89C28',
    tagText: '#212529',
    tagActiveText: '#FFFFFF',
  },
  dark: {
    // Primary colors
    primary: '#F89C28',
    background: '#1A1A1A',
    card: '#2D2D2D',
    text: '#FFFFFF',
    
    // Secondary colors
    textSecondary: '#9BA1A6',
    border: '#3D3D3D',
    
    // Accent
    tint: '#F89C28',
    accent: '#F89C28',
    
    // Tab bar
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#F89C28',
    
    // Glass effect fallback
    glass: 'rgba(50, 50, 50, 0.9)',
    
    // Tag colors
    tagBackground: '#2D2D2D',
    tagActiveBackground: '#F89C28',
    tagText: '#FFFFFF',
    tagActiveText: '#FFFFFF',
  },
};

export type ColorScheme = keyof typeof Colors;
