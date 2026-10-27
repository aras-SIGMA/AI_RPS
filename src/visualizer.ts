import type { Landmark, GestureType } from './classifier';

export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [5, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [9, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [13, 17], [17, 18], [18, 19], [19, 20],
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

export class HandVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context from canvas');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(landmarksList: Landmark[][], gesture: GestureType = 'Tidak Diketahui'): void {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    this.clear();

    if (!landmarksList || landmarksList.length === 0) return;

    for (const landmarks of landmarksList) {
      // Tentukan tema warna berdasarkan gestur sesuai palet desain
      let strokeColor = 'rgba(210, 243, 76, 0.9)'; // Neon Lime accent
      let glowColor = '#d2f34c';
      let tipColor = '#ffffff';

      if (gesture === 'Batu') {
        strokeColor = 'rgba(239, 68, 68, 0.9)'; // Ruby Red
        glowColor = '#ef4444';
        tipColor = '#ffffff';
      } else if (gesture === 'Gunting') {
        strokeColor = 'rgba(245, 158, 11, 0.9)'; // Amber Gold
        glowColor = '#f59e0b';
        tipColor = '#ffffff';
      } else if (gesture === 'Kertas') {
        strokeColor = 'rgba(16, 185, 129, 0.9)'; // Emerald Green
        glowColor = '#10b981';
        tipColor = '#ffffff';
      }

      ctx.save();

      // 1. Gambar Garis Koneksi Tulang Tangan (Bones)
      ctx.lineWidth = 4;
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;

      for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }

      // 2. Gambar Titik Sendi (Joints)
      for (let i = 0; i < landmarks.length; i++) {
        const pt = landmarks[i];
        const px = pt.x * width;
        const py = pt.y * height;
        const isTip = FINGERTIP_INDICES.includes(i);

        ctx.beginPath();
        const radius = isTip ? 7 : 4;
        ctx.arc(px, py, radius, 0, 2 * Math.PI);

        if (isTip) {
          ctx.fillStyle = tipColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 15;
        } else {
          ctx.fillStyle = strokeColor;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 6;
        }
        ctx.fill();

        // Outline tip
        if (isTip) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = strokeColor;
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
}
