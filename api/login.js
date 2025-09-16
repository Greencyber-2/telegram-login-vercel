// login.js
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Api } = require("telegram/tl");
const input = require("input");

// اطلاعات API
const apiId = 20456083;
const apiHash = '16db2b0cdd40db7c91511ca151115af5';

// ذخیره sessionها
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
            settings: new Api.CodeSettings({
              allowFlashcall: true,
              currentNumber: true,
              allowAppHash: true,
            }),
            apiId: apiId,
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
            : "خطا در ارسال کد تأیید. لطفاً دوباره امتحان کنید." 
        });
      }
    }

    if (step === "verifyCode") {
      if (!code || !phoneCodeHash) {
        return res.status(400).json({ success: false, message: "کد تأیید و هش کد لازم است" });
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
        
        // دریافت اطلاعات کاربر پس از ورود موفق
        const user = await client.getMe();
        const userData = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phone: user.phone
        };
        
        // ذخیره session string برای استفاده بعدی
        const sessionString = client.session.save();
        
        return res.status(200).json({ 
          success: true, 
          message: "ورود موفقیت‌آمیز بود",
          user: userData,
          sessionString: sessionString
        });
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
        let errorMessage = "خطا در تأیید کد. لطفاً دوباره امتحان کنید.";
        
        if (error.errorMessage === "PHONE_CODE_INVALID") {
          errorMessage = "کد تأیید نامعتبر است.";
        } else if (error.errorMessage === "PHONE_CODE_EXPIRED") {
          errorMessage = "کد تأیید منقضی شده است. لطفاً کد جدیدی دریافت کنید.";
        } else if (error.errorMessage === "PHONE_CODE_EMPTY") {
          errorMessage = "کد تأیید ارائه نشده است.";
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
        
        // ذخیره session string برای استفاده بعدی
        const sessionString = client.session.save();
        
        return res.status(200).json({ 
          success: true, 
          message: "ورود موفقیت‌آمیز بود",
          user: userData,
          sessionString: sessionString
        });
      } catch (error) {
        console.error("Password check error:", error);
        return res.status(400).json({ 
          success: false, 
          message: error.errorMessage === "PASSWORD_HASH_INVALID" 
            ? "رمز دومرحله‌ای نامعتبر است" 
            : "خطا در بررسی رمز. لطفاً دوباره امتحان کنید."
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
