// ===== 여기만 고치면 사이트 전체에 반영된다 =====
const CONFIG = {
  // 잔여 신청 구좌 (상단 띠, 프로모션, 신청 영역, 하단 고정 바)
  remainingSlots: 7,
  // 기존 촬영 합계와 tobebrander 가격
  oldTotal: 3000000,
  newTotal: 399900,
  // 기존 촬영 7단계별 비용 (원). 합이 oldTotal과 같아야 한다. ※ 임시값 — 확정 필요
  stepCosts: [300000, 600000, 400000, 700000, 300000, 300000, 400000],
  // 상담 폼 접수 주소 (예: Formspree, Google Apps Script). 비어 있으면 전송하지 않는다.
  formEndpoint: "",
};
// ==============================================

const won = (n) => n.toLocaleString("ko-KR") + "원";

// 잔여 구좌
document.querySelectorAll("[data-slots]").forEach((el) => (el.textContent = CONFIG.remainingSlots));

// ----- 스크롤 비용 비교 -----
// 단계: 0 대기 → 1 목록 타이핑 + 3,000,000원 → 2 제목이 tobebrander는 → 3 1~2만 남고 399,900원
// 숫자는 스크롤 양에 묶지 않고, 단계에 들어설 때 한 번 재생된다.
const versus = document.getElementById("versus");
const rows = [...versus.querySelectorAll(".row")];
const totalEl = document.getElementById("total");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 슬롯머신처럼 숫자를 굴리다가 왼쪽 자리부터 멈춘다
const rolls = new WeakMap();
function roll(el, target, { duration = 700, suffix = "원" } = {}) {
  const prev = rolls.get(el); if (prev) clearInterval(prev);
  const final = target.toLocaleString("ko-KR");
  if (reduce) { el.textContent = final + suffix; return Promise.resolve(); }
  const digitIdx = [...final].map((ch, k) => (/\d/.test(ch) ? k : -1)).filter((k) => k >= 0);
  const start = performance.now();
  return new Promise((resolve) => {
    const id = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / duration);
      const settled = Math.floor(t * digitIdx.length);
      const out = [...final].map((ch, k) => {
        const pos = digitIdx.indexOf(k);
        if (pos < 0 || pos < settled) return ch;
        return String(Math.floor(Math.random() * 10));
      });
      el.textContent = out.join("") + suffix;
      if (t >= 1) { clearInterval(id); el.textContent = final + suffix; resolve(); }
    }, 40);
    rolls.set(el, id);
  });
}

async function type(el, text, speed = 28) {
  if (reduce) { el.textContent = text; return; }
  el.textContent = "";
  el.classList.add("typing");
  for (const ch of text) { el.textContent += ch; await wait(speed); }
  el.classList.remove("typing");
}

function swapText(el, text) {
  el.textContent = text;
  el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
}

let stage = 0;
let typed = false;

async function playList() {
  typed = true;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    r.classList.add("in");
    await type(r.querySelector(".t"), r.dataset.text);
    // 타이핑 도중 이미 3단계로 내려왔다면 1~2번 줄은 바뀐 내용으로 맞춘다
    if (stage >= 3 && i < 2) {
      swapText(r.querySelector(".t"), r.dataset.new);
      r.querySelector(".c").textContent = "✓";
    } else {
      roll(r.querySelector(".c"), CONFIG.stepCosts[i] ?? 0, { duration: 450 });
    }
    await wait(reduce ? 0 : 60);
  }
  await wait(reduce ? 0 : 300);
  roll(totalEl, stage >= 3 ? CONFIG.newTotal : CONFIG.oldTotal, { duration: 900 });
}

