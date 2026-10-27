import './style.css';
import { HandDetector } from './detector';
import { HandVisualizer } from './visualizer';
import { classifyGesture, type GestureType, type FingerStates } from './classifier';
import { SVG_ICONS } from './icons';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

// DOM Elements
const videoEl = document.getElementById('webcam') as HTMLVideoElement;
const canvasEl = document.getElementById('output-canvas') as HTMLCanvasElement;
const cameraWrapper = document.getElementById('camera-wrapper') as HTMLDivElement;
const cameraAlert = document.getElementById('camera-alert') as HTMLDivElement;
const placeholderEl = document.getElementById('camera-placeholder') as HTMLDivElement;
const loadingOverlay = document.getElementById('loading-overlay') as HTMLDivElement;
const loadingText = document.getElementById('loading-text') as HTMLParagraphElement;

const btnToggleCamera = document.getElementById('btn-toggle-camera') as HTMLButtonElement;
const btnCameraText = document.getElementById('btn-camera-text') as HTMLSpanElement;
const btnStartHero = document.getElementById('btn-start-hero') as HTMLButtonElement;
const btnNavCamera = document.getElementById('btn-nav-camera') as HTMLButtonElement;
const btnNavText = document.getElementById('btn-nav-text') as HTMLSpanElement;

const btnToggleSkeleton = document.getElementById('btn-toggle-skeleton') as HTMLButtonElement;
const btnToggleMirror = document.getElementById('btn-toggle-mirror') as HTMLButtonElement;

const statusBadge = document.getElementById('status-badge') as HTMLDivElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;
const fpsBadge = document.getElementById('fps-badge') as HTMLSpanElement;

const gestureDisplayCard = document.getElementById('gesture-display') as HTMLDivElement;
const gestureIcon = document.getElementById('gesture-icon') as HTMLSpanElement;
const gestureName = document.getElementById('gesture-name') as HTMLHeadingElement;
const confidenceFill = document.getElementById('confidence-fill') as HTMLDivElement;
const confidenceText = document.getElementById('confidence-text') as HTMLSpanElement;

// Finger Items
const fingerItems: Record<keyof FingerStates, HTMLDivElement> = {
  thumb: document.getElementById('finger-thumb') as HTMLDivElement,
  index: document.getElementById('finger-index') as HTMLDivElement,
  middle: document.getElementById('finger-middle') as HTMLDivElement,
  ring: document.getElementById('finger-ring') as HTMLDivElement,
  pinky: document.getElementById('finger-pinky') as HTMLDivElement,
};

// Game Elements
const btnPlayRound = document.getElementById('btn-play-round') as HTMLButtonElement;
const playerChoiceIcon = document.getElementById('player-choice-icon') as HTMLDivElement;
const playerChoiceName = document.getElementById('player-choice-name') as HTMLSpanElement;
const botChoiceIcon = document.getElementById('bot-choice-icon') as HTMLDivElement;
const botChoiceName = document.getElementById('bot-choice-name') as HTMLSpanElement;
const gameCountdown = document.getElementById('game-countdown') as HTMLSpanElement;
const scoreWinEl = document.getElementById('score-win') as HTMLSpanElement;
const scoreTieEl = document.getElementById('score-tie') as HTMLSpanElement;
const scoreLoseEl = document.getElementById('score-lose') as HTMLSpanElement;
const gameResultBanner = document.getElementById('game-result-banner') as HTMLDivElement;
const gameResultText = document.getElementById('game-result-text') as HTMLSpanElement;

// Instances & State
const detector = new HandDetector();
const visualizer = new HandVisualizer(canvasEl);

let showSkeleton = true;
let isMirror = true;
cameraWrapper.classList.add('mirror');

let latestGesture: GestureType = 'Tidak Diketahui';
let hasMultipleHands = false;
let isPlayingRound = false;
const scores = { win: 0, tie: 0, lose: 0 };

