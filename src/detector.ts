import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export type DetectionCallback = (result: HandLandmarkerResult, fps: number) => void;

export class HandDetector {
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private lastVideoTime: number = -1;
  private frameCount: number = 0;
  private lastFpsUpdateTime: number = 0;
  private currentFps: number = 0;

  async init(): Promise<void> {
    if (this.handLandmarker) return;

    // Utamakan file lokal di public/wasm & public/models, fallback ke CDN
    let wasmPath = '/wasm';
    let modelPath = '/models/hand_landmarker.task';

    let vision;
    try {
      vision = await FilesetResolver.forVisionTasks(wasmPath);
    } catch {
      wasmPath = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
      vision = await FilesetResolver.forVisionTasks(wasmPath);
    }

    try {
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch {
      // Fallback delegate CPU jika GPU WebGL tidak tersedia
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }
  }

  async startCamera(videoElement: HTMLVideoElement, onDetection: DetectionCallback): Promise<void> {
    await this.init();
    this.videoElement = videoElement;

    // Akses webcam
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
      },
      audio: false,
    });

    this.videoElement.srcObject = this.stream;
    await new Promise<void>((resolve) => {
      this.videoElement!.onloadedmetadata = () => {
        this.videoElement!.play();
        resolve();
      };
    });

    this.isRunning = true;
    this.lastFpsUpdateTime = performance.now();
    this.frameCount = 0;

    const processFrame = () => {
      if (!this.isRunning || !this.videoElement || !this.handLandmarker) return;

      const now = performance.now();

      // Hitung FPS
      this.frameCount++;
      if (now - this.lastFpsUpdateTime >= 500) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdateTime));
        this.frameCount = 0;
        this.lastFpsUpdateTime = now;
      }

      // Deteksi hanya bila frame video sudah terupdate
      if (this.videoElement.currentTime !== this.lastVideoTime && this.videoElement.readyState >= 2) {
        this.lastVideoTime = this.videoElement.currentTime;
        const result = this.handLandmarker.detectForVideo(this.videoElement, now);
        onDetection(result, this.currentFps);
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  isDetecting(): boolean {
    return this.isRunning;
  }
}
