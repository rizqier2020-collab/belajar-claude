'use strict';

/* ============================================================
   Aplikasi Invoice — logika (vanilla JS, tanpa dependency)
   ============================================================ */

const STORAGE_KEY = 'invoice-app:data:v1';

/* ---------- Contoh data (mengikuti invoice referensi) ---------- */
const EXAMPLE = {
  fromName: 'PT. Jasa Ferrie Pratama',
  fromAddress: '',
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
  fromName: '', fromAddress: '', invoiceNo: '', invoiceDate: '', dueDays: '14',
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
  return data;
}

function fillData(data) {
  form.querySelectorAll('[name]').forEach(el => {
    if (data[el.name] !== undefined) el.value = data[el.name];
  });
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

  // Header / from
  setText('p-fromName', data.fromName || '—');
  setText('p-fromAddress', data.fromAddress);
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
