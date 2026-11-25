// ===== 여기만 고치면 사이트 전체에 반영된다 =====
const CONFIG = {
  // 잔여 신청 구좌 (상단 띠, 프로모션, 신청 영역, 하단 고정 바)
  remainingSlots: 7,
  // 기존 촬영 합계와 tobebrander 가격
  oldTotal: 3000000,
  newTotal: 399000,
  // 기존 촬영 단계별 비용 (원). 정해지면 숫자를 넣는다. null이면 금액을 표시하지 않는다.
  stepCosts: [null, null, null, null, null, null, null],
  // 상담 폼 접수 주소 (예: Formspree, Google Apps Script). 비어 있으면 전송하지 않는다.
  formEndpoint: "",
};
// ==============================================

const won = (n) => n.toLocaleString("ko-KR") + "원";

// 잔여 구좌
document.querySelectorAll("[data-slots]").forEach((el) => (el.textContent = CONFIG.remainingSlots));

// 단계별 비용
document.querySelectorAll("[data-cost]").forEach((el, i) => {
  const v = CONFIG.stepCosts[i];
  el.textContent = v == null ? "" : won(v);
});
document.querySelector(".total-old").textContent = won(CONFIG.oldTotal);

// ----- 스크롤 비용 비교 -----
const versus = document.getElementById("versus");
const rows = [...versus.querySelectorAll(".row.old")];
const total = document.getElementById("total");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function render(p) {
  // p: 0 → 1. 0.08~0.64 구간에서 일곱 단계를 차례로 지운다.
  const start = 0.08, step = 0.08;
  let struck = 0;
  rows.forEach((r, i) => {
    const on = p > start + i * step;
    r.classList.toggle("strike", on);
    if (on) struck++;
  });
  const done = p > 0.72;
  versus.classList.toggle("done", done);
  const value = done
    ? CONFIG.newTotal
    : Math.round((CONFIG.oldTotal - (struck / rows.length) * (CONFIG.oldTotal - CONFIG.newTotal)) / 1000) * 1000;
  total.textContent = won(value);
}

if (reduce) {
  rows.forEach((r) => r.classList.add("strike"));
  render(1);
} else {
  let ticking = false;
  const update = () => {
    const rect = versus.getBoundingClientRect();
    const range = versus.offsetHeight - window.innerHeight;
    const p = Math.min(1, Math.max(0, -rect.top / range));
    render(p);
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  window.addEventListener("resize", update);
  update();
}

// ----- 하단 고정 바: 첫 화면을 지나면 보이고, 신청 영역에서는 숨긴다 -----
const bar = document.getElementById("slot-bar");
const contact = document.getElementById("contact");
const hero = document.querySelector(".hero");
let heroOut = false, contactIn = false;
const sync = () => bar.classList.toggle("show", heroOut && !contactIn);
new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting; sync(); }).observe(hero);
new IntersectionObserver(([e]) => { contactIn = e.isIntersecting; sync(); }).observe(contact);

// ----- 신청 폼 -----
const form = document.getElementById("contact-form");
const msg = document.getElementById("form-msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  if (!data.get("brand") || !data.get("email") || !form.email.checkValidity()) {
    msg.textContent = "브랜드명과 이메일을 확인해 주세요.";
    return;
  }
  if (!CONFIG.formEndpoint) {
    msg.textContent = "신청 접수 연결을 준비 중입니다. 잠시 후 다시 시도해 주세요.";
    return;
  }
  msg.textContent = "보내는 중…";
  try {
    const res = await fetch(CONFIG.formEndpoint, {
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
