// Supabase Edge Function: analyze-image
// API key'leri güvenli bir şekilde server-side'da tutar
// Deploy: supabase functions deploy analyze-image

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface RequestBody {
  imageBase64: string;
  provider: 'openai' | 'anthropic';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function analyzeWithOpenAI(imageBase64: string): Promise<Response> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and identify the historical place, landmark, or tourist attraction.',
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

  return response;
}

async function analyzeWithClaude(imageBase64: string): Promise<Response> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
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
              text: 'Analyze this image and identify the historical place, landmark, or tourist attraction.',
            },
          ],
        },
      ],
    }),
  });

  return response;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageBase64, provider }: RequestBody = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API key availability
    const apiKey = provider === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze image
    const apiResponse = provider === 'openai'
      ? await analyzeWithOpenAI(imageBase64)
      : await analyzeWithClaude(imageBase64);

    const result = await apiResponse.json();

    // Log usage for monitoring
    console.log(`Image analysis by user ${user.id} using ${provider}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing image:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
