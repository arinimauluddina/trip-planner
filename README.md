# ✈️ Trip Plan App

Aplikasi perencanaan perjalanan wisata (Trip Planner) dengan arsitektur **Mobile-First**, menggunakan **Vue 3 + Vite + Tailwind CSS**, database **SQLite** (siap Capacitor untuk Android/iOS), serta fitur **Backup/Restore SQLite (.db)** dan **Import/Export Excel (.xlsx)**.

---

## 🛠️ Tech Stack
- **Framework:** Vue 3 (Composition API `<script setup>`) + Vite
- **Styling:** Tailwind CSS (Mobile-first responsive, custom travel colors)
- **State Management:** Pinia
- **Routing:** Vue Router (Hash history mode untuk kompabilitas native Capacitor)
- **Database:** SQLite via `@capacitor-community/sqlite` (otomatis fallback ke web local store saat testing di browser)
- **Drag & Drop:** `vuedraggable` (SortableJS)
- **Excel Export/Import:** `xlsx` (SheetJS)
- **Mobile Wrapper:** Capacitor v6 (Android & iOS ready)

---

## 🚀 Cara Menjalankan (Local Development)

### 1. Buka Terminal
Pastikan kamu berada di folder project:
```bash
cd /Users/arini/Documents/Project/trip-plan
```

### 2. Install Dependencies
Jalankan perintah ini sekali untuk menginstall semua library yang dibutuhkan:
```bash
npm install
```

### 3. Jalankan Dev Server
```bash
npm run dev
```

Terminal akan menampilkan URL lokal, biasanya:
```
  VITE v5.2.0  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Buka browser kamu dan akses: **`http://localhost:5173`** 🎉

---

## 📱 Cara Convert & Jalankan di Mobile (Capacitor)

Setelah aplikasinya siap dan ingin dijadikan aplikasi Android / iOS:

### 1. Build Web Assets
```bash
npm run build
```

### 2. Tambah Platform (Android / iOS)
```bash
# Untuk Android:
npm run cap:android

# Untuk iOS (khusus macOS dengan Xcode):
npm run cap:ios
```

### 3. Sinkronisasi Perubahan
Setiap kali selesai mengubah kode dan menjalankan `npm run build`:
```bash
npm run cap:sync
```

### 4. Buka di IDE Native
```bash
# Buka di Android Studio
npm run cap:open:android

# Buka di Xcode
npm run cap:open:ios
```

---

## 💾 Fitur Backup & Restore

Di navigasi atas terdapat tombol **💾 Backup**:
1. **Export file .db (SQLite):** Mengunduh backup database lokal dalam bentuk file `.db`.
2. **Import file .db:** Mengembalikan data dari file backup `.db`.
3. **Export Excel:** Mengekspor trip aktif ke format `.xlsx` dengan 3 sheet:
   - Sheet 1: **Ringkasan Trip**
   - Sheet 2: **Destinasi & Rincian Biaya per Kategori**
   - Sheet 3: **Rundown / Itinerary harian**
4. **Import Excel:** Mengunggah file `.xlsx` untuk dibaca datanya ke dalam aplikasi.

