// login.js
const WORKER_URL = 'https://tell.a09627301.workers.dev';

// این تابع فقط برای نمونه است و در عمل باید با سرور تلگرام ارتباط برقرار کند
async function handleLogin(request) {
  try {
    const { action, phone, code, password, phoneCodeHash } = await request.json();
    
    // شبیه‌سازی فرآیند ورود
    if (action === 'sendCode' && phone) {
      // شبیه‌سازی ارسال کد
      return new Response(JSON.stringify({
        success: true,
        message: "کد تأیید ارسال شد",
        phoneCodeHash: "simulated_hash_" + Math.random().toString(36).substr(2, 9)
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    if (action === 'verifyCode' && phone && code && phoneCodeHash) {
      // شبیه‌سازی تأیید کد
      if (code === '12345') { // کد تست
        return new Response(JSON.stringify({
          success: false,
          message: "کد تأیید نامعتبر است"
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }
      
      // شبیه‌سازی ورود موفق
      const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      return new Response(JSON.stringify({
        success: true,
        message: "ورود موفقیت‌آمیز بود",
        user: {
          id: Math.floor(Math.random() * 1000000),
          firstName: "کاربر",
          lastName: "نمونه",
          username: "user_" + Math.floor(Math.random() * 1000),
          phone: phone
        },
        sessionId: sessionId
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: "پارامترهای ناقص"
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
    
  } catch (error) {
    console.error('Error in login:', error);
    return new Response(JSON.stringify({
      success: false,
      message: "خطای سرور داخلی"
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

// هندل کردن درخواست‌ها
export default async function handler(request) {
  // مدیریت CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
  
  const url = new URL(request.url);
  
  // مسیرهای API
  if (url.pathname === '/api/login') {
    return handleLogin(request);
  }
  
  // اگر مسیر شناخته شده نیست
  return new Response(JSON.stringify({
    success: false,
    message: "Endpoint not found"
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
