/**
 * Input Validation & Sanitization Utilities
 * 
 * Provides security functions for:
 * - XSS prevention through HTML sanitization
 * - Input validation for various data types
 * - SQL injection prevention helpers
 * - Safe string handling
 */

// =============================================
// SANITIZATION FUNCTIONS
// =============================================

/**
 * Escape HTML entities to prevent XSS attacks
 */
export const escapeHtml = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
};

/**
 * Strip all HTML tags from a string
 */
export const stripHtml = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Sanitize user input - removes dangerous characters and trims
 */
export const sanitizeInput = (input: string, options?: {
  maxLength?: number;
  allowNewlines?: boolean;
  allowHtml?: boolean;
}): string => {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Strip HTML unless explicitly allowed
  if (!options?.allowHtml) {
    sanitized = stripHtml(sanitized);
  }
  
  // Escape remaining HTML entities
  sanitized = escapeHtml(sanitized);
  
  // Remove newlines unless allowed
  if (!options?.allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }
  
  // Apply max length
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitize for SQL LIKE queries (escape wildcards)
 */
export const sanitizeForLike = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
};

// =============================================
// VALIDATION FUNCTIONS
// =============================================

/**
 * Email validation
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
};

/**
 * Phone number validation (Turkish format)
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  // Accept various Turkish phone formats
  const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleaned);
};

/**
 * Password strength validation
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} => {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push('Şifre en az 8 karakter olmalı');
  }
  
  if (password.length > 128) {
    errors.push('Şifre 128 karakterden uzun olamaz');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Şifre en az bir küçük harf içermeli');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Şifre en az bir büyük harf içermeli');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Şifre en az bir rakam içermeli');
  }
  
  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score >= 4) strength = 'strong';
  else if (score >= 2) strength = 'medium';
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
};

/**
 * UUID validation
 */
export const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * URL validation
 */
export const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Validate tour input data
 */
export const validateTourInput = (input: {
  title?: string;
  location?: string;
  description?: string;
  price?: number;
  duration?: string;
  category?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (!input.title || input.title.trim().length < 3) {
    errors.title = 'Başlık en az 3 karakter olmalı';
  } else if (input.title.length > 200) {
    errors.title = 'Başlık 200 karakterden uzun olamaz';
  }
  
  if (!input.location || input.location.trim().length < 2) {
    errors.location = 'Konum belirtilmeli';
  }
  
  if (!input.description || input.description.trim().length < 10) {
    errors.description = 'Açıklama en az 10 karakter olmalı';
  } else if (input.description.length > 5000) {
    errors.description = 'Açıklama 5000 karakterden uzun olamaz';
  }
  
  if (input.price === undefined || input.price < 0) {
    errors.price = 'Geçerli bir fiyat girilmeli';
  } else if (input.price > 100000) {
    errors.price = 'Fiyat çok yüksek';
  }
  
  if (!input.duration) {
    errors.duration = 'Süre belirtilmeli';
  }
  
  if (!input.category) {
    errors.category = 'Kategori seçilmeli';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate community post input
 */
export const validatePostInput = (input: {
  title?: string;
  content?: string;
  type?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (input.title && input.title.length > 200) {
    errors.title = 'Başlık 200 karakterden uzun olamaz';
  }
  
  if (!input.content || input.content.trim().length < 5) {
    errors.content = 'İçerik en az 5 karakter olmalı';
  } else if (input.content.length > 2000) {
    errors.content = 'İçerik 2000 karakterden uzun olamaz';
  }
  
  const validTypes = ['photo', 'review', 'suggestion'];
  if (!input.type || !validTypes.includes(input.type)) {
    errors.type = 'Geçerli bir gönderi tipi seçilmeli';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// =============================================
// NUMBER VALIDATION
// =============================================

/**
 * Safe number parsing with bounds checking
 */
export const parseNumber = (
  value: unknown,
  options?: {
    min?: number;
    max?: number;
    defaultValue?: number;
    allowFloat?: boolean;
  }
): number | null => {
  const { min, max, defaultValue, allowFloat = true } = options || {};
  
  let num: number;
  
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    num = allowFloat ? parseFloat(value) : parseInt(value, 10);
  } else {
    return defaultValue ?? null;
  }
  
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue ?? null;
  }
  
  if (min !== undefined && num < min) {
    return defaultValue ?? min;
  }
  
  if (max !== undefined && num > max) {
    return defaultValue ?? max;
  }
  
  return num;
};

// =============================================
// ARRAY VALIDATION
// =============================================

/**
 * Validate and sanitize string array
 */
export const sanitizeStringArray = (
  arr: unknown,
  options?: {
    maxItems?: number;
    maxItemLength?: number;
  }
): string[] => {
  if (!Array.isArray(arr)) return [];
  
  const { maxItems = 50, maxItemLength = 500 } = options || {};
  
  return arr
    .filter((item): item is string => typeof item === 'string')
    .slice(0, maxItems)
    .map(item => sanitizeInput(item, { maxLength: maxItemLength }))
    .filter(item => item.length > 0);
};

// =============================================
// COORDINATE VALIDATION
// =============================================

/**
 * Validate latitude
 */
export const isValidLatitude = (lat: number): boolean => {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
};

/**
 * Validate longitude
 */
export const isValidLongitude = (lng: number): boolean => {
  return typeof lng === 'number' && lng >= -180 && lng <= 180;
};

/**
 * Validate coordinates pair
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return isValidLatitude(lat) && isValidLongitude(lng);
};
