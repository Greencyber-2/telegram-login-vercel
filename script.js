// script.js
let phoneCodeHash = ''; // برای ذخیره hash کد
let currentPhone = ''; // برای ذخیره شماره تلفن

document.getElementById("sendPhone").onclick = async () => {
  const phone = document.getElementById("phone").value;
  if (!phone) {
    showStatus("لطفاً شماره تلفن را وارد کنید", "error");
    return;
  }

  currentPhone = phone;
  showStatus("در حال ارسال کد...", "loading");
  
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "sendCode", phone })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showStatus(data.message, "success");
      phoneCodeHash = data.phoneCodeHash; // ذخیره hash برای مرحله بعد
      document.getElementById("codeSection").style.display = "block";
    } else {
      showStatus(data.message, "error");
    }
  } catch (error) {
    showStatus("خطا در ارتباط با سرور", "error");
    console.error(error);
  }
};

document.getElementById("sendCode").onclick = async () => {
  const code = document.getElementById("code").value;
  
  if (!code) {
    showStatus("لطفاً کد تأیید را وارد کنید", "error");
    return;
  }

  showStatus("در حال تأیید کد...", "loading");
  
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        step: "verifyCode", 
        phone: currentPhone, 
        code,
        phoneCodeHash 
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showStatus(data.message, "success");
      document.getElementById("codeSection").style.display = "none";
    } else if (data.needPassword) {
      showStatus(data.message, "info");
      // اگر نیاز به رمز دومرحله‌ای باشد
      setTimeout(() => {
        const password = prompt("لطفاً رمز دومرحله‌ای خود را وارد کنید:");
        if (password) {
          checkPassword(password);
        }
      }, 1000);
    } else {
      showStatus(data.message, "error");
    }
  } catch (error) {
    showStatus("خطا در ارتباط با سرور", "error");
    console.error(error);
  }
};

// تابع برای بررسی رمز دومرحله‌ای
async function checkPassword(password) {
  showStatus("در حال بررسی رمز...", "loading");
  
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        step: "checkPassword", 
        phone: currentPhone, 
        password 
      })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showStatus(data.message, "success");
      document.getElementById("codeSection").style.display = "none";
    } else {
      showStatus(data.message, "error");
    }
  } catch (error) {
    showStatus("خطا در ارتباط با سرور", "error");
    console.error(error);
  }
}

// تابع برای نمایش وضعیت با استایل‌های مختلف
function showStatus(message, type = "info") {
  const statusElement = document.getElementById("status");
  statusElement.textContent = message;
  statusElement.className = "status";
  
  switch (type) {
    case "error":
      statusElement.classList.add("error");
      break;
    case "success":
      statusElement.classList.add("success");
      break;
    case "loading":
      statusElement.classList.add("loading");
      break;
    case "info":
    default:
      statusElement.classList.add("info");
      break;
  }
}
