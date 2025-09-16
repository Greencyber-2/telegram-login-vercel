const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");

// اطلاعات API - این مقادیر باید از my.telegram.org دریافت شوند
const apiId = 20456083;
const apiHash = '16db2b0cdd40db7c91511ca151115af5';

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
    
    const { step, phone, code, password, phoneCodeHash } = body;

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
            apiId: apiId,
            apiHash: apiHash,
          })
        );
        
        return res.status(200).json({ 
          success: true, 
          message: "کد ارسال شد",
          phoneCodeHash: result.phoneCodeHash 
        });
      } catch (error) {
        console.error("Send code error:", error);
        return res.status(400).json({ 
          success: false, 
          message: error.message || "خطا در ارسال کد" 
        });
      }
    }

    if (step === "verifyCode") {
      if (!code) {
        return res.status(400).json({ success: false, message: "کد تأیید لازم است" });
      }

      try {
        // ورود با کد
        const result = await client.invoke(
          new Api.auth.SignIn({
            phoneNumber: phone,
            phoneCodeHash: phoneCodeHash,
            phoneCode: code,
          })
        );
        
        return res.status(200).json({ success: true, message: "ورود موفق بود" });
      } catch (error) {
        // اگر نیاز به رمز دومرحله‌ای باشد
        if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          return res.status(200).json({ 
            success: false, 
            message: "رمز دومرحله‌ای نیاز است",
            needPassword: true 
          });
        }
        
        // خطاهای دیگر
        console.error("Verify code error:", error);
        return res.status(400).json({ 
          success: false, 
          message: error.message || "خطا در تأیید کد" 
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
        return res.status(200).json({ success: true, message: "ورود موفق بود" });
      } catch (error) {
        console.error("Password check error:", error);
        return res.status(400).json({ 
          success: false, 
          message: error.message || "رمز دومرحله‌ای نامعتبر" 
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
