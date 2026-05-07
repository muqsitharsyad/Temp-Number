# Temp Number — Free SMS Receiver

Aplikasi web super-ringan untuk mendapatkan **nomor temporary** dan **menerima SMS/OTP** dari berbagai sumber publik gratis (multi-source aggregator).

> ⚠️ **Peringatan keras**: nomor yang ditampilkan adalah nomor PUBLIK — siapa saja bisa melihat SMS yang masuk. **Jangan** dipakai untuk verifikasi akun penting (bank, e-wallet, email utama). Cocok untuk: trial signup, testing, akun sekali-pakai.

## Fitur
- 🌍 Multi-source: `receive-smss.com`, `receive-sms-free.cc`, `sms24.me` (resilient — kalau 1 down, lainnya jalan).
- 🔍 Filter berdasarkan sumber, negara, dan keyword.
- 📥 Inbox auto-refresh tiap 10 detik.
- 🔑 OTP otomatis terdeteksi & ditandai (4–8 digit).
- 📋 Copy nomor / copy OTP 1 klik.
- 🌙 Dark mode, responsive (mobile-friendly).
- ⚡ In-memory cache (60s untuk daftar nomor, 10s untuk inbox) → hemat bandwidth & cepat.
- 🪶 Hanya 3 dependency npm: `express`, `axios`, `cheerio`.

## Cara menjalankan (lokal)

Butuh Node.js ≥ 18.

```bash
npm install
npm start
```

Buka [http://localhost:3000](http://localhost:3000).

## Endpoint API

| Endpoint | Deskripsi |
|----------|-----------|
| `GET /api/providers` | Daftar source aktif |
| `GET /api/numbers` | Semua nomor (gabungan) |
| `GET /api/numbers?provider=sms24` | Nomor dari satu source |
| `GET /api/messages?provider=...&number=...` | Inbox SMS untuk nomor |
| `GET /api/health` | Status tiap source |

## Deploy

### Render (rekomendasi — gratis)
1. Push repo ini ke GitHub.
2. Di [render.com](https://render.com): New → Web Service → connect repo.
3. Build command: `npm install` · Start command: `npm start`.
4. Selesai.

### Railway / Fly.io
Sama saja — auto-detect Node.js. Pastikan port pakai `process.env.PORT`.

### Vercel
Bisa juga, tapi cocokkan jadi serverless function. Untuk kesederhanaan, prefer Render/Railway.

## Catatan teknis

- Beberapa situs sumber kadang ganti layout; kalau salah satu return 0 nomor, scraper lain masih jalan. Update parser di `scrapers.js` jika perlu.
- User-Agent disetel seperti browser untuk hindari block sederhana.
- Tidak menyimpan data user; semua proxy real-time + cache pendek.
- Indonesia (+62) gratis sangat jarang di sumber publik; mayoritas US/UK/Rusia/Filipina/Kanada/India.

## Struktur file

```
.
├── package.json
├── server.js        # Express app + endpoints
├── scrapers.js      # Modul scraper per sumber
├── frontend.js      # HTML + client-side JS (inline)
├── cache.js         # TTL in-memory cache
├── utils.js         # Helper: flag, country code, OTP regex
└── README.md
```

## Lisensi
MIT — gunakan dengan bertanggung jawab.
