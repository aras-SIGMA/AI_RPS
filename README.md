# HandTrack - Batu, Kertas, Gunting AI

Web app deteksi gerakan tangan real-time langsung di browser. Akses kamera, tunjukkan simbol **Batu**, **Gunting**, atau **Kertas**, dan model AI akan mengenalinya secara otomatis lewat 21 titik sendi tangan.

Dibangun dengan Vite + TypeScript (vanilla) dan Google MediaPipe Tasks Vision.

## Fitur

- Deteksi tangan real-time via webcam (MediaPipe Hand Landmarker, hingga 2 tangan).
- Klasifikasi simbol Batu / Gunting / Kertas berbasis geometri 21 landmark.
- Deteksi status terbuka/tertekuk per jari (jempol, telunjuk, tengah, manis, kelingking).
- Overlay skeleton tangan di atas video dengan warna dinamis mengikuti gestur.
- Stabilisasi hasil klasifikasi dengan rolling majority-vote buffer.
- Toggle Mirror dan Skeleton pada tampilan kamera.
- Mini game 1 vs 1 melawan bot AI dengan papan skor.
- Model AI dan WASM dijalankan lokal (tanpa CDN saat runtime).

## Teknologi

- Vite 8
- TypeScript
- Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision`)
- HTML5 Canvas API

## Prasyarat

- Node.js 20+ (disarankan 22+)
- Browser modern dengan dukungan WebAssembly dan WebGL (Chrome / Edge / Firefox terbaru)
- Kamera dan koneksi HTTPS atau `localhost`

## Instalasi

```bash
npm install
```

## Menjalankan

Mode development:

```bash
npm run dev
```

Buka URL yang ditampilkan (default `http://localhost:5173`), izinkan akses kamera, lalu klik **Nyalakan Kamera**.

Build produksi:

```bash
npm run build
```

Pratinjau hasil build:

```bash
npm run preview
```

## Cara Pakai

1. Klik **Nyalakan Kamera** dan berikan izin webcam.
2. Posisikan telapak tangan sekitar 40–70 cm di depan kamera.
3. Buat salah satu simbol:
   - **Batu** - semua jari tertekuk membentuk kepalan.
   - **Gunting** - telunjuk dan jari tengah terbuka, sisanya tertekuk.
   - **Kertas** - kelima jari terbuka lurus.
4. Hasil identifikasi, tingkat keyakinan, dan status per jari tampil di panel kanan.
5. Untuk bermain, klik **Main ronde**, buat simbol saat hitungan mundur selesai, lalu lihat hasilnya melawan bot.

## Struktur Proyek

```
Batu_Kertas_Gunting/
├── index.html              # Markup UI
├── public/
│   ├── models/
│   │   └── hand_landmarker.task   # Model MediaPipe Hand Landmarker
│   └── wasm/               # Runtime WebAssembly MediaPipe
├── src/
│   ├── main.ts             # Entry point, binding UI, loop deteksi, logika game
│   ├── detector.ts         # Inisialisasi MediaPipe + pipeline webcam
│   ├── classifier.ts       # Klasifikasi gestur dari landmark
│   ├── visualizer.ts       # Render skeleton tangan ke canvas
│   ├── icons.ts            # Definisi ikon SVG
│   └── style.css           # Styling aplikasi
├── package.json
└── tsconfig.json
```

## Cara Kerja Klasifikasi

Landmark tangan diekstrak (21 titik), lalu status tiap jari ditentukan dengan membandingkan jarak Euclidean antara ujung jari, sendi PIP, dan MCP terhadap pergelangan tangan. Perbandingan ini relatif sehingga tahan terhadap rotasi dan jarak tangan.

Aturan:
- **Kertas** - telunjuk, tengah, manis, kelingking terbuka.
- **Gunting** - telunjuk dan tengah terbuka, manis dan kelingking tertekuk.
- **Batu** - keempat jari tertekuk.
- Selain itu - dianggap tidak diketahui.

Hasil mentah disaring dengan buffer riwayat (majority voting) untuk mencegah label berkedip.

## Lisensi

Proyek pribadi. Model dan runtime MediaPipe tunduk pada lisensi Google MediaPipe.
