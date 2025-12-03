// Supabase Edge Function: send-verification-email
// This function sends 2FA verification codes via email
// Deploy with: supabase functions deploy send-verification-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@tourapp.com';

interface RequestBody {
  email: string;
  code: string;
  userName?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code, userName }: RequestBody = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email HTML template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Doğrulama Kodu</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">🔐</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">
                Doğrulama Kodu
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #4a4a4a; text-align: center;">
                ${userName ? `Merhaba ${userName},` : 'Merhaba,'}<br><br>
                Hesabınıza giriş yapmak için aşağıdaki doğrulama kodunu kullanın:
              </p>
            </td>
          </tr>
          
          <!-- Code -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; text-align: center;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
                  ${code}
                </span>
              </div>
            </td>
          </tr>
          
          <!-- Warning -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #888888; text-align: center;">
                Bu kod <strong>10 dakika</strong> içinde geçerliliğini yitirecektir.<br>
                Bu kodu kimseyle paylaşmayın.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 30px; border-top: 1px solid #eaeaea;">
              <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
                Bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.<br>
                © ${new Date().getFullYear()} Tour App. Tüm hakları saklıdır.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Plain text version
    const textContent = `
Doğrulama Kodu

${userName ? `Merhaba ${userName},` : 'Merhaba,'}

Hesabınıza giriş yapmak için aşağıdaki doğrulama kodunu kullanın:

${code}

Bu kod 10 dakika içinde geçerliliğini yitirecektir.
Bu kodu kimseyle paylaşmayın.

Bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.

© ${new Date().getFullYear()} Tour App. Tüm hakları saklıdır.
    `;

    // Send email using Resend API
    if (RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: `${code} - Tour App Doğrulama Kodu`,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Resend API error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to send email', details: errorData }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ success: true, messageId: data.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Development mode - just log the code
      console.log(`[DEV] Verification code for ${email}: ${code}`);
      return new Response(
        JSON.stringify({ success: true, dev: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
