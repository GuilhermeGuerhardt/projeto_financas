const SATURACAO = 82;
const LUMINOSIDADE = 52;

function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = light - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (hh < 60)       { rp = c; gp = x; }
  else if (hh < 120) { rp = x; gp = c; }
  else if (hh < 180) { gp = c; bp = x; }
  else if (hh < 240) { gp = x; bp = c; }
  else if (hh < 300) { rp = x; bp = c; }
  else               { rp = c; bp = x; }
  const rgb = [rp, gp, bp].map((v) => Math.round((v + m) * 255));
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function setRainbowWheelColor(wrap, hex) {
  if (!wrap) return;
  const hidden = wrap.querySelector('input[type="hidden"]');
  const core = wrap.querySelector(".rainbow-wheel-core");
  if (hidden) hidden.value = hex;
  if (core) core.style.background = hex;
}

/** Converte a posição do clique na roda em matiz (0–360) e aplica a cor. */
export function bindRainbowWheels() {
  document.querySelectorAll("[data-wheel]").forEach((wrap) => {
    const ring = wrap.querySelector(".rainbow-wheel-ring");
    if (!ring || ring.dataset.bound === "1") return;
    ring.dataset.bound = "1";
    ring.addEventListener("click", (e) => {
      const rect = ring.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hue = ((Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180) / Math.PI + 360) % 360;
      setRainbowWheelColor(wrap, hslToHex(hue, SATURACAO, LUMINOSIDADE));
    });
  });
}