function setStage(next) {
  if (next === stage) return;
  const from = stage;
  stage = next;
  versus.classList.toggle("s2", next >= 2);
  versus.classList.toggle("s3", next >= 3);

  if (next >= 1 && !typed) { playList(); }

  // 1~2번 줄 글자와 금액 바꾸기
  if (next >= 3 && from < 3) {
    rows.slice(0, 2).forEach((r) => { swapText(r.querySelector(".t"), r.dataset.new); r.querySelector(".c").textContent = "✓"; });
    roll(totalEl, CONFIG.newTotal, { duration: 900 });
  }
  if (next < 3 && from >= 3) {
    rows.slice(0, 2).forEach((r, i) => {
      swapText(r.querySelector(".t"), r.dataset.text);
      roll(r.querySelector(".c"), CONFIG.stepCosts[i] ?? 0, { duration: 400 });
    });
    roll(totalEl, CONFIG.oldTotal, { duration: 900 });
  }
}

function update() {
  const rect = versus.getBoundingClientRect();
  const range = versus.offsetHeight - window.innerHeight;
  const p = Math.min(1, Math.max(0, -rect.top / range));
  let s = 0;
  if (rect.top < window.innerHeight * 0.35) s = 1; // 영역에 들어서면
  if (p > 0.38) s = 2;
  if (p > 0.68) s = 3;
  setStage(s);
}

if (reduce) {
  // 움직임 줄이기: 최종 상태만 보여 준다
  rows.forEach((r, i) => { r.classList.add("in"); r.querySelector(".t").textContent = r.dataset.text; });
  typed = true;
  setStage(3);
} else {
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(() => { update(); ticking = false; }); ticking = true; }
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

// ----- 장/벌 선택 계산기 -----
const PACKS = {
  image: { name: "이미지 팩", price: 129900, unit: "장", per: { cutout: 7, concept: 5, video: 0, items: 1 } },
  full:  { name: "풀 패키지", price: 399900, unit: "장", per: { cutout: 7, concept: 5, video: 1, items: 1 } },
  look:  { name: "룩 패키지", price: 499900, unit: "벌", per: { cutout: 14, concept: 10, video: 1, items: 2 } },
};
const pick = document.getElementById("pick");
let mode = "item", qty = 1;
const currentPack = () => mode === "look" ? "look" : pick.querySelector('input[name="pkg"]:checked').value;

function renderPick() {
  const key = currentPack(), p = PACKS[key];
  document.getElementById("qty").textContent = qty;
  document.getElementById("qty-unit").textContent = p.unit;
  const lines = [
    [mode === "look" ? `옷 ${qty}벌` : `옷 ${qty}장`, mode === "look" ? `총 ${p.per.items * qty}장` : ""],
    [`누끼컷 ${p.per.cutout * qty}컷`, ""],
    [`모델 컨셉샷 ${p.per.concept * qty}컷`, ""],
  ];
  if (p.per.video) lines.push([`시즌 숏폼 영상 ${p.per.video * qty}편`, ""]);
  document.getElementById("sum-list").innerHTML = lines.map(([a, b]) => `<li>${a}<span>${b}</span></li>`).join("");
  document.getElementById("sum-total").textContent = won(p.price * qty);
}

pick.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => {
  mode = b.dataset.mode;
  pick.querySelectorAll(".seg-btn").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", on); });
  pick.querySelectorAll("[data-for]").forEach((el) => (el.hidden = el.dataset.for !== mode));
  renderPick();
}));
pick.querySelectorAll('input[name="pkg"]').forEach((r) => r.addEventListener("change", renderPick));
pick.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => {
  qty = Math.min(99, Math.max(1, qty + Number(b.dataset.step)));
  renderPick();
}));
renderPick();

// 신청 폼: 계산기에서 고른 값을 넘기고, 단위(장/벌)를 맞춘다
const pkgSelect = document.querySelector('select[name="package"]');
const countInput = document.querySelector('input[name="count"]');
const syncUnit = () => {
  document.getElementById("count-label").textContent = `수량 (${PACKS[pkgSelect.value].unit})`;
};
pkgSelect.addEventListener("change", syncUnit);
document.getElementById("pick-go").addEventListener("click", () => {
  pkgSelect.value = currentPack();
  countInput.value = qty;
  syncUnit();
});
syncUnit();

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
