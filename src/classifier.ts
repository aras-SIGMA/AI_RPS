import { SVG_ICONS } from './icons';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type GestureType = 'Batu' | 'Gunting' | 'Kertas' | 'Tidak Diketahui';

export interface FingerStates {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

export interface ClassificationResult {
  gesture: GestureType;
  confidence: number;
  fingers: FingerStates;
  icon: string;
}

function euclideanDistance(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Deteksi status keterbukaan masing-masing jari.
 * Menggunakan perbandingan jarak Euclidean invariant terhadap rotasi tangan.
 */
export function getFingerStates(landmarks: Landmark[]): FingerStates {
  const wrist = landmarks[0];

  // Helper cek jari (Index, Middle, Ring, Pinky)
  const isFingerOpen = (tipIdx: number, pipIdx: number, mcpIdx: number): boolean => {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];

    const distWristTip = euclideanDistance(wrist, tip);
    const distWristPip = euclideanDistance(wrist, pip);
    const distMcpTip = euclideanDistance(mcp, tip);
    const distMcpPip = euclideanDistance(mcp, pip);

    // Jari terbuka jika ujung jari menjauh dari pergelangan dan MCP
    return distWristTip > distWristPip * 1.05 && distMcpTip > distMcpPip * 1.15;
  };

  const indexOpen = isFingerOpen(8, 6, 5);
  const middleOpen = isFingerOpen(12, 10, 9);
  const ringOpen = isFingerOpen(16, 14, 13);
  const pinkyOpen = isFingerOpen(20, 18, 17);

  // Jempol (Thumb): periksa jarak ujung jempol (4) ke pangkal kelingking (17) vs IP jempol (3) ke (17)
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const pinkyMcp = landmarks[17];
  const indexMcp = landmarks[5];

  const distThumbPinky = euclideanDistance(thumbTip, pinkyMcp);
  const distIpPinky = euclideanDistance(thumbIp, pinkyMcp);
  const distThumbIndex = euclideanDistance(thumbTip, indexMcp);

  // Terbuka jika ujung jempol menjauhi pangkal kelingking dan pergelangan
  const thumbOpen =
    distThumbPinky > distIpPinky * 1.15 &&
    distThumbIndex > euclideanDistance(landmarks[2], indexMcp) * 0.9;

  return {
    thumb: thumbOpen,
    index: indexOpen,
    middle: middleOpen,
    ring: ringOpen,
    pinky: pinkyOpen,
  };
}

// Buffer stabilisasi gestur (rolling history majority vote)
const historyBuffer: GestureType[] = [];
const BUFFER_SIZE = 6;

export function classifyGesture(landmarks: Landmark[]): ClassificationResult {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: 'Tidak Diketahui',
      confidence: 0,
      fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
      icon: SVG_ICONS.Search,
    };
  }

  const fingers = getFingerStates(landmarks);
  let rawGesture: GestureType = 'Tidak Diketahui';

  // Logika Klasifikasi:
  // 1. Kertas (Paper): Minimal 4 jari terbuka (termasuk telunjuk, tengah, manis, kelingking)
  if (fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
    rawGesture = 'Kertas';
  }
  // 2. Gunting (Scissors): Telunjuk dan tengah terbuka, manis dan kelingking tertekuk
  else if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
    rawGesture = 'Gunting';
  }
  // 3. Batu (Rock): Keempat jari non-jempol tertekuk
  else if (!fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
    rawGesture = 'Batu';
  } else {
    rawGesture = 'Tidak Diketahui';
  }

  // Rolling buffer untuk stabilisasi output
  historyBuffer.push(rawGesture);
  if (historyBuffer.length > BUFFER_SIZE) {
    historyBuffer.shift();
  }

  // Hitung suara terbanyak (majority voting)
  const counts: Record<string, number> = {};
  for (const g of historyBuffer) {
    counts[g] = (counts[g] || 0) + 1;
  }

  let finalGesture: GestureType = rawGesture;
  let maxCount = 0;
  for (const [g, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      finalGesture = g as GestureType;
    }
  }

  const confidence = Math.round((maxCount / historyBuffer.length) * 100);

  const iconMap: Record<GestureType, string> = {
    Batu: SVG_ICONS.Batu,
    Gunting: SVG_ICONS.Gunting,
    Kertas: SVG_ICONS.Kertas,
    'Tidak Diketahui': SVG_ICONS.Search,
  };

  return {
    gesture: finalGesture,
    confidence,
    fingers,
    icon: iconMap[finalGesture],
  };
}
