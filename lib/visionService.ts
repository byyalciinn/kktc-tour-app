/**
 * Vision Analysis Service
 * Analyzes images using LLM vision capabilities to identify historical places,
 * landmarks, and tourist attractions in North Cyprus (KKTC).
 * 
 * SECURITY: API keys are now managed via Supabase Edge Functions
 * to prevent exposure in client-side code.
 */

import { logger } from './logger';
import { supabase } from './supabase';
import i18n from 'i18next';

/**
 * Maps API error messages to user-friendly localized messages
 */
function getUserFriendlyError(errorMessage: string): string {
  const lowerMessage = errorMessage.toLowerCase();
  
  // Overloaded / Rate limit errors
  if (lowerMessage.includes('overloaded') || lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return i18n.t('scan.errors.systemBusy');
  }
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('timeout')) {
    return i18n.t('scan.errors.networkError');
  }
  
  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('auth')) {
    return i18n.t('scan.errors.authError');
  }
  
  // API key errors
  if (lowerMessage.includes('api key') || lowerMessage.includes('invalid key')) {
    return i18n.t('scan.errors.serviceUnavailable');
  }
  
  // Generic server errors
  if (lowerMessage.includes('server') || lowerMessage.includes('500') || lowerMessage.includes('503')) {
    return i18n.t('scan.errors.serverError');
  }
  
  // Default error
  return i18n.t('scan.errors.analysisError');
}

export interface VisionAnalysisResult {
  success: boolean;
  placeName: string;
  placeNameLocal?: string;
  category: 'historical' | 'natural' | 'religious' | 'architectural' | 'beach' | 'monument' | 'museum' | 'unknown';
  confidence: number;
  description: string;
  historicalPeriod?: string;
  yearBuilt?: string;
  architect?: string;
  significance: string;
  funFacts: string[];
  visitTips: string[];
  bestTimeToVisit?: string;
  estimatedDuration?: string;
  nearbyAttractions?: string[];
  location?: {
    city?: string;
    region?: string;
    address?: string;
  };
  error?: string;
}

interface VisionAPIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

const SYSTEM_PROMPT = `You are an expert historian and tour guide specializing in North Cyprus (KKTC/TRNC). 
You analyze images of historical places, monuments, landmarks, and tourist attractions.

When analyzing an image, you must:
1. Identify the place, monument, or landmark
2. Provide detailed historical context
3. Share interesting facts and significance
4. Give practical visitor tips

Respond ONLY in valid JSON format with this exact structure:
{
  "placeName": "Name of the place in English",
  "placeNameLocal": "Name in Turkish if different",
  "category": "historical|natural|religious|architectural|beach|monument|museum|unknown",
  "confidence": 0.0-1.0,
  "description": "Detailed description of what's in the image",
  "historicalPeriod": "e.g., Ottoman Era, Byzantine Period, etc.",
  "yearBuilt": "Year or century if known",
  "architect": "Architect name if known",
  "significance": "Why this place is important",
  "funFacts": ["Interesting fact 1", "Interesting fact 2", "Interesting fact 3"],
  "visitTips": ["Tip 1", "Tip 2", "Tip 3"],
  "bestTimeToVisit": "Morning/Afternoon/Evening or seasonal",
  "estimatedDuration": "e.g., 1-2 hours",
  "nearbyAttractions": ["Nearby place 1", "Nearby place 2"],
  "location": {
    "city": "City name",
    "region": "Region in North Cyprus",
    "address": "Approximate address if known"
  }
}

If you cannot identify the place or it's not from North Cyprus, set confidence to 0 and explain in description.
Focus on places in: Kyrenia (Girne), Famagusta (Gazimağusa), Nicosia (Lefkoşa), Morphou (Güzelyurt), Karpaz Peninsula.`;

/**
 * Converts image URI to base64 string
 */
