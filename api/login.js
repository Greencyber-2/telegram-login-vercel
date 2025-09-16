const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input"); // این کتابخانه در محیط سرور کار نمی‌کند

// اطلاعات API شما - اینها را از my.telegram.org دریافت کنید
const apiId = 20456083;
const apiHash = '16db2b0cdd40db7c91511ca151115af5';

// ذخیره موقت sessionها
const sessions = {};

module.exports = async (req, res) => {
  // فقط درخواست‌های POST را پردازش کن
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { step, phone, code, password, phoneCodeHash } = req.body;

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
      // ارسال کد تأیید
      const result = await client.sendCode(phone, {
        forceSMS: false,
      });
      
      return res.status(200).json({ 
        success: true, 
        message: "کد ارسال شد",
        phoneCodeHash: result.phoneCodeHash 
      });
    }

    if (step === "verifyCode") {
      if (!code) {
        return res.status(400).json({ success: false, message: "کد تأیید لازم است" });
      }

      try {
        // ورود با کد
        await client.signIn({
          phoneNumber: phone,
          phoneCode: code,
          phoneCodeHash: phoneCodeHash
        });
        
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
        throw error;
      }
    }

    if (step === "checkPassword" && password) {
      // بررسی رمز دومرحله‌ای
      await client.checkPassword(password);
      return res.status(200).json({ success: true, message: "ورود موفق بود" });
    }

    return res.status(400).json({ success: false, message: "درخواست نامعتبر" });
  } catch (err) {
    console.error("Error in login API:", err);
    return res.status(500).json({ success: false, message: err.message || "خطای سرور" });
  }
};
