document.getElementById("sendPhone").onclick = async () => {
  const phone = document.getElementById("phone").value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "sendCode", phone })
  });
  const data = await res.json();
  document.getElementById("status").textContent = data.message;
  if (data.success) {
    document.getElementById("codeSection").style.display = "block";
  }
};

document.getElementById("sendCode").onclick = async () => {
  const phone = document.getElementById("phone").value;
  const code = document.getElementById("code").value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "verifyCode", phone, code })
  });
  const data = await res.json();
  document.getElementById("status").textContent = data.message;
};