function updateFingerUI(fingers?: FingerStates) {
  const keys: (keyof FingerStates)[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  for (const k of keys) {
    const el = fingerItems[k];
    if (!el) continue;
    const stateEl = el.querySelector('.fn-state') as HTMLSpanElement;
    if (!fingers) {
      el.className = 'finger';
      if (stateEl) stateEl.textContent = '--';
    } else {
      const isOpen = fingers[k];
      el.className = `finger ${isOpen ? 'open' : 'closed'}`;
      if (stateEl) stateEl.textContent = isOpen ? 'Buka' : 'Tutup';
    }
  }
}

function updateGestureUI(gesture: GestureType, confidence: number, iconSvg: string) {
  latestGesture = gesture;
  gestureIcon.innerHTML = iconSvg;
  gestureName.textContent = gesture;
  confidenceFill.style.width = `${confidence}%`;
  confidenceText.textContent = `${confidence}%`;

  // Update theme class
  gestureDisplayCard.className = 'panel-block detection';
  if (gesture === 'Batu') {
    gestureDisplayCard.classList.add('detected-batu');
  } else if (gesture === 'Gunting') {
    gestureDisplayCard.classList.add('detected-gunting');
  } else if (gesture === 'Kertas') {
    gestureDisplayCard.classList.add('detected-kertas');
  }
}

// Hand Detection Callback Loop
function handleDetection(result: HandLandmarkerResult, fps: number) {
  fpsBadge.textContent = `${fps} FPS`;

  // Sinkronkan ukuran canvas dengan dimensi video asli
  if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
    visualizer.resize(videoEl.videoWidth, videoEl.videoHeight);
  }

  const handCount = result.landmarks ? result.landmarks.length : 0;

  if (handCount > 1) {
    hasMultipleHands = true;
    latestGesture = 'Tidak Diketahui';
    cameraAlert.classList.remove('hidden');

    updateGestureUI('Tidak Diketahui', 0, SVG_ICONS.Warning);
    gestureName.textContent = 'Hanya Boleh 1 Tangan!';
    gestureDisplayCard.className = 'panel-block detection detected-error';
    updateFingerUI(undefined);

    if (showSkeleton) {
      visualizer.draw(result.landmarks, 'Tidak Diketahui', true);
    } else {
      visualizer.clear();
    }
  } else if (handCount === 1) {
    hasMultipleHands = false;
    cameraAlert.classList.add('hidden');

    const handLandmarks = result.landmarks[0];
    const classification = classifyGesture(handLandmarks);

    updateGestureUI(classification.gesture, classification.confidence, classification.icon);
    updateFingerUI(classification.fingers);

    if (showSkeleton) {
      visualizer.draw(result.landmarks, classification.gesture, false);
    } else {
      visualizer.clear();
    }
  } else {
    hasMultipleHands = false;
    cameraAlert.classList.add('hidden');

    visualizer.clear();
    updateGestureUI('Tidak Diketahui', 0, SVG_ICONS.Search);
    gestureName.textContent = 'Mencari tangan...';
    updateFingerUI(undefined);
  }
}

async function startApp() {
  try {
    placeholderEl.classList.add('hidden');
    loadingOverlay.classList.remove('hidden');
    loadingText.textContent = 'Memuat model AI...';

    await detector.startCamera(videoEl, handleDetection);

    loadingOverlay.classList.add('hidden');
    statusBadge.className = 'status status-on';
    statusText.textContent = 'Kamera aktif';

    btnToggleCamera.className = 'btn btn-danger';
    btnCameraText.textContent = 'Matikan Kamera';

    if (btnNavCamera) {
      btnNavCamera.className = 'btn btn-danger btn-sm';
      btnNavText.textContent = 'Matikan Kamera';
    }
  } catch (err) {
    console.error('Gagal mengakses kamera:', err);
    loadingOverlay.classList.add('hidden');
    placeholderEl.classList.remove('hidden');
    statusBadge.className = 'status status-error';
    statusText.textContent = 'Gagal akses';
    alert('Tidak dapat mengakses webcam. Pastikan izin kamera telah diberikan di browser.');
  }
}

function stopApp() {
  detector.stop();
  visualizer.clear();
  hasMultipleHands = false;
  cameraAlert.classList.add('hidden');
  placeholderEl.classList.remove('hidden');
  statusBadge.className = 'status status-off';
  statusText.textContent = 'Kamera mati';
  fpsBadge.textContent = '0 FPS';

  btnToggleCamera.className = 'btn btn-dark';
  btnCameraText.textContent = 'Nyalakan Kamera';

  if (btnNavCamera) {
    btnNavCamera.className = 'btn btn-dark btn-sm';
    btnNavText.textContent = 'Nyalakan Kamera';
  }

  updateGestureUI('Tidak Diketahui', 0, SVG_ICONS.Ready);
  gestureName.textContent = 'Siap memindai';
  updateFingerUI(undefined);
}

function toggleCamera() {
  if (detector.isDetecting()) {
    stopApp();
  } else {
    startApp();
  }
}

// Event Listeners
btnToggleCamera.addEventListener('click', toggleCamera);
if (btnNavCamera) btnNavCamera.addEventListener('click', toggleCamera);
if (btnStartHero) btnStartHero.addEventListener('click', startApp);

