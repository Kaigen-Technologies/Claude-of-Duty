import { el, setText, setStyle } from './util.js';

/**
 * Frame counter: fps and frame time averaged over half-second windows of real
 * wall-clock frame intervals, the same readout the HZ build draws (cod_hud_top.c),
 * so captures of the two builds compare directly.
 */
export class FpsCounter {
  constructor(parent) {
    this.root = el('div', 'ow-fps', parent);
    const row = el('div', 'ow-fps-row', this.root);
    this.num = el('span', 'ow-fps-n', row, '0');
    el('span', 'ow-fps-l', row, 'FPS');
    this.ms = el('div', 'ow-fps-ms', this.root, '0.0 MS');

    this.window = 0;
    this.frames = 0;
    this.fps = 0;
    this.frameMs = 0;
    this.tone = '';
    this.last = -1;
  }

  /** @param {number} now performance.now() of this frame */
  update(now) {
    if (this.last >= 0) {
      this.window += (now - this.last) / 1000;
      this.frames++;
    }
    this.last = now;
    if (this.frames === 0) return;
    if (this.window < 0.5 && this.fps !== 0) return;

    this.fps = this.window > 0 ? this.frames / this.window : 0;
    this.frameMs = (this.window * 1000) / this.frames;
    this.window = 0;
    this.frames = 0;

    const fps = Math.round(this.fps);
    setText(this.num, String(fps));
    setText(this.ms, `${this.frameMs.toFixed(1)} MS`);
    const tone = fps >= 60 ? 'ok' : fps >= 30 ? 'warn' : 'bad';
    if (tone !== this.tone) {
      this.root.dataset.tone = tone;
      this.tone = tone;
    }
  }

  setVisible(v) {
    setStyle(this.root, 'display', v ? '' : 'none');
  }
}
