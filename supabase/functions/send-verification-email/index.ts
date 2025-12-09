// Supabase Edge Function: send-verification-email
// This function sends 2FA verification codes via email using Resend API
// 
// Deploy with:
//   supabase functions deploy send-verification-email --no-verify-jwt
//
// Set secrets:
//   supabase secrets set RESEND_API_KEY=re_xxxxx
//   supabase secrets set FROM_EMAIL=noreply@yourdomain.com

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@tourapp.com';

interface RequestBody {
  email: string;
  code: string;
  userName?: string;
  language?: 'tr' | 'en';
  purpose?: 'two_factor' | 'password_reset';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email templates for different languages and purposes
const getEmailContent = (
  code: string, 
  userName: string | undefined, 
  language: 'tr' | 'en' = 'tr',
  purpose: 'two_factor' | 'password_reset' = 'two_factor'
) => {
  const translations = {
    tr: {
      two_factor: {
        title: 'Doğrulama Kodu',
        greeting: userName ? `Merhaba ${userName},` : 'Merhaba,',
        message: 'Hesabınıza giriş yapmak için aşağıdaki doğrulama kodunu kullanın:',
        expiry: 'Bu kod <strong>10 dakika</strong> içinde geçerliliğini yitirecektir.',
        warning: 'Bu kodu kimseyle paylaşmayın.',
        footer: 'Bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.',
        copyright: 'Tüm hakları saklıdır.',
        subject: `${code} - Tour App Doğrulama Kodu`,
        icon: '🔐',
      },
      password_reset: {
        title: 'Şifre Sıfırlama',
        greeting: userName ? `Merhaba ${userName},` : 'Merhaba,',
        message: 'Şifrenizi sıfırlamak için aşağıdaki doğrulama kodunu kullanın:',
        expiry: 'Bu kod <strong>10 dakika</strong> içinde geçerliliğini yitirecektir.',
        warning: 'Bu kodu kimseyle paylaşmayın. Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden gelin.',
        footer: 'Bu e-postayı siz talep etmediyseniz, hesabınız güvende olabilir. Herhangi bir işlem yapmanız gerekmez.',
        copyright: 'Tüm hakları saklıdır.',
        subject: `${code} - Tour App Şifre Sıfırlama Kodu`,
        icon: '🔑',
      },
    },
    en: {
      two_factor: {
        title: 'Verification Code',
        greeting: userName ? `Hello ${userName},` : 'Hello,',
        message: 'Use the following verification code to sign in to your account:',
        expiry: 'This code will expire in <strong>10 minutes</strong>.',
        warning: 'Do not share this code with anyone.',
        footer: 'If you did not request this email, please ignore it.',
        copyright: 'All rights reserved.',
        subject: `${code} - Tour App Verification Code`,
        icon: '🔐',
      },
      password_reset: {
        title: 'Password Reset',
        greeting: userName ? `Hello ${userName},` : 'Hello,',
        message: 'Use the following verification code to reset your password:',
        expiry: 'This code will expire in <strong>10 minutes</strong>.',
        warning: 'Do not share this code with anyone. If you did not request a password reset, please ignore this email.',
        footer: 'If you did not request this email, your account is safe. No action is required.',
        copyright: 'All rights reserved.',
        subject: `${code} - Tour App Password Reset Code`,
        icon: '🔑',
      },
    },
  };

  const t = translations[language][purpose];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
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
                <span style="font-size: 32px;">${t.icon}</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">
                ${t.title}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #4a4a4a; text-align: center;">
                ${t.greeting}<br><br>
                ${t.message}
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
                ${t.expiry}<br>
                ${t.warning}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 30px; border-top: 1px solid #eaeaea;">
              <p style="margin: 0; font-size: 12px; color: #888888; text-align: center;">
                ${t.footer}<br>
                © ${new Date().getFullYear()} Tour App. ${t.copyright}
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

  const text = `
${t.title}

${t.greeting}

${t.message}

${code}

${t.expiry.replace(/<\/?strong>/g, '')}
${t.warning}

${t.footer}

© ${new Date().getFullYear()} Tour App. ${t.copyright}
  `;

  return { html, text, subject: t.subject };
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code, userName, language = 'tr', purpose = 'two_factor' }: RequestBody = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get localized email content
    const { html, text, subject } = getEmailContent(code, userName, language, purpose);

    // Check if RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          message: 'Please set RESEND_API_KEY in Supabase Edge Function secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
        text,
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
    console.log(`Verification email sent to ${email}, messageId: ${data.id}`);
    
    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending verification email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
