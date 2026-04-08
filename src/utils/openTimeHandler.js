// utils/operationalHoursHelper.js
const DEFAULT_TIMEZONE = 'Asia/Jakarta';

export function getOpenStatusAndClosingTime(operationalHours) {
  const now = new Date();

  // Formatter dengan timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(now);

  const currentDay = parts.find(p => p.type === 'weekday')?.value;
  const currentHour = Number(parts.find(p => p.type === 'hour')?.value);
  const currentMinute = Number(parts.find(p => p.type === 'minute')?.value);

  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const hoursString = operationalHours?.[currentDay];

  // OFF DAY / tidak ada jadwal
  if (!hoursString || hoursString === 'OFF DAY') {
    return {
      is_open: false,
      closing_time_server: null,
      current_day: currentDay,
    };
  }

  const [openTimeStr, closeTimeStr] = hoursString.split('-');
  const [openH, openM] = openTimeStr.split(':').map(Number);
  const [closeH, closeM] = closeTimeStr.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;

  const crossMidnight = closeMinutes < openMinutes;
  if (crossMidnight) closeMinutes += 1440;

  const isOpen =
    currentTimeMinutes >= openMinutes &&
    currentTimeMinutes < closeMinutes;

  if (!isOpen) {
    return {
      is_open: false,
      closing_time_server: null,
      current_day: currentDay,
    };
  }

  // Hitung closing time ISO (server time)
  const nowInTZ = new Date(
    now.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE })
  );

  const closingDate = new Date(
    nowInTZ.getFullYear(),
    nowInTZ.getMonth(),
    nowInTZ.getDate(),
    closeH,
    closeM,
    0
  );

  if (crossMidnight) closingDate.setDate(closingDate.getDate() + 1);

  return {
    is_open: true,
    closing_time_server: closingDate.toISOString(),
    current_day: currentDay,
  };
}

export function getStockInfo(stock, policyLimit = 10) {
  const is_available = stock > 0;
  const max_quantity = Math.min(stock, policyLimit);

  let stock_status;
  if (stock <= 0) stock_status = 'OUT OF STOCK';
  else if (stock <= 5) stock_status = 'LOW';
  else stock_status = 'AVAILABLE';

  let stock_label;
  if (stock <= 0) stock_label = 'Stok habis';
  else if (stock <= 5) stock_label = `Tersisa ${stock} lagi`;
  else stock_label = null;

  return {
    is_available,
    max_quantity,
    stock_status,
    stock_label,
  };
}

/**
 * Menggabungkan 'notes' dan semua 'options' menjadi satu string format, 
 * mempertahankan spasi pada label opsi.
 * * @param {string | null} notes - Catatan tambahan untuk item pesanan.
 * @param {Array<Object>} options - Array objek opsi.
 * @returns {string} String yang sudah diformat dan digabungkan.
 */
export function formatNotesAndOptions(notes, options) {
    const parts = [];
    const notesPart = []; // Array sementara untuk menyimpan Notes

    // 1. Tambahkan Options (Dulu)
    if (Array.isArray(options) && options.length > 0) {
        options.forEach(option => {
            if (option.label && option.value) {
                // Tambahkan Opsi ke array 'parts' utama
                parts.push(`${option.label}: ${option.value}`);
            }
        });
    }

    // 2. Tambahkan Notes (Nanti)
    if (notes && typeof notes === 'string' && notes.trim().length > 0) {
        // Simpan Notes ke array sementara 'notesPart' dengan format yang diinginkan
        notesPart.push(`Notes: ${notes.trim()}`);
    }
    
    // 3. Gabungkan Options (parts) dan Notes (notesPart)
    // Gunakan fungsi spread (...) untuk menggabungkan kedua array
    const finalParts = [...parts, ...notesPart];

    // 4. Gabungkan semua bagian dengan koma dan spasi
    return finalParts.join(', ');
}

// Fungsi "Magic" untuk hitung distribusi bintang dari rating & total
export function calculateStarDistribution (rating, totalReviews) {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (!totalReviews || totalReviews <= 0) return dist;

  // Logika pembobotan (bisa kamu sesuaikan persentasenya)
  if (rating >= 4.5) {
    dist[5] = Math.round(totalReviews * 0.70);
    dist[4] = Math.round(totalReviews * 0.20);
    dist[3] = Math.round(totalReviews * 0.05);
    dist[2] = Math.round(totalReviews * 0.03);
    dist[1] = totalReviews - (dist[5] + dist[4] + dist[3] + dist[2]);
  } else if (rating >= 4.0) {
    dist[5] = Math.round(totalReviews * 0.50);
    dist[4] = Math.round(totalReviews * 0.30);
    dist[3] = Math.round(totalReviews * 0.10);
    dist[2] = Math.round(totalReviews * 0.06);
    dist[1] = totalReviews - (dist[5] + dist[4] + dist[3] + dist[2]);
  } else {
    // Default bagi rata kalau rating rendah
    const perStar = Math.floor(totalReviews / 5);
    dist[5] = dist[4] = dist[3] = dist[2] = perStar;
    dist[1] = totalReviews - (perStar * 4);
  }
  return dist;
};