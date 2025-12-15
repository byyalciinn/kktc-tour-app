// Supabase Edge Function: analyze-image
// API key'leri güvenli bir şekilde server-side'da tutar
// Deploy: supabase functions deploy analyze-image
// Secrets: supabase secrets set GEMINI_API_KEY=your-key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

interface RequestBody {
  imageBase64: string;
  provider: 'openai' | 'anthropic' | 'gemini';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry configuration for overloaded API
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

// Network timeout configuration
const REQUEST_TIMEOUT_MS = 25000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number, response?: Response): number {
  const retryAfter = response?.headers?.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.min(30000, seconds * 1000);
    }
  }

  return RETRY_DELAY_MS * attempt;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  fetchFn: () => Promise<Response>,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchFn();
      const clonedResponse = response.clone();

      // Retry on transient HTTP statuses
      if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
        console.log(`[RETRY] Attempt ${attempt}/${retries} - status=${response.status}`);
        if (attempt < retries) {
          await sleep(getRetryDelayMs(attempt, response));
          continue;
        }
      }

      // Retry on overload message if JSON body exists
      try {
        const body = await clonedResponse.json();
        const msg = body?.error?.message;
        if (typeof msg === 'string' && msg.toLowerCase().includes('overloaded')) {
          console.log(`[RETRY] Attempt ${attempt}/${retries} - Model overloaded`);
          if (attempt < retries) {
            await sleep(getRetryDelayMs(attempt, response));
            continue;
          }
        }
      } catch {
        // Ignore JSON parse errors
      }

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[RETRY] Attempt ${attempt}/${retries} - fetch error: ${message}`);
      if (attempt < retries) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Unexpected retry loop termination');
}

// OPTIMIZED PROMPT: Türkçe çıktı için kısaltılmış şema
// - Kısa talimat, Türkçe açıklama/ipuçları
// - JSON anahtarları İngilizce kalsın, içerik Türkçe olsun
const SYSTEM_PROMPT = `Uzman Kuzey Kıbrıs (KKTC) tur rehberisin. Görseli analiz et, yapı/yer adını bul.

SADECE geçerli JSON döndür:
{"placeName":"İngilizce ad","placeNameLocal":"Türkçe ad","category":"historical|natural|religious|architectural|beach|monument|museum|unknown","confidence":0.0-1.0,"description":"Kısa Türkçe açıklama","historicalPeriod":"Dönem","yearBuilt":"Yıl/yüzyıl","significance":"Önemi (Türkçe)","funFacts":["bilgi1","bilgi2"],"visitTips":["ipucu1","ipucu2"],"bestTimeToVisit":"Zaman","estimatedDuration":"Süre","nearbyAttractions":["yer1"],"location":{"city":"Şehir","region":"Bölge"}}

Tanımsız veya KKTC değilse confidence=0 ver. Odak: Girne, Gazimağusa, Lefkoşa, Güzelyurt, Karpaz.`;

// Kullanıcı istemi (Türkçe, token dostu)
const USER_PROMPT = 'Bu görseldeki KKTC noktasını belirle ve bilgileri Türkçe yaz.';

async function analyzeWithOpenAI(imageBase64: string): Promise<Response> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Cost-optimized model
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'low', // Reduced from 'high' for token optimization
              },
            },
          ],
        },
      ],
      max_tokens: 800, // Reduced from 2000 - JSON response is compact
      temperature: 0.2, // Lower for more consistent output
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
      model: 'claude-3-haiku-20240307', // Cost-optimized model
      max_tokens: 800, // Reduced for compact JSON
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
            { type: 'text', text: USER_PROMPT },
          ],
        },
      ],
    }),
  });

  return response;
}

// Google Gemini 2.5 Flash - Most cost-effective option for vision tasks
// With retry mechanism for overloaded API
async function analyzeWithGemini(imageBase64: string): Promise<Response> {
  return fetchWithRetry(() =>
    fetchWithTimeout(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY ?? '',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
                { text: `${SYSTEM_PROMPT}\n\n${USER_PROMPT}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1400, // Increased to avoid truncation (was 800)
            responseMimeType: 'application/json', // Force JSON output
          },
        }),
      },
      REQUEST_TIMEOUT_MS
    )
  );
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

    // Check API key availability based on provider
    let apiKey: string | undefined;
    switch (provider) {
      case 'gemini':
        apiKey = GEMINI_API_KEY;
        break;
      case 'openai':
        apiKey = OPENAI_API_KEY;
        break;
      case 'anthropic':
        apiKey = ANTHROPIC_API_KEY;
        break;
    }
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `${provider} API key not configured` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze image based on provider
    let apiResponse: Response;
    switch (provider) {
      case 'gemini':
        apiResponse = await analyzeWithGemini(imageBase64);
        break;
      case 'openai':
        apiResponse = await analyzeWithOpenAI(imageBase64);
        break;
      case 'anthropic':
        apiResponse = await analyzeWithClaude(imageBase64);
        break;
      default:
        // Default to Gemini (most cost-effective)
        apiResponse = await analyzeWithGemini(imageBase64);
    }

    const rawText = await apiResponse.text();
    let parsedResult: any = null;
    try {
      parsedResult = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsedResult = null;
    }

    if (!apiResponse.ok) {
      const message =
        parsedResult?.error?.message ||
        parsedResult?.message ||
        rawText ||
        'Upstream provider error';

      return new Response(
        JSON.stringify({ error: { message, status: apiResponse.status, provider } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = parsedResult ?? { error: { message: 'Empty response from provider' } };

    // Log usage for monitoring (token-efficient logging)
    console.log(`[SCAN] user=${user.id} provider=${provider}`);

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
