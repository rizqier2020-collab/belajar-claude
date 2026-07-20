'use strict';

/* ============================================================
   Aplikasi Invoice — logika (vanilla JS, tanpa dependency)
   ============================================================ */

const STORAGE_KEY = 'invoice-app:data:v1';

/* Logo contoh: perkiraan lambang kotak-kotak oranye (bisa diganti via upload) */
const SAMPLE_LOGO = (() => {
  const sq = [[54, 0], [81, 0], [54, 27], [81, 27], [27, 54], [54, 54], [0, 81], [27, 81]];
  const rects = sq.map(([x, y]) =>
    `<rect x='${x}' y='${y}' width='23' height='23' fill='none' stroke='#f5851f' stroke-width='2.6'/>`).join('');
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='106' height='106' viewBox='0 0 106 106'>${rects}</svg>`);
})();

/* ---------- Contoh data (mengikuti kop surat & invoice referensi) ---------- */
const EXAMPLE = {
  logoDataUrl: SAMPLE_LOGO,
  fromName: 'PT. JASA FERRIE PRATAMA',
  tagline: 'ARCHITECTURE CONSULTANT',
  brandColor: '#f5851f',
  fromAddress: 'WISMA YAKYF, Lantai 2 Jl. Hj. Tutty Alawiyah\nNo. 99 Rt. 007 Rw. 005, Kalibata, Pancoran Jakarta Selatan 12740',
  fromPhone: '+62 813 1818 299',
  fromEmail: 'mail@jfp.co.id',
  fromWeb: '',
  invoiceNo: 'J/26-VI/18',
  invoiceDate: '17 Juni 2026',
  dueDays: '14',
  toName: 'PT. Affinity Health Indonesia',
  toName2: 'RS. Premier Jatinegara',
  toAddress: 'Jl. Raya Jatinegara Timur No. 85-87\nJakarta 13310',
  attnName: 'dr. Yustinus Hendry Yogatama, MM',
  attnTitle: 'Director',
  projectRef: '32504 : RS. PREMIER JATINEGARA : SUMUR RESAPAN : JAKARTA',
  contractDate: '29 Agustus 2025',
  contractNo: '32504/JFP-RSPJ/043/VIII/2025',
  intro: '',
  contractTotal: '66500000',
  ppnRate: '11',
  signName: 'Ir. Noordian Moeloek, M.Sc',
  bankHolder: 'PT. JASA FERRIE PRATAMA',
  bankAccount: '0011812342',
  bankName: 'PT. Bank Negara Indonesia (Persero) Tbk',
  bankBranch: 'Cabang Dukuh Bawah-Capem Setiabudi\nJalan HR. Rasuna Said Kav. 62\nJakarta 12920',
  items: [
    { desc: '20% berkala masa konstruksi', amount: '13300000' }
  ]
};

const EMPTY = {
  logoDataUrl: '',
  fromName: '', tagline: '', brandColor: '#f5851f',
  fromAddress: '', fromPhone: '', fromEmail: '', fromWeb: '',
  invoiceNo: '', invoiceDate: '', dueDays: '14',
  toName: '', toName2: '', toAddress: '', attnName: '', attnTitle: '',
  projectRef: '', contractDate: '', contractNo: '', intro: '',
  contractTotal: '', ppnRate: '11', signName: '',
  bankHolder: '', bankAccount: '', bankName: '', bankBranch: '',
  items: [{ desc: '', amount: '' }]
};

/* ---------- Util: format & terbilang ---------- */
function toNumber(v) {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatRp(n) {
  const rounded = Math.round(toNumber(n));
  return 'Rp ' + rounded.toLocaleString('id-ID') + ',-';
}

/* Angka -> kata (Bahasa Indonesia), mendukung sampai triliunan */
function terbilang(angka) {
  angka = Math.floor(Math.abs(toNumber(angka)));
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
    'sepuluh', 'sebelas'];

  function toWords(n) {
    n = Math.floor(n);
    if (n < 12) return satuan[n];
    if (n < 20) return toWords(n - 10).trim() + ' belas';
    if (n < 100) return (toWords(Math.floor(n / 10)) + ' puluh ' + toWords(n % 10)).trim();
    if (n < 200) return ('seratus ' + toWords(n - 100)).trim();
    if (n < 1000) return (toWords(Math.floor(n / 100)) + ' ratus ' + toWords(n % 100)).trim();
    if (n < 2000) return ('seribu ' + toWords(n - 1000)).trim();
    if (n < 1000000) return (toWords(Math.floor(n / 1000)) + ' ribu ' + toWords(n % 1000)).trim();
    if (n < 1000000000) return (toWords(Math.floor(n / 1000000)) + ' juta ' + toWords(n % 1000000)).trim();
    if (n < 1000000000000) return (toWords(Math.floor(n / 1000000000)) + ' miliar ' + toWords(n % 1000000000)).trim();
    return (toWords(Math.floor(n / 1000000000000)) + ' triliun ' + toWords(n % 1000000000000)).trim();
  }

  if (angka === 0) return 'nol rupiah';
  const words = toWords(angka).replace(/\s+/g, ' ').trim();
  return words + ' rupiah';
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* ---------- State & DOM refs ---------- */
const form = document.getElementById('invoice-form');
const itemsContainer = document.getElementById('items');

/* Logo disimpan sebagai data URL di luar FormData */
let logoDataUrl = '';

function updateLogoUI() {
  const wrap = document.getElementById('logo-preview-wrap');
  const img = document.getElementById('logo-preview');
  if (logoDataUrl) {
    img.src = logoDataUrl;
    wrap.hidden = false;
  } else {
    img.removeAttribute('src');
    wrap.hidden = true;
  }
}

/* ---------- Line items ---------- */
function addItemRow(desc = '', amount = '') {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `
    <input type="text" class="item-desc" placeholder="Deskripsi tagihan" />
    <input type="number" class="item-amount" min="0" step="1" placeholder="0" />
    <button type="button" class="item-del" title="Hapus baris">&times;</button>`;
  row.querySelector('.item-desc').value = desc;
  row.querySelector('.item-amount').value = amount;
  row.querySelector('.item-desc').addEventListener('input', render);
  row.querySelector('.item-amount').addEventListener('input', render);
  row.querySelector('.item-del').addEventListener('click', () => {
    row.remove();
    if (!itemsContainer.querySelector('.item-row')) addItemRow();
    render();
  });
  itemsContainer.appendChild(row);
}

function readItems() {
  return [...itemsContainer.querySelectorAll('.item-row')].map(r => ({
    desc: r.querySelector('.item-desc').value,
    amount: r.querySelector('.item-amount').value
  }));
}

/* ---------- Read / write whole form ---------- */
function readData() {
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  // FormData misses empty textareas sometimes; ensure all named fields captured
  form.querySelectorAll('[name]').forEach(el => { data[el.name] = el.value; });
  data.items = readItems();
  data.logoDataUrl = logoDataUrl;
  return data;
}

function fillData(data) {
  form.querySelectorAll('[name]').forEach(el => {
    if (data[el.name] !== undefined) el.value = data[el.name];
  });
  logoDataUrl = data.logoDataUrl || '';
  updateLogoUI();
  itemsContainer.innerHTML = '';
  const items = (data.items && data.items.length) ? data.items : [{ desc: '', amount: '' }];
  items.forEach(it => addItemRow(it.desc, it.amount));
}

/* ---------- Compute ---------- */
function compute(data) {
  const subtotal = (data.items || []).reduce((s, it) => s + toNumber(it.amount), 0);
  const ppnRate = toNumber(data.ppnRate);
  const ppn = subtotal * ppnRate / 100;
  const total = subtotal + ppn;
  return { subtotal, ppnRate, ppn, total };
}

/* ---------- Default intro text ---------- */
function buildIntro(data) {
  if (data.intro && data.intro.trim()) return data.intro.trim();
  const contract = [];
  if (data.contractDate) contract.push('tanggal ' + data.contractDate);
  if (data.contractNo) contract.push('No. ' + data.contractNo);
  const contractStr = contract.length ? ' (' + contract.join(', ') + ')' : '';
  const parties = [data.fromName, data.toName].filter(Boolean).join(' dan ');
  return `Menunjuk pada Perjanjian / Kontrak Penunjukan Konsultan` +
    (parties ? ` antara ${parties}` : '') + contractStr +
    `, bersama ini kami mengajukan tagihan sebagai berikut:`;
}

/* ---------- Render preview ---------- */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

function render() {
  const data = readData();
  const { subtotal, ppnRate, ppn, total } = compute(data);

  // Mini totals in form
  setText('mini-subtotal', formatRp(subtotal));
  setText('mini-ppn', formatRp(ppn));
  setText('mini-total', formatRp(total));

  // Kop surat / letterhead
  document.getElementById('p-letterhead').style.setProperty('--lh-accent', data.brandColor || '#f5851f');
  const logoEl = document.getElementById('p-logo');
  if (logoDataUrl) { logoEl.src = logoDataUrl; logoEl.hidden = false; }
  else { logoEl.removeAttribute('src'); logoEl.hidden = true; }
  setText('p-fromName', data.fromName || '—');
  const taglineEl = document.getElementById('p-tagline');
  taglineEl.textContent = data.tagline || '';
  taglineEl.style.display = data.tagline ? '' : 'none';
  setText('p-fromAddress', data.fromAddress);
  const contactsEl = document.getElementById('p-contacts');
  const contacts = [];
  if (data.fromPhone) contacts.push('Telp/WA: ' + data.fromPhone);
  if (data.fromEmail) contacts.push('e-Mail: ' + data.fromEmail);
  if (data.fromWeb) contacts.push(data.fromWeb);
  contactsEl.innerHTML = contacts.map(c => `<span>${escapeHtml(c)}</span>`).join('');
  contactsEl.style.display = contacts.length ? '' : 'none';

  setText('p-invoiceNo', data.invoiceNo);
  setText('p-invoiceDate', data.invoiceDate);

  // Bill to
  setText('p-toName', data.toName);
  const toName2 = document.getElementById('p-toName2');
  toName2.textContent = data.toName2 || '';
  toName2.style.display = data.toName2 ? '' : 'none';
  setText('p-toAddress', data.toAddress);
  const attnEl = document.getElementById('p-attn');
  if (data.attnName || data.attnTitle) {
    attnEl.style.display = '';
    attnEl.innerHTML = '<span class="strong">Attn: </span>' +
      [data.attnName, data.attnTitle].filter(Boolean).join(' — ');
  } else {
    attnEl.style.display = 'none';
  }

  // Reference & intro
  const refWrap = document.querySelector('.invoice__ref');
  setText('p-projectRef', data.projectRef);
  refWrap.style.display = data.projectRef ? '' : 'none';
  setText('p-intro', buildIntro(data));

  // Items table
  const tbody = document.getElementById('p-items');
  tbody.innerHTML = '';
  // Optional "Total Kontrak" informational row
  if (toNumber(data.contractTotal) > 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>Total Kontrak</td><td class="num">${formatRp(data.contractTotal)}</td>`;
    tbody.appendChild(tr);
  }
  (data.items || []).forEach(it => {
    if (!it.desc && !toNumber(it.amount)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(it.desc)}</td><td class="num">${formatRp(it.amount)}</td>`;
    tbody.appendChild(tr);
  });

  // Totals
  setText('p-subtotal', formatRp(subtotal));
  setText('p-ppnLabel', `PPN ${ppnRate ? ppnRate + '%' : ''}`.trim());
  setText('p-ppn', formatRp(ppn));
  setText('p-total', formatRp(total));

  // Terbilang
  setText('p-terbilang', capitalize(terbilang(total)) + '.');

  // Terms
  const days = toNumber(data.dueDays);
  setText('p-terms', days > 0
    ? `Pembayaran harus dilakukan dalam waktu ${days} hari sejak tanggal faktur ini.`
    : '');

  // Bank & signature
  setText('p-bankHolder', data.bankHolder);
  setText('p-bankAccount', data.bankAccount ? 'Account No. : ' + data.bankAccount : '');
  setText('p-bankName', data.bankName);
  setText('p-bankBranch', data.bankBranch);
  setText('p-signCompany', data.bankHolder || data.fromName);
  setText('p-signName', data.signName);

  // Persist
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ---------- Load / actions ---------- */
function loadInitial() {
  let data = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) { /* ignore */ }
  fillData(data || EXAMPLE);
  render();
}

document.getElementById('btn-example').addEventListener('click', () => {
  fillData(EXAMPLE); render();
});
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Kosongkan semua isian?')) { fillData(EMPTY); render(); }
});
document.getElementById('btn-add-item').addEventListener('click', () => { addItemRow(); render(); });
document.getElementById('btn-print').addEventListener('click', () => window.print());

/* Logo upload */
document.getElementById('logo-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { alert('File harus berupa gambar.'); e.target.value = ''; return; }
  if (file.size > 1.5 * 1024 * 1024) {
    alert('Ukuran logo maksimal 1,5 MB agar tersimpan dengan baik. Silakan perkecil gambar.');
    e.target.value = ''; return;
  }
  const reader = new FileReader();
  reader.onload = () => { logoDataUrl = reader.result; updateLogoUI(); render(); };
  reader.readAsDataURL(file);
  e.target.value = '';
});
document.getElementById('btn-remove-logo').addEventListener('click', () => {
  logoDataUrl = ''; updateLogoUI(); render();
});

document.getElementById('btn-export').addEventListener('click', () => {
  const data = readData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'invoice-' + (data.invoiceNo || 'data').replace(/[^\w-]/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('file-import').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { fillData(JSON.parse(reader.result)); render(); }
    catch (err) { alert('File JSON tidak valid.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Re-render on any form input
form.addEventListener('input', render);

// Init
loadInitial();