btnToggleSkeleton.addEventListener('click', () => {
  showSkeleton = !showSkeleton;
  btnToggleSkeleton.querySelector('span')!.textContent = `Skeleton: ${showSkeleton ? 'ON' : 'OFF'}`;
  if (!showSkeleton) visualizer.clear();
});

btnToggleMirror.addEventListener('click', () => {
  isMirror = !isMirror;
  if (isMirror) {
    cameraWrapper.classList.add('mirror');
  } else {
    cameraWrapper.classList.remove('mirror');
  }
  btnToggleMirror.querySelector('span')!.textContent = `Mirror: ${isMirror ? 'ON' : 'OFF'}`;
});

// Mini Game Logic: VS AI Bot
const GAME_CHOICES: { name: GestureType; icon: string }[] = [
  { name: 'Batu', icon: SVG_ICONS.Batu },
  { name: 'Gunting', icon: SVG_ICONS.Gunting },
  { name: 'Kertas', icon: SVG_ICONS.Kertas },
];

btnPlayRound.addEventListener('click', () => {
  if (!detector.isDetecting()) {
    alert('Nyalakan kamera terlebih dahulu untuk bermain!');
    return;
  }
  if (isPlayingRound) return;

  isPlayingRound = true;
  btnPlayRound.disabled = true;
  gameResultBanner.className = 'game-banner hidden';

  let countdown = 3;
  gameCountdown.textContent = `${countdown}`;
  playerChoiceIcon.innerHTML = SVG_ICONS.Waiting;
  playerChoiceName.textContent = 'Bersiap...';
  botChoiceIcon.innerHTML = SVG_ICONS.Bot;
  botChoiceName.textContent = 'Berpikir...';

  const timer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      gameCountdown.textContent = `${countdown}`;
    } else {
      clearInterval(timer);
      gameCountdown.textContent = 'GO!';

      setTimeout(() => {
        finishRound();
      }, 500);
    }
  }, 1000);
});

function finishRound() {
  const userGesture = latestGesture;
  const botChoice = GAME_CHOICES[Math.floor(Math.random() * GAME_CHOICES.length)];

  if (hasMultipleHands) {
    playerChoiceIcon.innerHTML = SVG_ICONS.Warning;
    playerChoiceName.textContent = '2 Tangan';
    botChoiceIcon.innerHTML = botChoice.icon;
    botChoiceName.textContent = botChoice.name;
    gameResultBanner.className = 'game-banner result-lose';
    gameResultText.textContent = 'Hanya boleh satu tangan saja yang terdeteksi! Ronde dibatalkan.';
    gameResultBanner.classList.remove('hidden');
    isPlayingRound = false;
    btnPlayRound.disabled = false;
    gameCountdown.textContent = 'VS';
    return;
  }

  const userIconMap: Record<GestureType, string> = {
    Batu: SVG_ICONS.Batu,
    Gunting: SVG_ICONS.Gunting,
    Kertas: SVG_ICONS.Kertas,
    'Tidak Diketahui': SVG_ICONS.Unknown,
  };

  playerChoiceIcon.innerHTML = userIconMap[userGesture];
  playerChoiceName.textContent = userGesture;
  botChoiceIcon.innerHTML = botChoice.icon;
  botChoiceName.textContent = botChoice.name;

  if (userGesture === 'Tidak Diketahui') {
    gameResultBanner.className = 'game-banner result-lose';
    gameResultText.textContent = 'Tangan tidak terdeteksi! Buat simbol Batu/Gunting/Kertas di kamera.';
  } else if (userGesture === botChoice.name) {
    scores.tie++;
    scoreTieEl.textContent = `${scores.tie}`;
    gameResultBanner.className = 'game-banner result-tie';
    gameResultText.textContent = `Seri! Keduanya memilih ${userGesture}.`;
  } else if (
    (userGesture === 'Batu' && botChoice.name === 'Gunting') ||
    (userGesture === 'Gunting' && botChoice.name === 'Kertas') ||
    (userGesture === 'Kertas' && botChoice.name === 'Batu')
  ) {
    scores.win++;
    scoreWinEl.textContent = `${scores.win}`;
    gameResultBanner.className = 'game-banner result-win';
    gameResultText.textContent = `Kamu Menang! ${userGesture} mengalahkan ${botChoice.name}!`;
  } else {
    scores.lose++;
    scoreLoseEl.textContent = `${scores.lose}`;
    gameResultBanner.className = 'game-banner result-lose';
    gameResultText.textContent = `Kamu Kalah! ${botChoice.name} mengalahkan ${userGesture}.`;
  }

  gameResultBanner.classList.remove('hidden');
  isPlayingRound = false;
  btnPlayRound.disabled = false;
  gameCountdown.textContent = 'VS';
}
