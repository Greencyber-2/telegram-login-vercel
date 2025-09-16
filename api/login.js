const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const apiId = 20456083; // جایگزین با API ID خودت
const apiHash = '16db2b0cdd40db7c91511ca151115af5'; // جایگزین با API Hash خودت

let stringSession = new StringSession("");

let sessions = {};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { step, phone, code } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: "شماره تلفن لازم است" });
  }

  if (!sessions[phone]) {
    sessions[phone] = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
    await sessions[phone].start({
      phoneNumber: async () => phone,
      password: async () => await input.text("رمز عبور دومرحله‌ای؟"),
      phoneCode: async () => code,
      onError: (err) => console.log("Telegram error:", err),
    });
  }

  const client = sessions[phone];

  try {
    if (step === "sendCode") {
      await client.sendCode(phone);
      return res.status(200).json({ success: true, message: "کد ارسال شد" });
    }

    if (step === "verifyCode") {
      await client.signIn({ phoneNumber: phone, phoneCode: code });
      return res.status(200).json({ success: true, message: "ورود موفق بود" });
    }

    return res.status(400).json({ success: false, message: "درخواست نامعتبر" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
