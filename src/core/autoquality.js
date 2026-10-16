/**
 * Start quality from the hardware, ported from the HZ engine's web rules
 * (renderer_quality_for_hardware / renderer_web_gpu_class in
 * hz/src/engine/rendering/renderer_quality.c) so both builds pick a preset
 * from the same inputs. HZ then steps the level by measured GPU time; this
 * project builds its passes from the preset at load, so the pick holds.
 */

const LEVELS = ['low', 'medium', 'high', 'ultra'];
const PIXELS_1440P = 2560 * 1440;

/** Same test as HZ's wasm host (hz/src/os/wasm/main.ts). */
function isMobile() {
  return (
    (navigator.userAgentData?.mobile ?? false) ||
    (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches) ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

/** HZ's renderer_web_gpu_class: the start level and whether the part is discrete. */
function webGpuClass(vendor, arch) {
  const v = vendor.toLowerCase();
  if (v === 'nvidia') {
    if (arch === 'fermi' || arch === 'kepler') return { start: 0, discrete: true };
    if (arch === 'maxwell' || arch === 'pascal') return { start: 1, discrete: true };
    if (['turing', 'ampere', 'lovelace', 'blackwell'].includes(arch)) return { start: 2, discrete: true };
    return { start: 1, discrete: false };
  }
  if (v === 'amd') {
    if (arch === 'rdna-1' || arch === 'rdna-4') return { start: 2, discrete: true };
    return { start: 1, discrete: false };
  }
  if (v === 'intel') {
    if (arch === 'gen-12hp' || arch === 'xe-2hpg') return { start: 2, discrete: true };
    return { start: arch ? 0 : 1, discrete: false };
  }
  if (v === 'apple') return { start: arch.startsWith('common-') ? 0 : 1, discrete: false };
  if (['google', 'microsoft', 'qualcomm', 'arm'].includes(v)) return { start: 0, discrete: false };
  return { start: 1, discrete: false };
}

/** WebGPU's adapter.info, the input HZ reads; empty strings where the browser hides it. */
async function adapterInfo() {
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    const info = adapter?.info;
    if (info) return { vendor: info.vendor || '', arch: info.architecture || '' };
  } catch (err) {
    console.warn('[quality] WebGPU adapter query failed', err);
  }
  return { vendor: '', arch: '' };
}

/**
 * @param {HTMLCanvasElement} canvas the game canvas, already laid out
 * @returns {Promise<{quality: string, reason: string}>}
 */
export async function pickStartQuality(canvas) {
  if (isMobile()) return { quality: 'low', reason: 'mobile web' };
  const { vendor, arch } = await adapterInfo();
  const memGb = navigator.deviceMemory ?? 0;
  const cls = webGpuClass(vendor, arch);
  let level = memGb > 0 && memGb < 4 ? 0 : cls.start;
  // HZ: the display at the device pixel ratio, before any app resolution cap
  const dpr = globalThis.devicePixelRatio || 1;
  const pixels = Math.round(canvas.clientWidth * dpr) * Math.round(canvas.clientHeight * dpr);
  if (!cls.discrete && pixels > PIXELS_1440P && level > 0) level -= 1;
  return {
    quality: LEVELS[level],
    reason: `adapter '${vendor}' '${arch}', memory ${memGb || '?'} GB, display ${pixels} px`,
  };
}
