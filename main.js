// 상담 폼: FORM_ENDPOINT에 접수 주소(예: Formspree, Google Apps Script)를 넣으면 실제로 전송된다.
// 비어 있으면 전송하지 않고 안내 문구만 보여 준다.
const FORM_ENDPOINT = "";

const form = document.getElementById("contact-form");
const msg = document.getElementById("form-msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  if (!data.get("brand") || !data.get("email") || !form.email.checkValidity()) {
    msg.textContent = "브랜드명과 이메일을 확인해 주세요.";
    return;
  }
  if (!FORM_ENDPOINT) {
    msg.textContent = "상담 접수 연결을 준비 중입니다. 잠시 후 다시 시도해 주세요.";
    return;
  }
  msg.textContent = "보내는 중…";
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    msg.textContent = "접수되었습니다. 곧 연락드리겠습니다.";
  } catch {
    msg.textContent = "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
});
