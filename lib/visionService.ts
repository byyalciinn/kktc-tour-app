/**
 * Vision Analysis Service
 * Analyzes images using LLM vision capabilities to identify historical places,
 * landmarks, and tourist attractions in North Cyprus (KKTC).
 */

import { logger } from './logger';

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
    throw new Error('Failed to process image');
  }
}

/**
 * Analyzes an image using OpenAI Vision API
 */
async function analyzeWithOpenAI(
  imageBase64: string,
  apiKey: string
): Promise<VisionAnalysisResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and identify the historical place, landmark, or tourist attraction. Provide detailed information about it.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  const data: VisionAPIResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'OpenAI API error');
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return parseVisionResponse(content);
}

/**
 * Analyzes an image using Anthropic Claude Vision API
 */
async function analyzeWithClaude(
  imageBase64: string,
  apiKey: string
): Promise<VisionAnalysisResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Analyze this image and identify the historical place, landmark, or tourist attraction. Provide detailed information about it.',
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Anthropic API error');
  }

  const content = data.content?.[0]?.text;
  if (!content) {
    throw new Error('No response from Claude');
  }

  return parseVisionResponse(content);
}

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
      placeName: parsed.placeName || 'Unknown Place',
      placeNameLocal: parsed.placeNameLocal,
      category: parsed.category || 'unknown',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
      description: parsed.description || 'No description available',
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
      placeName: 'Unknown',
      category: 'unknown',
      confidence: 0,
      description: content,
      significance: '',
      funFacts: [],
      visitTips: [],
      error: 'Failed to parse analysis result',
    };
  }
}

/**
 * Main function to analyze an image
 * @param imageUri - URI of the image to analyze
 * @param provider - LLM provider to use ('openai' or 'anthropic')
 */
export async function analyzeImage(
  imageUri: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<VisionAnalysisResult> {
  try {
    logger.info('Starting image analysis', { provider });

    // Get API key from environment
    const apiKey = provider === 'openai'
      ? process.env.EXPO_PUBLIC_OPENAI_API_KEY
      : process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Return mock data for development if no API key
      logger.warn('No API key configured, returning mock data');
      return getMockAnalysisResult();
    }

    // Convert image to base64
    const imageBase64 = await imageToBase64(imageUri);

    // Analyze with selected provider
    const result = provider === 'openai'
      ? await analyzeWithOpenAI(imageBase64, apiKey)
      : await analyzeWithClaude(imageBase64, apiKey);

    logger.info('Image analysis completed', { placeName: result.placeName, confidence: result.confidence });
    return result;
  } catch (error) {
    logger.error('Image analysis failed', error);
    return {
      success: false,
      placeName: 'Analysis Failed',
      category: 'unknown',
      confidence: 0,
      description: 'Unable to analyze the image. Please try again.',
      significance: '',
      funFacts: [],
      visitTips: [],
      error: error instanceof Error ? error.message : 'Unknown error',
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