async function imageToBase64(imageUri: string): Promise<string> {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix if present
        const base64Data = base64.split(',')[1] || base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    logger.error('Failed to convert image to base64', error);
    throw new Error(i18n.t('scan.errors.imageProcessingFailed'));
  }
}

// NOTE: Direct API calls removed for security
// API calls are now handled by Supabase Edge Function: analyze-image
// This keeps API keys server-side and prevents exposure in client code

/**
 * Parses the LLM response into a structured result
 */
function parseVisionResponse(content: string): VisionAnalysisResult {
  try {
    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      placeName: parsed.placeName || i18n.t('scan.fallback.unknownPlace'),
      placeNameLocal: parsed.placeNameLocal,
      category: parsed.category || 'unknown',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
      description: parsed.description || i18n.t('scan.fallback.noDescription'),
      historicalPeriod: parsed.historicalPeriod,
      yearBuilt: parsed.yearBuilt,
      architect: parsed.architect,
      significance: parsed.significance || '',
      funFacts: Array.isArray(parsed.funFacts) ? parsed.funFacts : [],
      visitTips: Array.isArray(parsed.visitTips) ? parsed.visitTips : [],
      bestTimeToVisit: parsed.bestTimeToVisit,
      estimatedDuration: parsed.estimatedDuration,
      nearbyAttractions: Array.isArray(parsed.nearbyAttractions) ? parsed.nearbyAttractions : [],
      location: parsed.location,
    };
  } catch (error) {
    logger.error('Failed to parse vision response', error);
    return {
      success: false,
      placeName: i18n.t('scan.fallback.unknownPlace'),
      category: 'unknown',
      confidence: 0,
      description: content,
      significance: '',
      funFacts: [],
      visitTips: [],
      error: i18n.t('scan.errors.parseError'),
    };
  }
}

/**
 * Main function to analyze an image
 * SECURITY: Now uses Supabase Edge Function to keep API keys server-side
 * @param imageUri - URI of the image to analyze
 * @param provider - LLM provider to use ('gemini', 'openai', or 'anthropic')
 * 
 * Provider comparison (cost per 1M tokens):
 * - Gemini 2.0 Flash: FREE (experimental) / $0.075 input, $0.30 output (stable)
 * - GPT-4o-mini: $0.15 input, $0.60 output
 * - Claude 3 Haiku: $0.25 input, $1.25 output
 */
export async function analyzeImage(
  imageUri: string,
  provider: 'gemini' | 'openai' | 'anthropic' = 'gemini'
): Promise<VisionAnalysisResult> {
  try {
    logger.info('Starting image analysis via Edge Function', { provider });

    // Convert image to base64
    const imageBase64 = await imageToBase64(imageUri);

    // Call Edge Function instead of direct API (SECURITY: API keys stay server-side)
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: { imageBase64, provider },
    });

    if (error) {
      logger.error('Edge function error:', error);
      // Fallback to mock data in development
      if (__DEV__) {
        logger.warn('Falling back to mock data in development');
        return getMockAnalysisResult();
      }
      throw new Error(error.message);
    }

    // Debug: Log raw response to understand structure
    logger.info('Raw API response:', JSON.stringify(data, null, 2));

    // Check for API error in response
    if (data?.error) {
      logger.error('API error:', data.error);
      const friendlyError = getUserFriendlyError(data.error.message || '');
      throw new Error(friendlyError);
    }

    // Parse response based on provider
    let content: string;
    switch (provider) {
      case 'gemini':
        // Gemini returns candidates[0].content.parts[0].text
        // Also check for direct text response when responseMimeType is set
        content = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.text;
        break;
      case 'openai':
        content = data?.choices?.[0]?.message?.content;
        break;
      case 'anthropic':
        content = data?.content?.[0]?.text;
        break;
      default:
        content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!content) {
      logger.error('No content found in response. Data structure:', Object.keys(data || {}));
      throw new Error('No response from AI provider');
    }

    const result = parseVisionResponse(content);
    logger.info('Image analysis completed', { placeName: result.placeName, confidence: result.confidence });
    return result;
  } catch (error) {
    logger.error('Image analysis failed', error);
    const errorMessage = error instanceof Error ? error.message : '';
    const friendlyError = getUserFriendlyError(errorMessage);
    
    return {
      success: false,
      placeName: i18n.t('scan.errors.analysisFailed'),
      category: 'unknown',
      confidence: 0,
      description: friendlyError,
      significance: '',
      funFacts: [],
      visitTips: [],
      error: friendlyError,
    };
  }
}

/**
 * Returns mock data for development/demo purposes
 */
function getMockAnalysisResult(): VisionAnalysisResult {
  const mockPlaces = [
    {
      placeName: 'Bellapais Abbey',
      placeNameLocal: 'Beylerbeyi Manastırı',
      category: 'historical' as const,
      confidence: 0.95,
      description: 'A stunning Gothic abbey perched on the northern slopes of the Kyrenia mountain range. The abbey was built by Augustinian monks in the 13th century and is one of the finest examples of Gothic architecture in the Eastern Mediterranean.',
      historicalPeriod: 'Crusader Period',
      yearBuilt: '1198-1205',
      significance: 'One of the best-preserved Gothic buildings in the Middle East, this abbey represents the pinnacle of Crusader architecture in Cyprus. Lawrence Durrell lived nearby and wrote about its beauty.',
      funFacts: [
        'The abbey name "Bellapais" comes from French "Abbaye de la Paix" meaning "Abbey of Peace"',
        'Lawrence Durrell wrote his famous book "Bitter Lemons of Cyprus" while living in Bellapais village',
        'The refectory has remarkable acoustics and is used for classical music concerts'
      ],
      visitTips: [
        'Visit at sunset for breathtaking views and golden light on the ruins',
        'Bring comfortable shoes as there are uneven surfaces and stairs',
        'The Tree of Idleness cafe nearby offers stunning views and traditional coffee'
      ],
      bestTimeToVisit: 'Late afternoon/Sunset',
      estimatedDuration: '1-2 hours',
      nearbyAttractions: ['Kyrenia Castle', 'St. Hilarion Castle', 'Kyrenia Harbor'],
      location: {
        city: 'Kyrenia',
        region: 'Kyrenia District',
        address: 'Bellapais Village, Kyrenia'
      }
    },
    {
      placeName: 'Kyrenia Castle',
      placeNameLocal: 'Girne Kalesi',
      category: 'historical' as const,
      confidence: 0.92,
      description: 'A magnificent 16th-century castle located at the east end of the old harbor. Originally built by the Byzantines, it was later expanded by the Lusignans and Venetians.',
      historicalPeriod: 'Byzantine to Ottoman Era',
      yearBuilt: '7th century, rebuilt 16th century',
      significance: 'The castle houses the Shipwreck Museum containing one of the oldest known shipwrecks ever raised from the seabed, dating from around 300 BC.',
      funFacts: [
        'The ancient shipwreck inside is over 2,300 years old',
        'The castle dungeon was used to imprison Queen Catherine Cornaro',
        'The massive walls are up to 50 feet thick in some places'
      ],
      visitTips: [
        'Start your visit at the Shipwreck Museum - it\'s the highlight',
        'Walk the ramparts for panoramic views of the harbor',
        'Combine with a visit to the nearby Folk Art Museum'
      ],
      bestTimeToVisit: 'Morning',
      estimatedDuration: '2-3 hours',
      nearbyAttractions: ['Kyrenia Harbor', 'Folk Art Museum', 'Bellapais Abbey'],
      location: {
        city: 'Kyrenia',
        region: 'Kyrenia District',
        address: 'Kyrenia Harbor'
      }
    }
  ];

  // Return a random mock place
  return {
    success: true,
    ...mockPlaces[Math.floor(Math.random() * mockPlaces.length)]
  };
}

export type { VisionAPIResponse };
