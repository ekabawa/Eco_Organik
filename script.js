// --- 1. STATE GLOBAL & DATA DEFAULT ---
// Data default alternatif kemasan makanan ramah lingkungan untuk pencarian rekomendasi terbaik
const DEFAULT_ALTERNATIVES = [
    // { id: "A1", name: "Kertas Food Grade", c1: 800, c2: 180, c3: 100, c4: 500, c5: 750, c6: 12 },
    // { id: "A2", name: "Bagasse (Ampas Tebu)", c1: 1500, c2: 90, c3: 120, c4: 1000, c5: 1000, c6: 20 },
    // { id: "A3", name: "Daun Pisang", c1: 500, c2: 45, c3: 80, c4: 400, c5: 500, c6: 10 },
    // { id: "A4", name: "Pelepah Pinang", c1: 2000, c2: 150, c3: 150, c4: 1200, c5: 1200, c6: 25 },
    // { id: "A5", name: "PLA (Polylactic Acid)", c1: 1800, c2: 365, c3: 60, c4: 800, c5: 1000, c6: 18 }
];

const DEFAULT_CRITERIA = [
    { id: "c1", name: "Harga", desc: "Biaya per unit kemasan (Rp)", weight: 20, type: "cost" },
    { id: "c2", name: "Waktu Terurai", desc: "Lama biodegradasi (Hari)", weight: 25, type: "cost" },
    { id: "c3", name: "Ketahanan Panas", desc: "Suhu maksimal aman (°C)", weight: 20, type: "benefit" },
    { id: "c4", name: "Kapasitas Beban", desc: "Beban maksimal (Gram)", weight: 10, type: "benefit" },
    { id: "c5", name: "Kapasitas Volume", desc: "Volume tampung (ml)", weight: 15, type: "benefit" },
    { id: "c6", name: "Berat Kemasan", desc: "Berat kosong kemasan (Gram)", weight: 10, type: "cost" }
];

let alternatives = JSON.parse(JSON.stringify(DEFAULT_ALTERNATIVES));
let criteria = JSON.parse(JSON.stringify(DEFAULT_CRITERIA));
let results = null; // Menyimpan hasil akhir perhitungan SAW
let myChart = null; // Menyimpan instance objek chart Chart.js

function getUnit(desc) {
    if (!desc) return "";
    const match = desc.match(/\(([^)]+)\)$/);
    return match ? match[1] : "";
}

function formatC1Value(val) {
    const c1 = criteria.find(c => c.id === "c1");
    const unit = c1 ? getUnit(c1.desc) : "";
    if (unit.toLowerCase() === "rp" || unit.toLowerCase() === "rupiah") {
        return formatRupiah(val);
    }
    return unit ? `${unit} ${val.toLocaleString('id-ID')}` : val.toLocaleString('id-ID');
}

// --- 2. SELEKTOR ELEMEN DOM ---
const alternativeTbody = document.getElementById("alternative-tbody");
const btnAddAlternative = document.getElementById("btn-add-alternative");
const btnResetDefault = document.getElementById("btn-reset-default");
const btnResetAll = document.getElementById("btn-reset-all");
const btnCalculate = document.getElementById("btn-calculate");
const alternativeCountEl = document.getElementById("alternative-count");

const weightProgress = document.getElementById("weight-progress-bar");
const weightTotalBadge = document.getElementById("weight-total-badge");
const weightStatusText = document.getElementById("weight-status-text");
const validationWarning = document.getElementById("validation-warning");
const validationSuccess = document.getElementById("validation-success");

const resultsSection = document.getElementById("results-section");
const loadingOverlay = document.getElementById("loading-overlay");
const matrixTbody = document.getElementById("matrix-tbody");
const normTbody = document.getElementById("norm-tbody");
const prefTbody = document.getElementById("pref-tbody");
const rankTbody = document.getElementById("rank-tbody");
const conclusionText = document.getElementById("conclusion-text");
const calcStepsDetails = document.getElementById("calculation-steps-details");

const btnPrint = document.getElementById("btn-print");
const btnExportCsv = document.getElementById("btn-export-csv");

// Akordion Detail Perhitungan
const btnAccordion = document.getElementById("btn-accordion");
const accordionContent = document.getElementById("accordion-content");
const accordionIcon = document.getElementById("accordion-icon");

// --- 2.1 SISTEM NOTIFIKASI TOAST ---
// Fungsi untuk menampilkan pesan pop-up/toast kepada pengguna
function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");

    let bgClass = "bg-white dark:bg-slate-800 border-emerald-500 text-emerald-600 dark:text-emerald-400";
    let iconClass = "fa-solid fa-circle-check";

    if (type === "error") {
        bgClass = "bg-white dark:bg-slate-800 border-rose-500 text-rose-600 dark:text-rose-400";
        iconClass = "fa-solid fa-triangle-exclamation";
    } else if (type === "warning") {
        bgClass = "bg-white dark:bg-slate-800 border-amber-500 text-amber-600 dark:text-amber-500";
        iconClass = "fa-solid fa-circle-exclamation";
    } else if (type === "info") {
        bgClass = "bg-white dark:bg-slate-800 border-blue-500 text-blue-600 dark:text-blue-400";
        iconClass = "fa-solid fa-circle-info";
    }

    toast.className = `flex items-center gap-3 px-4 py-3.5 rounded-xl border-l-4 shadow-xl ${bgClass} font-semibold text-sm transition-all duration-300 transform translate-x-20 opacity-0 pointer-events-auto max-w-sm`;
    toast.innerHTML = `
        <i class="${iconClass} text-lg"></i>
        <div class="flex-grow">${message}</div>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2 focus:outline-none">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Memicu animasi transisi masuk
    setTimeout(() => {
        toast.classList.remove("translate-x-20", "opacity-0");
    }, 10);

    // Listener tombol tutup mandiri
    const closeBtn = toast.querySelector("button");
    closeBtn.addEventListener("click", () => {
        closeToast(toast);
    });

    // Menutup notifikasi secara otomatis setelah 4 detik
    setTimeout(() => {
        if (toast.parentNode) {
            closeToast(toast);
        }
    }, 4000);
}

// Fungsi untuk menutup notifikasi dengan efek transisi keluar
function closeToast(toast) {
    toast.classList.add("translate-x-20", "opacity-0");
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 300);
}

// --- 3. SWITCH TEMA (DARK MODE) ---
const themeToggleBtn = document.getElementById("theme-toggle");
const themeToggleIcon = document.getElementById("theme-toggle-icon");

// Inisialisasi tema saat halaman dimuat pertama kali berdasarkan preferensi sebelumnya
function initTheme() {
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleIcon.className = "fa-solid fa-sun text-lg";
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleIcon.className = "fa-solid fa-moon text-lg";
    }
}

// Event listener untuk tombol switch tema gelap/terang
themeToggleBtn.addEventListener("click", () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
        themeToggleIcon.className = "fa-solid fa-moon text-lg";
        showToast("Tema diubah ke Mode Terang", "info");
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
        themeToggleIcon.className = "fa-solid fa-sun text-lg";
        showToast("Tema diubah ke Mode Gelap", "info");
    }
    // Re-render visualisasi saat tema berubah
    if (results) {
        renderChart();
    }
});

// --- 4. MANAJEMEN DATA (CRUD ALTERNATIF) ---
// Fungsi untuk mem-render daftar data alternatif ke dalam tabel input
function renderAlternatives() {
    // Rebuild thead dinamis sesuai criteria saat ini
    const altTable = alternativeTbody.closest("table");
    if (altTable) {
        const thead = altTable.querySelector("thead tr");
        if (thead) {
            thead.innerHTML = `<th class="py-3.5 px-5 w-20">Kode</th><th class="py-3.5 px-5">Nama Kemasan</th>`;
            criteria.forEach(c => {
                const unit = getUnit(c.desc);
                const label = c.name + (unit ? ` (${unit})` : "");
                thead.innerHTML += `<th class="py-3.5 px-5 text-right">${label}</th>`;
            });
            thead.innerHTML += `<th class="py-3.5 px-5 text-center w-16">Aksi</th>`;
        }
    }

    alternativeTbody.innerHTML = "";
    alternativeCountEl.textContent = alternatives.length;

    alternatives.forEach((alt, index) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors";

        let criteriaCells = criteria.map(c => {
            const val = alt[c.id] !== undefined ? alt[c.id] : 0;
            return `<td class="py-3 px-6">
                <input type="number" min="0" value="${val}" data-field="${c.id}" data-index="${index}"
                    class="alt-input text-right w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1 font-medium"
                    placeholder="${c.name}">
            </td>`;
        }).join("");

        tr.innerHTML = `
            <td class="py-3 px-6 font-mono text-xs font-semibold text-slate-500">${alt.id}</td>
            <td class="py-3 px-6">
                <input type="text" value="${alt.name}" data-field="name" data-index="${index}"
                    class="alt-input w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1 text-slate-800 dark:text-slate-100 font-semibold"
                    placeholder="Nama Kemasan">
            </td>
            ${criteriaCells}
            <td class="py-3 px-6 text-center">
                <button data-index="${index}" class="btn-delete-alt text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all focus:outline-none" title="Hapus Alternatif">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        alternativeTbody.appendChild(tr);
    });

    document.querySelectorAll(".alt-input").forEach(input => {
        input.addEventListener("input", handleAlternativeInputChange);
    });

    document.querySelectorAll(".btn-delete-alt").forEach(btn => {
        btn.addEventListener("click", handleDeleteAlternative);
        if (alternatives.length <= 2) {
            btn.disabled = true;
            btn.classList.add("opacity-30", "cursor-not-allowed");
            btn.setAttribute("title", "Minimal tersisa 2 alternatif");
        }
    });
}

// Fungsi untuk menjana kode alternatif secara otomatis (contoh: K1, K2, dst)
function generateCode(currentIndex) {
    return "A" + (currentIndex + 1);
}

// Handler ketika ada perubahan nilai input pada tabel alternatif
function handleAlternativeInputChange(e) {
    const field = e.target.getAttribute("data-field");
    const idx = parseInt(e.target.getAttribute("data-index"));
    let val = e.target.value;

    // Nilai numerik kriteria tidak boleh bernilai negatif
    if (field !== "name") {
        val = val === "" ? 0 : parseFloat(val);
        if (val < 0) {
            val = 0;
            e.target.value = 0;
            showToast("Nilai kriteria tidak boleh bernilai negatif!", "warning");
        }
    }

    alternatives[idx][field] = val;

    // Memberikan indikasi border merah jika input nama kemasan kosong
    if (field === "name" && val.trim() === "") {
        e.target.classList.add("border-b-rose-500");
    } else if (field === "name") {
        e.target.classList.remove("border-b-rose-500");
    }
}

// Handler untuk menghapus baris alternatif
function handleDeleteAlternative(e) {
    if (alternatives.length <= 2) {
        showToast("Alternatif minimal 2 data, tidak bisa menghapus lebih banyak lagi!", "error");
        return;
    }

    const btn = e.currentTarget;
    const idx = parseInt(btn.getAttribute("data-index"));
    const removedName = alternatives[idx].name || alternatives[idx].id;

    alternatives.splice(idx, 1);

    // Urutkan ulang kode alternatif agar selalu sekuensial (K1, K2, dst)
    alternatives.forEach((alt, i) => {
        alt.id = generateCode(i);
    });

    renderAlternatives();
    showToast(`Alternatif "${removedName}" berhasil dihapus.`, "info");
}

// --- MODAL: TAMBAH ALTERNATIF ---
const modalAddAlt = document.getElementById("modal-add-alt");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalConfirmBtn = document.getElementById("modal-confirm-btn");
const modalError = document.getElementById("modal-error");
const modalErrorText = document.getElementById("modal-error-text");

function openAddModal() {
    // Build dynamic criteria inputs inside modal
    const container = document.getElementById("modal-criteria-container");
    container.innerHTML = "";
    criteria.forEach(c => {
        const unit = getUnit(c.desc);
        const label = c.name + (unit ? ` (${unit})` : "");
        container.innerHTML += `
        <div>
            <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                <i class="fa-solid fa-tag text-primary-500 mr-1"></i> ${label}
            </label>
            <input type="number" min="0" id="modal-input-${c.id}" value="0"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-primary-800 bg-slate-50 dark:bg-primary-950/50 text-slate-800 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="0">
        </div>`;
    });

    document.getElementById("modal-name").value = "";
    modalError.classList.add("hidden");

    // Wire Enter key on dynamic inputs
    container.querySelectorAll("input").forEach(inp => {
        inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); modalConfirmBtn.click(); }
        });
    });

    modalAddAlt.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("modal-name").focus(), 100);
}

function closeAddModal() {
    modalAddAlt.classList.add("hidden");
    document.body.style.overflow = "";
}

// Tombol Tambah di header tabel → buka modal
btnAddAlternative.addEventListener("click", openAddModal);

// Tombol Batal & X → tutup modal
modalCloseBtn.addEventListener("click", closeAddModal);
modalCancelBtn.addEventListener("click", closeAddModal);

// Klik backdrop → tutup modal
modalBackdrop.addEventListener("click", closeAddModal);

// Tombol Escape → tutup modal
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalAddAlt.classList.contains("hidden")) {
        closeAddModal();
    }
});

// Tombol Konfirmasi → validasi, tambah, render
modalConfirmBtn.addEventListener("click", () => {
    const name = document.getElementById("modal-name").value.trim();

    if (!name) {
        modalError.classList.remove("hidden");
        modalErrorText.textContent = "Nama kemasan tidak boleh kosong!";
        document.getElementById("modal-name").focus();
        return;
    }

    // Baca nilai tiap kriteria secara dinamis
    const newAlt = { id: generateCode(alternatives.length), name };
    let hasNegative = false;
    criteria.forEach(c => {
        const val = parseFloat(document.getElementById(`modal-input-${c.id}`)?.value) || 0;
        if (val < 0) hasNegative = true;
        newAlt[c.id] = val;
    });

    if (hasNegative) {
        modalError.classList.remove("hidden");
        modalErrorText.textContent = "Nilai kriteria tidak boleh negatif!";
        return;
    }

    modalError.classList.add("hidden");
    alternatives.push(newAlt);
    renderAlternatives();
    closeAddModal();
    showToast(`Alternatif "${name}" (${newAlt.id}) berhasil ditambahkan!`, "success");

    setTimeout(() => {
        const container = alternativeTbody.closest(".overflow-x-auto");
        if (container) container.scrollTop = container.scrollHeight;
    }, 100);
});

// Enter pada modal-name juga trigger
document.getElementById("modal-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); modalConfirmBtn.click(); }
});

// Event listener untuk mengembalikan data alternatif ke default awal
btnResetDefault.addEventListener("click", () => {
    alternatives = JSON.parse(JSON.stringify(DEFAULT_ALTERNATIVES));
    renderAlternatives();
    showToast("Data alternatif berhasil dikembalikan ke default bawaan.", "info");
});

// --- 5. MANAJEMEN KRITERIA (DYNAMIC CRUD) ---
// Counter untuk ID kriteria baru
let criteriaCounter = DEFAULT_CRITERIA.length;

// Render seluruh baris kriteria ke dalam #criteria-tbody
function renderCriteria() {
    const tbody = document.getElementById("criteria-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    // Update stat card jumlah kriteria
    const criteriaCountCard = document.querySelector("#section-criteria").closest("main")?.querySelector(".grid .text-2xl:not(#alternative-count)");

    criteria.forEach((c, idx) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors";
        const typeBenefit = c.type === "benefit";
        tr.innerHTML = `
            <td class="py-3 px-5 font-mono text-xs font-bold text-primary-600 dark:text-primary-400">${c.id.toUpperCase()}</td>
            <td class="py-3 px-5">
                <input type="text" value="${c.name}" data-cid="${c.id}" data-field="name"
                    class="crit-name-input w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1 text-sm font-semibold text-slate-800 dark:text-slate-100"
                    placeholder="Nama kriteria">
                <input type="text" value="${c.desc}" data-cid="${c.id}" data-field="desc"
                    class="crit-desc-input w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-0.5 text-xs text-slate-400 dark:text-slate-500 mt-0.5"
                    placeholder="Deskripsi (satuan dalam kurung, misal: (Rp))">
            </td>
            <td class="py-3 px-5 text-center">
                <select data-cid="${c.id}" class="crit-type-select text-xs font-bold rounded-full px-2.5 py-1 border focus:outline-none cursor-pointer
                    ${typeBenefit ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'}">
                    <option value="benefit" ${typeBenefit ? 'selected' : ''}>Benefit</option>
                    <option value="cost" ${!typeBenefit ? 'selected' : ''}>Cost</option>
                </select>
            </td>
            <td class="py-3 px-5">
                <div class="flex items-center gap-2">
                    <div class="flex-grow h-2 bg-slate-100 dark:bg-primary-900/40 rounded-full overflow-hidden">
                        <div class="h-full bg-primary-500 rounded-full transition-all duration-300" style="width:${c.weight}%" id="weight-bar-${c.id}"></div>
                    </div>
                    <input type="range" min="0" max="100" value="${c.weight}" data-cid="${c.id}" class="crit-weight-slider w-20 accent-primary-600 cursor-pointer">
                </div>
            </td>
            <td class="py-3 px-5 text-center">
                <input type="number" min="0" max="100" value="${c.weight}" data-cid="${c.id}"
                    class="crit-weight-input w-14 text-center rounded-lg border border-slate-200 dark:border-primary-800 bg-slate-50 dark:bg-primary-950/50 text-sm font-bold text-primary-700 dark:text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 py-1">
            </td>
            <td class="py-3 px-5 text-center">
                <button data-cid="${c.id}" class="btn-delete-crit text-rose-500 hover:text-rose-700 dark:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all focus:outline-none" title="Hapus Kriteria">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Wire events
    tbody.querySelectorAll(".crit-name-input, .crit-desc-input").forEach(inp => {
        inp.addEventListener("input", (e) => {
            const cid = e.target.dataset.cid;
            const field = e.target.dataset.field;
            const crit = criteria.find(c => c.id === cid);
            if (crit) {
                crit[field] = e.target.value.trim();
                renderAlternatives(); // update table headers
            }
        });
    });

    tbody.querySelectorAll(".crit-type-select").forEach(sel => {
        sel.addEventListener("change", (e) => {
            const cid = e.target.dataset.cid;
            const crit = criteria.find(c => c.id === cid);
            if (crit) {
                crit.type = e.target.value;
                // Update color classes
                const isBenefit = crit.type === "benefit";
                e.target.className = `crit-type-select text-xs font-bold rounded-full px-2.5 py-1 border focus:outline-none cursor-pointer ${isBenefit ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'}`;
                showToast(`${crit.name} diubah ke ${crit.type.toUpperCase()}`, "info");
                validateWeights();
            }
        });
    });

    tbody.querySelectorAll(".crit-weight-slider").forEach(slider => {
        slider.addEventListener("input", (e) => {
            const cid = e.target.dataset.cid;
            const val = parseInt(e.target.value) || 0;
            const crit = criteria.find(c => c.id === cid);
            if (crit) {
                crit.weight = val;
                // Sync number input & bar
                const row = e.target.closest("tr");
                if (row) {
                    const numInp = row.querySelector(".crit-weight-input");
                    if (numInp) numInp.value = val;
                    const bar = document.getElementById(`weight-bar-${cid}`);
                    if (bar) bar.style.width = `${val}%`;
                }
                validateWeights();
            }
        });
    });

    tbody.querySelectorAll(".crit-weight-input").forEach(inp => {
        inp.addEventListener("input", (e) => {
            const cid = e.target.dataset.cid;
            let val = parseInt(e.target.value) || 0;
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            e.target.value = val;
            const crit = criteria.find(c => c.id === cid);
            if (crit) {
                crit.weight = val;
                const bar = document.getElementById(`weight-bar-${cid}`);
                if (bar) bar.style.width = `${val}%`;
                // Sync slider
                const row = e.target.closest("tr");
                if (row) {
                    const sliderEl = row.querySelector(".crit-weight-slider");
                    if (sliderEl) sliderEl.value = val;
                }
                validateWeights();
            }
        });
    });

    tbody.querySelectorAll(".btn-delete-crit").forEach(btn => {
        btn.addEventListener("click", (e) => {
            if (criteria.length <= 1) {
                showToast("Minimal harus ada 1 kriteria!", "error");
                return;
            }
            const cid = btn.dataset.cid;
            const crit = criteria.find(c => c.id === cid);
            criteria = criteria.filter(c => c.id !== cid);
            renderCriteria();
            renderAlternatives();
            validateWeights();
            showToast(`Kriteria "${crit?.name || cid}" dihapus.`, "info");
        });
    });

    validateWeights();
}

// Tombol Tambah Kriteria
const btnAddCriteria = document.getElementById("btn-add-criteria");
if (btnAddCriteria) {
    btnAddCriteria.addEventListener("click", () => {
        criteriaCounter++;
        const newId = `c${criteriaCounter}`;
        criteria.push({ id: newId, name: `Kriteria ${criteriaCounter}`, desc: "", weight: 0, type: "benefit" });
        renderCriteria();
        renderAlternatives();
        validateWeights();
        showToast(`Kriteria "${newId.toUpperCase()}" berhasil ditambahkan!`, "success");
        // Scroll ke bawah tabel kriteria
        setTimeout(() => {
            const tb = document.getElementById("criteria-tbody");
            if (tb) tb.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
    });
}

// Mengatur warna teks dropdown secara dinamis sesuai jenis kriteria
function adjustSelectColor(select) {
    select.classList.remove("text-emerald-500", "dark:text-emerald-400", "text-rose-500", "dark:text-rose-400");
    if (select.value === "benefit") {
        select.classList.add("text-emerald-500", "dark:text-emerald-400");
    } else {
        select.classList.add("text-rose-500", "dark:text-rose-400");
    }
}

// Validasi total akumulasi bobot kriteria harus tepat bernilai 100%
function validateWeights() {
    const total = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

    weightTotalBadge.textContent = `${total}%`;
    weightProgress.style.width = `${Math.min(total, 100)}%`;

    weightProgress.className = "h-full transition-all duration-300 ";
    weightTotalBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold ";

    if (total === 100) {
        weightProgress.classList.add("bg-emerald-500");
        weightTotalBadge.classList.add("bg-emerald-100", "text-emerald-700", "dark:bg-emerald-950/40", "dark:text-emerald-400");
        weightStatusText.innerHTML = `<span class="text-emerald-500"><i class="fa-solid fa-check-double"></i> Pas 100%. Siap dihitung!</span>`;
        btnCalculate.disabled = false;
        validationWarning.classList.add("hidden");
        validationSuccess.classList.remove("hidden");
    } else {
        btnCalculate.disabled = true;
        validationSuccess.classList.add("hidden");
        validationWarning.classList.remove("hidden");

        if (total >= 90 && total < 100) {
            weightProgress.classList.add("bg-amber-500");
            weightTotalBadge.classList.add("bg-amber-100", "text-amber-700", "dark:bg-amber-950/40", "dark:text-amber-400");
            weightStatusText.innerHTML = `<span class="text-amber-500">Sisa ${100 - total}% lagi</span>`;
        } else {
            weightProgress.classList.add("bg-rose-500");
            weightTotalBadge.classList.add("bg-rose-100", "text-rose-700", "dark:bg-rose-950/40", "dark:text-rose-400");
            if (total > 100) {
                weightStatusText.innerHTML = `<span class="text-rose-500">Kelebihan ${total - 100}%!</span>`;
            } else {
                weightStatusText.innerHTML = `<span class="text-rose-500">Kurang ${100 - total}% lagi</span>`;
            }
        }
    }
}

// --- 6. RESET SEMUA PENGATURAN ---
btnResetAll.addEventListener("click", () => {
    alternatives = JSON.parse(JSON.stringify(DEFAULT_ALTERNATIVES));
    criteria = JSON.parse(JSON.stringify(DEFAULT_CRITERIA));
    criteriaCounter = DEFAULT_CRITERIA.length;
    results = null;

    renderAlternatives();
    renderCriteria();

    resultsSection.classList.add("hidden", "opacity-0", "transform", "translate-y-4");
    accordionContent.style.maxHeight = null;
    accordionIcon.style.transform = "rotate(0deg)";

    showToast("Seluruh pengaturan kriteria dan alternatif telah direset ke setelan awal.", "info");
});


// =========================================================================
// [METODE SAW] 7. ENGINE PERHITUNGAN SIMPLE ADDITIVE WEIGHTING (SAW)
// =========================================================================

// [SAW ENGINE] Fungsi Validasi & Trigger Utama Perhitungan SAW
function calculateSAW() {
    // 1. Validasi Kelengkapan Data Nama Alternatif
    let isValid = true;
    let firstEmptyIndex = -1;

    alternatives.forEach((alt, idx) => {
        if (!alt.name || alt.name.trim() === "") {
            isValid = false;
            firstEmptyIndex = idx;
        }
    });

    if (!isValid) {
        showToast(`Nama kemasan pada alternatif baris ke-${firstEmptyIndex + 1} tidak boleh kosong!`, "error");
        // Arahkan kursor fokus secara langsung ke input nama alternatif yang kosong
        const emptyInput = document.querySelector(`.alt-input[data-field="name"][data-index="${firstEmptyIndex}"]`);
        if (emptyInput) {
            emptyInput.focus();
            emptyInput.classList.add("border-b-rose-500");
        }
        return;
    }

    // 2. Validasi Jumlah Bobot Harus Tepat 100%
    const totalW = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalW !== 100) {
        showToast(`Kalkulasi gagal: Total bobot kriteria saat ini adalah ${totalW}%. Harus tepat 100%!`, "error");
        return;
    }

    // Tampilkan overlay pemrosesan data selama 800ms untuk efek UX yang dinamis dan halus
    loadingOverlay.classList.remove("hidden");

    setTimeout(() => {
        loadingOverlay.classList.add("hidden");
        performSAWLogic(); // Panggil fungsi logika utama perhitungan matematis SAW
        showToast("Perhitungan SPK SAW berhasil diselesaikan!", "success");
    }, 800);
}

// [SAW ENGINE] Fungsi Logika Utama Matematis SAW
function performSAWLogic() {
    // 1. Min/Max per kriteria
    const minVals = {};
    const maxVals = {};
    criteria.forEach(c => { minVals[c.id] = Infinity; maxVals[c.id] = -Infinity; });

    alternatives.forEach(alt => {
        criteria.forEach(c => {
            const val = alt[c.id] !== undefined ? Number(alt[c.id]) : 0;
            if (val < minVals[c.id]) minVals[c.id] = val;
            if (val > maxVals[c.id]) maxVals[c.id] = val;
        });
    });

    const normalizedData = [];
    const preferenceData = [];

    // 2. Normalisasi & Preferensi
    alternatives.forEach(alt => {
        const normObj = { id: alt.id, name: alt.name };
        const prefObj = { id: alt.id, name: alt.name };
        let totalPref = 0;

        criteria.forEach(c => {
            const val = alt[c.id] !== undefined ? Number(alt[c.id]) : 0;
            const weight = c.weight / 100;
            let normVal = 0;

            if (c.type === "benefit") {
                normVal = maxVals[c.id] === 0 ? 0 : val / maxVals[c.id];
            } else {
                normVal = val === 0 ? 0 : minVals[c.id] / val;
            }

            normObj[c.id] = normVal;
            const cellPref = weight * normVal;
            prefObj[c.id] = cellPref;
            totalPref += cellPref;
        });

        normObj.total = totalPref;
        prefObj.total = totalPref;
        normalizedData.push(normObj);
        preferenceData.push(prefObj);
    });

    // 3. Proses Perangkingan (Mengurutkan alternatif berdasarkan nilai preferensi total tertinggi ke terendah)
    const rankedData = [...preferenceData].sort((a, b) => b.total - a.total);

    // Simpan hasil perhitungan ke state global hasil
    results = {
        matrix: alternatives,
        minVals: minVals,
        maxVals: maxVals,
        normalized: normalizedData,
        preference: preferenceData,
        ranked: rankedData
    };

    // 4. Render tabel hasil kalkulasi SAW ke antarmuka pengguna (DOM)
    renderDecisionMatrix();      // Tampilkan Matriks Keputusan (X)
    renderNormalizationTable();  // Tampilkan Matriks Normalisasi (R)
    renderPreferenceTable();     // Tampilkan Matriks Perhitungan Preferensi (V)
    renderRankingTable();        // Tampilkan Tabel Urutan Perangkingan
    renderChart();               // Tampilkan Grafik Batang Visual
    renderConclusion();          // Tampilkan Rekomendasi Utama (Juara 1)
    renderDetailCalculations();  // Tampilkan Detail Langkah Perhitungan Aljabar

    // Tampilkan bagian hasil perhitungan dengan efek animasi transisi smooth
    resultsSection.classList.remove("hidden");
    setTimeout(() => {
        resultsSection.classList.remove("opacity-0", "translate-y-4");
        // Gulirkan layar secara otomatis menuju ke tampilan bagian hasil analisis
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// --- 8. FUNGSI RENDER TABEL & TAMPILAN INTERFACE ---

// Format angka ke format mata uang Rupiah (IDR) secara lokal
function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// Render isi tabel Matriks Keputusan (Data input awal)
function renderDecisionMatrix() {
    // Rebuild thead dynamically
    const matrixTable = matrixTbody.closest("table");
    if (matrixTable) {
        const thead = matrixTable.querySelector("thead tr");
        if (thead) {
            thead.innerHTML = `<th class="py-3 px-5 w-20">Kode</th><th class="py-3 px-5">Nama Kemasan</th>`;
            criteria.forEach(c => {
                const unit = getUnit(c.desc);
                thead.innerHTML += `<th class="py-3 px-5 text-right">${c.name}${unit ? ` (${unit})` : ""}</th>`;
            });
        }
    }

    matrixTbody.innerHTML = "";
    results.matrix.forEach(alt => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors";
        let cells = criteria.map((c, i) => {
            const val = alt[c.id] !== undefined ? alt[c.id] : 0;
            const unit = getUnit(c.desc);
            const unitStr = unit.toLowerCase() === "rp" || unit.toLowerCase() === "rupiah"
                ? formatRupiah(val)
                : (unit ? `${val.toLocaleString('id-ID')} ${unit}` : val.toLocaleString('id-ID'));
            return `<td class="py-3.5 px-6 text-right${i === 0 ? ' font-medium' : ''}">${unitStr}</td>`;
        }).join("");
        tr.innerHTML = `
            <td class="py-3.5 px-6 font-mono text-xs font-semibold text-slate-500">${alt.id}</td>
            <td class="py-3.5 px-6 font-semibold text-slate-800 dark:text-slate-200">${alt.name}</td>
            ${cells}
        `;
        matrixTbody.appendChild(tr);
    });
}

function renderNormalizationTable() {
    // Rebuild thead dynamically
    const normTable = normTbody.closest("table");
    if (normTable) {
        const thead = normTable.querySelector("thead tr");
        if (thead) {
            thead.innerHTML = `<th class="py-3 px-5 w-20">Kode</th><th class="py-3 px-5">Nama Kemasan</th>`;
            criteria.forEach((c, i) => {
                thead.innerHTML += `<th class="py-3 px-5 text-right">${c.name} (R${i + 1})</th>`;
            });
        }
    }

    normTbody.innerHTML = "";
    const colMin = {};
    const colMax = {};
    criteria.forEach(c => { colMin[c.id] = 1.0; colMax[c.id] = 0.0; });

    results.normalized.forEach(row => {
        criteria.forEach(c => {
            const val = row[c.id];
            if (val < colMin[c.id]) colMin[c.id] = val;
            if (val > colMax[c.id]) colMax[c.id] = val;
        });
    });

    results.normalized.forEach(row => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors";
        let cellsHtml = `
            <td class="py-3 px-6 font-mono text-xs font-semibold text-slate-500">${row.id}</td>
            <td class="py-3 px-6 font-semibold text-slate-800 dark:text-slate-200">${row.name}</td>
        `;
        criteria.forEach(c => {
            const val = row[c.id];
            let cellClass = "py-3 px-6 text-right font-medium";
            if (val === colMax[c.id]) cellClass += " bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold";
            else if (val === colMin[c.id]) cellClass += " bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 font-semibold";
            else cellClass += " text-slate-700 dark:text-slate-300";
            cellsHtml += `<td class="${cellClass}">${val !== undefined ? val.toFixed(2) : "0.00"}</td>`;
        });
        tr.innerHTML = cellsHtml;
        normTbody.appendChild(tr);
    });
}

function renderPreferenceTable() {
    // Rebuild thead dynamically
    const prefTable = prefTbody.closest("table");
    if (prefTable) {
        const thead = prefTable.querySelector("thead tr");
        if (thead) {
            thead.innerHTML = `<th class="py-3 px-5 w-20">Kode</th><th class="py-3 px-5">Nama Kemasan</th>`;
            criteria.forEach(c => {
                thead.innerHTML += `<th class="py-3 px-5 text-right">${c.name}</th>`;
            });
            thead.innerHTML += `<th class="py-3 px-5 text-right bg-primary-700">Total (Vᵢ)</th>`;
        }
    }

    prefTbody.innerHTML = "";
    results.preference.forEach(row => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors";
        let cells = criteria.map(c => {
            const val = row[c.id];
            return `<td class="py-3 px-6 text-right text-slate-500">${val !== undefined ? val.toFixed(4) : "0.0000"}</td>`;
        }).join("");
        tr.innerHTML = `
            <td class="py-3 px-6 font-mono text-xs font-semibold text-slate-500">${row.id}</td>
            <td class="py-3 px-6 font-semibold text-slate-800 dark:text-slate-200">${row.name}</td>
            ${cells}
            <td class="py-3 px-6 text-right font-bold text-primary-600 dark:text-primary-400 w-32 bg-slate-100/30 dark:bg-slate-850/60">${row.total.toFixed(4)}</td>
        `;
        prefTbody.appendChild(tr);
    });
}

// Render isi tabel Perangkingan Akhir (Alternatif diurutkan dari V_i terbesar)
function renderRankingTable() {
    rankTbody.innerHTML = "";
    results.ranked.forEach((row, index) => {
        // Badge angka peringkat
        const rankNum = index + 1;
        let rankBadge = "";
        let rowBgClass = "";

        if (rankNum === 1) {
            rankBadge = `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm shadow-sm">1</span>`;
            rowBgClass = "bg-primary-50/60 hover:bg-primary-50 dark:bg-primary-950/20 dark:hover:bg-primary-950/30";
        } else if (rankNum === 2) {
            rankBadge = `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm">2</span>`;
            rowBgClass = "hover:bg-slate-50 dark:hover:bg-slate-800/20";
        } else if (rankNum === 3) {
            rankBadge = `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">3</span>`;
            rowBgClass = "hover:bg-slate-50 dark:hover:bg-slate-800/20";
        } else {
            rankBadge = `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold text-sm">${rankNum}</span>`;
            rowBgClass = "hover:bg-slate-50/50 dark:hover:bg-slate-800/10";
        }

        const tr = document.createElement("tr");
        tr.className = `${rowBgClass} transition-colors`;
        tr.innerHTML = `
            <td class="py-3 px-6 text-center font-bold font-poppins">${rankBadge}</td>
            <td class="py-3 px-6 font-mono text-xs font-semibold text-slate-500">${row.id}</td>
            <td class="py-3 px-6 font-semibold text-slate-800 dark:text-slate-200">${row.name}</td>
            <td class="py-3 px-6 text-right font-bold text-slate-800 dark:text-white">${row.total.toFixed(4)}</td>
        `;
        rankTbody.appendChild(tr);
    });
}

// --- 9. VISUALISASI DASHBOARD ANALISIS HASIL ---
function renderChart() {
    const container = document.getElementById("viz-dashboard");
    if (!container) return;

    // Urutkan berdasarkan nilai preferensi tertinggi
    const sorted = [...results.ranked]; // sudah urut dari performSAWLogic
    const best = sorted[0];
    const second = sorted[1];
    const maxVal = best.total;

    // ── Warna gradien per rank ──────────────────────────
    const barGradients = [
        "from-primary-600 to-primary-400",
        "from-primary-500 to-primary-300",
        "from-primary-400 to-primary-200",
        "from-primary-300 to-primary-100",
        "from-slate-400 to-slate-200",
    ];

    // ══════════════════════════════════════════════════
    // CARD 1 — Alternatif Terbaik
    // ══════════════════════════════════════════════════
    const card1 = `
    <div class="bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-primary-500/20 border border-primary-500/20 viz-fadein" style="animation-delay:0ms">
        <div class="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-trophy text-amber-300 text-2xl"></i>
        </div>
        <div class="flex-grow min-w-0">
            <div class="text-[10px] font-bold uppercase tracking-widest text-primary-200 mb-0.5">Alternatif Terbaik</div>
            <div class="font-poppins font-extrabold text-white text-base leading-tight truncate">${best.name}</div>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                <span class="font-mono font-bold text-primary-200 text-sm">Vᵢ = ${best.total.toFixed(4)}</span>
                <span class="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[10px] font-bold">
                    <i class="fa-solid fa-ranking-star mr-1"></i>Ranking 1
                </span>
            </div>
        </div>
    </div>`;

    // ══════════════════════════════════════════════════
    // CARD 2 — Distribusi Nilai Preferensi (Progress Bar)
    // ══════════════════════════════════════════════════
    const barItems = sorted.map((alt, idx) => {
        const pct = ((alt.total / maxVal) * 100).toFixed(1);
        const grad = barGradients[idx] || barGradients[barGradients.length - 1];
        const delay = 80 + idx * 80;
        return `
        <div class="viz-fadein" style="animation-delay:${delay}ms">
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-[10px] font-bold flex items-center justify-center shrink-0">${idx + 1}</span>
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">${alt.name}</span>
                </div>
                <span class="font-mono text-xs font-bold text-primary-700 dark:text-primary-300 shrink-0 ml-2">${alt.total.toFixed(4)}</span>
            </div>
            <div class="h-2.5 w-full bg-slate-100 dark:bg-primary-950/40 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r ${grad} rounded-full eco-progress-bar" style="width:0%" data-target="${pct}"></div>
            </div>
            <div class="text-right text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">${pct}%</div>
        </div>`;
    }).join("");

    const card2 = `
    <div class="bg-white dark:bg-[#0e2a0d] rounded-2xl border border-primary-100 dark:border-primary-900 shadow-sm p-5 viz-fadein" style="animation-delay:60ms">
        <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/60 flex items-center justify-center">
                <i class="fa-solid fa-bars-progress text-primary-600 dark:text-primary-400 text-xs"></i>
            </div>
            <div>
                <h4 class="font-poppins font-bold text-sm text-slate-800 dark:text-white leading-tight">Distribusi Nilai Preferensi</h4>
                <p class="text-[10px] text-slate-400 dark:text-slate-500">Perbandingan Vᵢ seluruh alternatif</p>
            </div>
        </div>
        <div class="space-y-3">${barItems}</div>
    </div>`;

    // ══════════════════════════════════════════════════
    // CARD 3 — Insight Otomatis
    // ══════════════════════════════════════════════════
    const selisih = (best.total - second.total).toFixed(4);
    const selisihPct = ((best.total - second.total) / second.total * 100).toFixed(1);
    const totalAlt = sorted.length;

    // Cari alternatif dengan nilai terendah
    const worst = sorted[sorted.length - 1];
    const gapTopBottom = (best.total - worst.total).toFixed(4);

    const insights = [
        { icon: "fa-trophy", color: "text-amber-500", text: `<strong>${best.name}</strong> terpilih sebagai alternatif terbaik dengan nilai preferensi <strong>${best.total.toFixed(4)}</strong>` },
        { icon: "fa-arrow-trend-up", color: "text-primary-600 dark:text-primary-400", text: `Unggul <strong>${selisih}</strong> poin (<strong>${selisihPct}%</strong>) di atas peringkat ke-2 (${second.name})` },
        { icon: "fa-layer-group", color: "text-slate-500", text: `Total <strong>${totalAlt}</strong> alternatif kemasan makanan dibandingkan dalam analisis` },
        { icon: "fa-chart-line", color: "text-primary-500", text: `Rentang nilai: <strong>${worst.total.toFixed(4)}</strong> (terendah) hingga <strong>${best.total.toFixed(4)}</strong> (tertinggi), selisih <strong>${gapTopBottom}</strong>` },
    ];

    const insightItems = insights.map((item, i) => `
        <div class="flex items-start gap-3 viz-fadein" style="animation-delay:${200 + i * 60}ms">
            <div class="w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center shrink-0 mt-0.5">
                <i class="fa-solid ${item.icon} ${item.color} text-xs"></i>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">${item.text}</p>
        </div>`).join("");

    const card3 = `
    <div class="bg-white dark:bg-[#0e2a0d] rounded-2xl border border-primary-100 dark:border-primary-900 shadow-sm p-5 viz-fadein" style="animation-delay:120ms">
        <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/60 flex items-center justify-center">
                <i class="fa-solid fa-lightbulb text-primary-600 dark:text-primary-400 text-xs"></i>
            </div>
            <div>
                <h4 class="font-poppins font-bold text-sm text-slate-800 dark:text-white leading-tight">Insight Analisis</h4>
                <p class="text-[10px] text-slate-400 dark:text-slate-500">Poin penting dari hasil SAW</p>
            </div>
        </div>
        <div class="space-y-3">${insightItems}</div>
    </div>`;

    // Render ke DOM
    container.innerHTML = card1 + card2 + card3;
    container.className = "flex flex-col gap-4";

    // Animasi progress bar setelah render
    setTimeout(() => {
        container.querySelectorAll(".eco-progress-bar").forEach(bar => {
            const target = bar.getAttribute("data-target");
            bar.style.transition = "width 0.8s cubic-bezier(0.4,0,0.2,1)";
            bar.style.width = target + "%";
        });
    }, 120);

    // Animasi fade-in tiap card
    const style = document.getElementById("viz-anim-style") || document.createElement("style");
    style.id = "viz-anim-style";
    style.textContent = `
        @keyframes vizFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .viz-fadein { opacity:0; animation: vizFadeUp 0.45s ease forwards; }
    `;
    if (!document.getElementById("viz-anim-style")) document.head.appendChild(style);
}

// --- 10. RENDER DYNAMIC KESIMPULAN REKOMENDASI ---
// Menguraikan detail keunggulan kemasan ramah lingkungan terbaik terpilih secara dinamis
function renderConclusion() {
    const bestAlt = results.ranked[0];
    const originalAlt = results.matrix.find(x => x.id === bestAlt.id);

    let strongPoints = [];
    criteria.forEach(c => {
        const vals = results.matrix.map(x => Number(x[c.id] || 0));
        const unit = getUnit(c.desc);
        const unitStr = unit ? ` ${unit}` : "";
        if (c.type === "cost" && Number(originalAlt[c.id]) === Math.min(...vals)) {
            strongPoints.push(`${c.name.toLowerCase()} paling minimal yaitu ${originalAlt[c.id]}${unitStr}`);
        } else if (c.type === "benefit" && Number(originalAlt[c.id]) === Math.max(...vals)) {
            strongPoints.push(`${c.name.toLowerCase()} paling tinggi yaitu ${originalAlt[c.id]}${unitStr}`);
        }
    });

    let strongPointsText = "";
    if (strongPoints.length > 0) {
        strongPointsText = `Kemasan ini sangat direkomendasikan karena <strong>${strongPoints.join(', dan ')}</strong> dibanding alternatif lainnya.`;
    } else {
        strongPointsText = `Kemasan ini terpilih karena memiliki nilai komparatif seimbang yang tinggi di berbagai kriteria sesuai bobot kepentingan Anda.`;
    }

    const badgesHtml = criteria.map(c => {
        const unit = getUnit(c.desc);
        const val = originalAlt[c.id] !== undefined ? originalAlt[c.id] : 0;
        const displayVal = unit.toLowerCase() === "rp" || unit.toLowerCase() === "rupiah" ? formatRupiah(val) : `${val.toLocaleString('id-ID')}${unit ? ` ${unit}` : ''}`;
        return `<span class="text-xs font-semibold px-2 py-0.5 rounded bg-white/15 text-white border border-white/20">
            ${c.name}: ${displayVal}
        </span>`;
    }).join("");

    conclusionText.innerHTML = `
        <p class="text-base text-white/95">
            Berdasarkan perhitungan metode <strong>Simple Additive Weighting (SAW)</strong>, kemasan terbaik yang terpilih adalah 
            <span class="inline-block px-2.5 py-0.5 rounded-lg bg-white/20 text-white font-extrabold text-base font-poppins border border-white/25">${bestAlt.name} (${bestAlt.id})</span> 
            dengan nilai preferensi tertinggi sebesar <span class="font-extrabold text-white">${bestAlt.total.toFixed(4)}</span>.
        </p>
        <p class="mt-2 text-sm text-primary-100/85">
            ${strongPointsText}
        </p>
        <div class="mt-4 pt-3 border-t border-white/15 flex flex-wrap gap-2">
            ${badgesHtml}
        </div>
    `;
}

// --- 11. DETAIL PERHITUNGAN LANGKAH DEMI LANGKAH (REDESIGN) ---
function renderDetailCalculations() {
    calcStepsDetails.innerHTML = "";

    function makeStep(num, icon, title, subtitle, contentHtml) {
        const wrap = document.createElement("div");
        wrap.className = "relative pl-14 pb-10";
        wrap.innerHTML = `
            <div class="absolute left-5 top-10 bottom-0 w-0.5 bg-primary-100 dark:bg-primary-900"></div>
            <div class="absolute left-0 top-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md shrink-0 z-10">
                <i class="fa-solid ${icon} text-sm"></i>
            </div>
            <div class="mb-4 pt-1.5">
                <div class="inline-block text-[10px] font-bold uppercase tracking-widest text-primary-500 mb-0.5">Step ${num}</div>
                <h4 class="font-poppins font-bold text-base text-slate-800 dark:text-white leading-tight">${title}</h4>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">${subtitle}</p>
            </div>
            <div class="step-content">${contentHtml}</div>
        `;
        return wrap;
    }

    // STEP 1
    let step1Rows = criteria.map((c, i) => {
        const type = c.type;
        const unit = getUnit(c.desc);
        const badge = type === "benefit"
            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">Benefit</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">Cost</span>`;
        const usedVal = type === "benefit"
            ? `<span class="font-bold text-primary-700 dark:text-primary-300">${results.maxVals[c.id]}</span> <span class="text-slate-400">(Maks)</span>`
            : `<span class="font-bold text-primary-700 dark:text-primary-300">${results.minVals[c.id]}</span> <span class="text-slate-400">(Min)</span>`;
        const bg = i % 2 === 0 ? "" : "bg-primary-50/40 dark:bg-primary-950/10";
        return `<tr class="${bg}">
            <td class="py-2.5 px-4 font-bold text-xs text-primary-600 dark:text-primary-400 w-10">${c.id.toUpperCase()}</td>
            <td class="py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-200">${c.name} <span class="text-xs font-normal text-slate-400">${unit ? `(${unit})` : ''}</span></td>
            <td class="py-2.5 px-4 text-center">${badge}</td>
            <td class="py-2.5 px-4 text-right font-mono text-sm text-slate-500 dark:text-slate-400">${results.minVals[c.id]}</td>
            <td class="py-2.5 px-4 text-right font-mono text-sm text-slate-500 dark:text-slate-400">${results.maxVals[c.id]}</td>
            <td class="py-2.5 px-4 text-right text-sm">${usedVal}</td>
        </tr>`;
    }).join("");

    const step1Html = `
        <div class="bg-white dark:bg-[#0e2a0d] rounded-2xl border border-primary-100 dark:border-primary-900 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[560px]">
                    <thead>
                        <tr class="bg-primary-50 dark:bg-primary-950/40 text-[10px] font-bold uppercase tracking-widest text-primary-700 dark:text-primary-400 border-b border-primary-100 dark:border-primary-900">
                            <th class="py-3 px-4">#</th>
                            <th class="py-3 px-4">Kriteria</th>
                            <th class="py-3 px-4 text-center">Jenis</th>
                            <th class="py-3 px-4 text-right">Min</th>
                            <th class="py-3 px-4 text-right">Maks</th>
                            <th class="py-3 px-4 text-right">Nilai Digunakan</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-primary-50 dark:divide-primary-900/40 text-sm">${step1Rows}</tbody>
                </table>
            </div>
        </div>`;

    calcStepsDetails.appendChild(makeStep(1, "fa-table-list", "Nilai Minimum & Maksimum Setiap Kriteria", "Digunakan sebagai pembagi dalam proses normalisasi SAW", step1Html));

    // STEP 2
    const accordionWrap = document.createElement("div");
    accordionWrap.className = "space-y-2";

    results.normalized.forEach((row, altIdx) => {
        const orig = results.matrix.find(x => x.id === row.id);
        const accId = `acc-norm-${row.id}`;

        const normCards = criteria.map((c, i) => {
            const type = c.type;
            const result = (row[c.id] || 0).toFixed(4);
            const typeColor = type === "benefit" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400";
            const typeLabel = type === "benefit" ? "Benefit" : "Cost";
            const formula = type === "benefit"
                ? `${orig[c.id]} / ${results.maxVals[c.id]}`
                : `${results.minVals[c.id]} / ${orig[c.id]}`;

            return `
            <div class="flex items-center gap-3 p-3 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900">
                <div class="shrink-0 w-10 text-center">
                    <span class="text-[10px] font-bold text-primary-600 dark:text-primary-400 block">${c.id.toUpperCase()}</span>
                    <span class="text-[9px] ${typeColor} font-semibold">${typeLabel}</span>
                </div>
                <div class="flex-grow">
                    <div class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">${c.name}</div>
                    <div class="flex items-center flex-wrap gap-1.5 font-mono text-sm">
                        <span class="text-slate-700 dark:text-slate-300">${formula}</span>
                        <span class="text-slate-400 dark:text-slate-600">=</span>
                        <span class="font-bold text-primary-700 dark:text-primary-300 bg-white dark:bg-primary-900/60 px-2 py-0.5 rounded-lg border border-primary-200 dark:border-primary-800">${result}</span>
                    </div>
                </div>
            </div>`;
        }).join("");

        const accItem = document.createElement("div");
        accItem.className = "bg-white dark:bg-[#0e2a0d] rounded-xl border border-primary-100 dark:border-primary-900 shadow-sm overflow-hidden";
        accItem.innerHTML = `
            <button data-acc="${accId}" class="acc-norm-btn w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition-colors focus:outline-none">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">${row.id}</span>
                    <div>
                        <span class="font-semibold text-sm text-slate-800 dark:text-white">${row.name}</span>
                        <span class="ml-2 text-xs text-slate-400 dark:text-slate-500">— Klik untuk ${altIdx === 0 ? "tutup" : "buka"}</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-down text-slate-400 transition-transform duration-300 ${altIdx === 0 ? "rotate-180" : ""}"></i>
            </button>
            <div id="${accId}" class="acc-norm-content overflow-hidden transition-all duration-400 ease-in-out" style="max-height:${altIdx === 0 ? "1000px" : "0"}">
                <div class="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${normCards}
                </div>
            </div>`;
        accordionWrap.appendChild(accItem);
    });

    const step2Wrap = document.createElement("div");
    step2Wrap.appendChild(accordionWrap);
    calcStepsDetails.appendChild(makeStep(2, "fa-calculator", "Normalisasi Matriks (R)", "Setiap nilai atribut dinormalisasi ke skala 0–1 berdasarkan rumus Benefit / Cost", step2Wrap.innerHTML));

    calcStepsDetails.querySelectorAll(".acc-norm-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-acc");
            const content = document.getElementById(id);
            const icon = btn.querySelector("i");
            const isOpen = content.style.maxHeight && content.style.maxHeight !== "0px";
            if (isOpen) {
                content.style.maxHeight = "0";
                icon.style.transform = "rotate(0deg)";
            } else {
                content.style.maxHeight = content.scrollHeight + 500 + "px";
                icon.style.transform = "rotate(180deg)";
            }
        });
    });

    // STEP 3
    const prefCards = results.preference.map(pref => {
        const norm = results.normalized.find(x => x.id === pref.id);
        const termBlocks = criteria.map((c, i) => {
            const w = ((c.weight || 0) / 100).toFixed(2);
            const r = (norm[c.id] || 0).toFixed(4);
            const v = (pref[c.id] || 0).toFixed(4);
            return `
            <div class="flex flex-col items-center gap-1 text-center min-w-[80px]">
                <div class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">${c.id.toUpperCase()}</div>
                <div class="bg-primary-50 dark:bg-primary-950/40 rounded-xl px-3 py-2 border border-primary-100 dark:border-primary-900 font-mono text-xs">
                    <span class="text-primary-700 dark:text-primary-300 font-bold">${w}</span>
                    <span class="text-slate-400 mx-0.5">×</span>
                    <span class="text-slate-700 dark:text-slate-300">${r}</span>
                </div>
                <div class="text-[10px] text-slate-400">=</div>
                <div class="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">${v}</div>
            </div>`;
        });

        const plusSeparators = [];
        termBlocks.forEach((block, idx) => {
            plusSeparators.push(block);
            if (idx < termBlocks.length - 1) {
                plusSeparators.push(`<div class="text-xl font-light text-slate-300 dark:text-slate-700 self-center pb-2">+</div>`);
            }
        });

        return `
        <div class="bg-white dark:bg-[#0e2a0d] rounded-2xl border border-primary-100 dark:border-primary-900 shadow-sm p-5">
            <div class="flex items-center gap-3 mb-4">
                <span class="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">${pref.id}</span>
                <span class="font-poppins font-bold text-sm text-slate-800 dark:text-white">${pref.name}</span>
            </div>
            <div class="overflow-x-auto pb-2">
                <div class="flex items-start gap-2 min-w-max">
                    ${plusSeparators.join("")}
                    <div class="text-xl font-light text-slate-300 dark:text-slate-700 self-center pb-2">=</div>
                    <div class="flex flex-col items-center justify-center min-w-[80px]">
                        <div class="text-[10px] font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-1">Vᵢ</div>
                        <div class="bg-primary-600 text-white rounded-xl px-4 py-2.5 font-mono font-bold text-base shadow-md shadow-primary-500/20">
                            ${pref.total.toFixed(4)}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join("");

    calcStepsDetails.appendChild(makeStep(3, "fa-sigma", "Perhitungan Nilai Preferensi (Vᵢ)", "Vᵢ = Σ (wⱼ × rᵢⱼ) — Penjumlahan hasil perkalian bobot × normalisasi setiap kriteria", prefCards));

    // ══════════════════════════════════════════════════════════════
    // STEP 4 — Perangkingan (Vertical Timeline Leaderboard)
    // ══════════════════════════════════════════════════════════════
    const medalIcons = [
        { icon: "fa-trophy", color: "bg-amber-400", text: "text-amber-900", label: "Emas", ring: "ring-amber-300" },
        { icon: "fa-medal", color: "bg-slate-300", text: "text-slate-700", label: "Perak", ring: "ring-slate-200" },
        { icon: "fa-award", color: "bg-orange-300", text: "text-orange-900", label: "Perunggu", ring: "ring-orange-200" },
    ];

    const rankItems = results.ranked.map((row, idx) => {
        const rankNum = idx + 1;
        const medal = medalIcons[idx] || null;
        const isTop = rankNum <= 3;
        const barPct = (row.total / results.ranked[0].total * 100).toFixed(1);

        const medalHtml = isTop
            ? `<div class="w-11 h-11 rounded-full ${medal.color} ring-4 ${medal.ring} flex items-center justify-center shadow-md shrink-0">
                    <i class="fa-solid ${medal.icon} ${medal.text} text-lg"></i>
               </div>`
            : `<div class="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-200 dark:ring-slate-700 flex items-center justify-center shadow-sm shrink-0">
                    <span class="font-bold text-slate-500 dark:text-slate-400 text-sm">${rankNum}</span>
               </div>`;

        const cardBorder = rankNum === 1
            ? "border-primary-300 dark:border-primary-700 bg-primary-50/60 dark:bg-primary-950/30"
            : "border-primary-100 dark:border-primary-900 bg-white dark:bg-[#0e2a0d]";

        return `
        <div class="flex items-start gap-4 group">
            ${medalHtml}
            <div class="flex-grow bg-white dark:bg-[#0e2a0d] rounded-2xl border ${cardBorder} shadow-sm p-4 transition-all duration-200 hover:shadow-md">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div>
                        <span class="font-mono text-[10px] font-bold text-primary-500 dark:text-primary-400">${row.id}</span>
                        <h5 class="font-poppins font-bold text-sm text-slate-800 dark:text-white">${row.name}</h5>
                    </div>
                    <div class="text-right">
                        <div class="text-[10px] text-slate-400 dark:text-slate-500">Nilai Preferensi</div>
                        <div class="font-mono font-bold text-primary-700 dark:text-primary-300 text-lg leading-tight">${row.total.toFixed(4)}</div>
                    </div>
                </div>
                <!-- Progress bar relatif terhadap nilai tertinggi -->
                <div class="h-1.5 w-full bg-slate-100 dark:bg-primary-900/40 rounded-full overflow-hidden">
                    <div class="h-full eco-bar rounded-full transition-all duration-700" style="width:${barPct}%"></div>
                </div>
                <div class="mt-1 text-right text-[10px] text-slate-400 dark:text-slate-500">${barPct}% dari nilai tertinggi</div>
            </div>
        </div>`;
    }).join("");

    const rankHtml = `<div class="space-y-4">${rankItems}</div>`;
    calcStepsDetails.appendChild(makeStep(4, "fa-ranking-star", "Perangkingan Akhir", "Alternatif diurutkan dari nilai preferensi (Vᵢ) tertinggi ke terendah", rankHtml));
}

// --- 12. AKSESIBILITAS TRANSISI AKORDION DETAIL PERHITUNGAN ---
// Mengontrol tinggi dinamis konten akordion ketika tombol "Detail Langkah Perhitungan" ditekan
btnAccordion.addEventListener("click", () => {
    if (accordionContent.style.maxHeight) {
        accordionContent.style.maxHeight = null;
        accordionContent.classList.add("border-transparent");
        accordionIcon.style.transform = "rotate(0deg)";
    } else {
        accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
        accordionContent.classList.remove("border-transparent");
        accordionIcon.style.transform = "rotate(180deg)";

        // Setel ulang tinggi maksimum ke 'none' agar konten dinamis di dalamnya tidak terpotong
        setTimeout(() => {
            if (accordionContent.style.maxHeight) {
                accordionContent.style.maxHeight = "none";
            }
        }, 500);
    }
});

// Auto open accordion bila link navigasi detail perhitungan di-klik
document.querySelectorAll('a[href="#section-detail-calc"]').forEach(link => {
    link.addEventListener("click", () => {
        if (!accordionContent.style.maxHeight || accordionContent.style.maxHeight === "0px") {
            btnAccordion.click();
        }
    });
});

// --- 13. EKSPOR HASIL AKHIR KE FORMAT FILE CSV ---
btnExportCsv.addEventListener("click", () => {
    if (!results) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    const critHeaders = criteria.map(c => {
        const unit = getUnit(c.desc);
        return `"${c.name}${unit ? ` (${unit})` : ""}"`;
    }).join(",");

    csvContent += `Peringkat,Kode,Nama Kemasan,Nilai Preferensi (Vi),${critHeaders}\n`;

    results.ranked.forEach((row, index) => {
        const originalAlt = results.matrix.find(x => x.id === row.id);
        const rankNum = index + 1;
        const critVals = criteria.map(c => originalAlt[c.id] !== undefined ? originalAlt[c.id] : 0).join(",");

        const csvRow = [
            rankNum,
            row.id,
            `"${row.name.replace(/"/g, '""')}"`,
            row.total.toFixed(6),
            critVals
        ].join(",");

        csvContent += csvRow + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "spk_kemasan_ramah_lingkungan_saw_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Hasil SPK berhasil diekspor sebagai file CSV.", "success");
});

// --- 14. SISTEM UNDUH WORD ---
function _wordTh(text, extra = "") {
    return `<th style="padding:8px 10px;border:1px solid #c8e6c9;background:#2E7D32;color:#fff;font-size:10pt;font-weight:bold;text-align:center;${extra}">${text}</th>`;
}
function _wordTd(text, extra = "") {
    return `<td style="padding:8px 10px;border:1px solid #e0f2e1;font-size:9.5pt;text-align:center;${extra}">${text}</td>`;
}

function buildWordHtml(dateStr, timeStr) {
    if (!results) return "<p>Belum ada hasil perhitungan.</p>";

    const sectionStyle = `margin-bottom:24px;`;
    const headingStyle = `font-size:12pt;font-weight:bold;color:#1a3c1a;margin:20px 0 10px 0;padding:8px 12px;background:#e8f5e9;border-left:4px solid #2E7D32;`;
    const tableStyle = `width:100%;border-collapse:collapse;margin-bottom:15px;`;

    // 1. Matriks Keputusan
    const matrixRows = results.matrix.map((alt, idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#f1f8f1";
        const cells = criteria.map(c => _wordTd(alt[c.id] !== undefined ? alt[c.id] : 0, `background:${bg};`)).join("");
        return `<tr>
            ${_wordTd(alt.id, `background:${bg};font-weight:bold;`)}
            ${_wordTd(alt.name, `background:${bg};text-align:left;`)}
            ${cells}
        </tr>`;
    }).join("");

    // 2. Normalisasi
    const normRows = results.normalized.map((alt, idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#f1f8f1";
        const cells = criteria.map(c => _wordTd((alt[c.id] || 0).toFixed(4), `background:${bg};`)).join("");
        return `<tr>
            ${_wordTd(alt.id, `background:${bg};font-weight:bold;`)}
            ${_wordTd(alt.name, `background:${bg};text-align:left;`)}
            ${cells}
        </tr>`;
    }).join("");

    // 3. Preferensi
    const prefRows = results.preference.map((alt, idx) => {
        const bg = idx % 2 === 0 ? "#ffffff" : "#f1f8f1";
        const cells = criteria.map(c => _wordTd((alt[c.id] || 0).toFixed(4), `background:${bg};`)).join("");
        return `<tr>
            ${_wordTd(alt.id, `background:${bg};font-weight:bold;`)}
            ${_wordTd(alt.name, `background:${bg};text-align:left;`)}
            ${cells}
            ${_wordTd(`<strong>${alt.total.toFixed(4)}</strong>`, `background:${idx % 2 === 0 ? "#e8f5e9" : "#d0edcf"};font-weight:bold;`)}
        </tr>`;
    }).join("");

    // 4. Ranking
    const rankRows = results.ranked.map((alt, idx) => {
        const rank = idx + 1;
        const bg = idx === 0 ? "#e8f5e9" : (idx % 2 === 0 ? "#ffffff" : "#f9fafb");
        return `<tr>
            ${_wordTd(`#${rank}`, `background:${bg};font-weight:bold;font-size:10.5pt;`)}
            ${_wordTd(alt.id, `background:${bg};font-weight:bold;`)}
            ${_wordTd(alt.name, `background:${bg};text-align:left;font-weight:${idx === 0 ? "bold" : "normal"};`)}
            ${_wordTd(alt.total.toFixed(4), `background:${bg};font-weight:${idx === 0 ? "bold" : "normal"};color:${idx === 0 ? "#2E7D32" : "#374151"};`)}
            ${_wordTd(idx === 0 ? "Rekomendasi Terbaik" : `-`, `background:${bg};font-size:9.5pt;color:${idx === 0 ? "#2E7D32" : "#9ca3af"};`)}
        </tr>`;
    }).join("");

    const best = results.ranked[0];
    const weights = criteria.map(c => `${c.id.toUpperCase()}: ${c.weight}%`).join("  |  ");

    return `htmlContentStart
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8">
    <title>Laporan SPK Pemilihan Kemasan Makanan</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; background: #ffffff; margin: 20px; }
    </style>
</head>
<body>
    <div style="font-family:Arial, sans-serif;color:#1e293b;background:#ffffff;padding:10px;">

        <div style="text-align:center;border-bottom:3px solid #2E7D32;padding-bottom:18px;margin-bottom:28px;">
            <div style="font-size:24pt;margin-bottom:6px;">🌿</div>
            <div style="font-size:18pt;font-weight:bold;color:#2E7D32;line-height:1.3;">
                Laporan Hasil SPK Pemilihan<br>Kemasan Makanan Ramah Lingkungan
            </div>
            <div style="margin-top:8px;font-size:10pt;color:#64748b;">
                Metode: <strong>Simple Additive Weighting (SAW)</strong> &nbsp;|&nbsp; Dicetak: ${dateStr}, ${timeStr}
            </div>
        </div>

        <div style="${sectionStyle}">
            <div style="${headingStyle}">Konfigurasi Bobot Kriteria</div>
            <table style="${tableStyle}">
                <thead><tr>
                    ${_wordTh("Kode")} ${_wordTh("Nama Kriteria")} ${_wordTh("Bobot (%)")} ${_wordTh("Tipe")}
                </tr></thead>
                <tbody>
                    ${criteria.map((c, i) => {
        const unit = getUnit(c.desc);
        const tLabel = c.type === "benefit" ? "Benefit" : "Cost";
        const tColor = c.type === "benefit" ? "#2E7D32" : "#c62828";
        const bg = i % 2 === 0 ? "#ffffff" : "#f1f8f1";
        return `<tr>
                            ${_wordTd(c.id.toUpperCase(), `background:${bg};font-weight:bold;`)}
                            ${_wordTd(`${c.name}${unit ? ` (${unit})` : ""}`, `background:${bg};text-align:left;`)}
                            ${_wordTd(`${c.weight}%`, `background:${bg};font-weight:bold;`)}
                            ${_wordTd(tLabel, `background:${bg};color:${tColor};font-weight:bold;`)}
                        </tr>`;
    }).join("")}
                </tbody>
            </table>
        </div>

        <div style="${sectionStyle}">
            <div style="${headingStyle}">Tabel 1. Matriks Keputusan (X)</div>
            <table style="${tableStyle}">
                <thead><tr>
                    ${_wordTh("Kode")} ${_wordTh("Nama Kemasan", "text-align:left;")}
                    ${criteria.map(c => {
        const unit = getUnit(c.desc);
        return _wordTh(c.name + (unit ? ` (${unit})` : ""));
    }).join("")}
                </tr></thead>
                <tbody>${matrixRows}</tbody>
            </table>
        </div>

        <div style="${sectionStyle}">
            <div style="${headingStyle}">Tabel 2. Matriks Normalisasi (R)</div>
            <table style="${tableStyle}">
                <thead><tr>
                    ${_wordTh("Kode")} ${_wordTh("Nama Kemasan", "text-align:left;")}
                    ${criteria.map((c, i) => _wordTh(`r_${c.name} (R${i + 1})`)).join("")}
                </tr></thead>
                <tbody>${normRows}</tbody>
            </table>
        </div>

        <div style="${sectionStyle}">
            <div style="${headingStyle}">Tabel 3. Nilai Preferensi (V = Σ W×R)</div>
            <table style="${tableStyle}">
                <thead><tr>
                    ${_wordTh("Kode")} ${_wordTh("Nama Kemasan", "text-align:left;")}
                    ${criteria.map(c => _wordTh(`W×r_${c.name}`)).join("")}
                    ${_wordTh("Total (Vᵢ)")}
                </tr></thead>
                <tbody>${prefRows}</tbody>
            </table>
        </div>

        <div style="${sectionStyle}">
            <div style="${headingStyle}">Tabel 4. Hasil Perangkingan Akhir</div>
            <table style="${tableStyle}">
                <thead><tr>
                    ${_wordTh("Rank")} ${_wordTh("Kode")} ${_wordTh("Nama Kemasan", "text-align:left;")}
                    ${_wordTh("Nilai Preferensi (Vᵢ)")} ${_wordTh("Keterangan")}
                </tr></thead>
                <tbody>${rankRows}</tbody>
            </table>
        </div>

        <div style="background:#e8f5e9;border:2px solid #2E7D32;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="font-size:12pt;font-weight:bold;color:#2E7D32;margin:0 0 10px 0;">Kesimpulan & Rekomendasi</p>
            <p style="font-size:11pt;color:#374151;margin:0 0 6px 0;">
                Berdasarkan perhitungan metode <strong>SAW</strong> dengan ${results.matrix.length} alternatif kemasan dan ${criteria.length} kriteria,
                kemasan yang paling direkomendasikan adalah:
            </p>
            <div style="background:#ffffff;border-radius:6px;padding:12px;border-left:4px solid #2E7D32;margin-bottom:10px;">
                <div style="font-size:14pt;font-weight:bold;color:#2E7D32;">${best.name}</div>
                <div style="font-size:10pt;color:#64748b;margin-top:4px;">
                    Kode: <strong>${best.id}</strong> &nbsp;|&nbsp; Nilai Preferensi Tertinggi: <strong>${best.total.toFixed(4)}</strong>
                </div>
            </div>
            <p style="font-size:9.5pt;color:#64748b;margin:10px 0 0 0;">
                Distribusi bobot: ${weights}
            </p>
        </div>

        <div style="text-align:center;border-top:1px solid #e2e8f0;padding-top:10px;font-size:9pt;color:#94a3b8;">
            Dokumen ini dibuat otomatis oleh Sistem SPK Kemasan Makanan Ramah Lingkungan
        </div>
    </div>
</body>
</html>
htmlContentEnd`.trim().replace("htmlContentStart\n", "");
}

btnPrint.addEventListener("click", () => {
    if (!results) {
        showToast("Hitung SAW terlebih dahulu sebelum mengunduh laporan Word.", "error");
        return;
    }

    showToast("Mengunduh dokumen Word...", "info");
    btnPrint.disabled = true;
    btnPrint.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengunduh...`;

    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const filenameDate = now.toISOString().slice(0, 10);

    const htmlContent = buildWordHtml(dateStr, timeStr);

    // Gunakan Blob dengan MIME Type application/msword untuk mendownload secara lokal
    const blob = new Blob(['\ufeff' + htmlContent], {
        type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SPK_Kemasan_Makanan_${filenameDate}.doc`;
    document.body.appendChild(a);
    a.click();

    // Bersihkan DOM
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        btnPrint.disabled = false;
        btnPrint.innerHTML = `<i class="fa-solid fa-file-word"></i> Unduh Word`;
        showToast("Dokumen Word berhasil diunduh!", "success");
    }, 500);
});



// --- 16. TAB NAVIGATION / VIEW SWITCHER (SPA) ---
function switchView(targetTab) {
    const views = {
        'dashboard': 'view-dashboard',
        'matrix': 'view-matrix',
        'norm': 'view-norm',
        'pref': 'view-pref',
        'detail-calc': 'view-detail-calc',
        'alternatives': 'view-dashboard',
        'criteria': 'view-dashboard'
    };

    const targetViewId = views[targetTab] || 'view-dashboard';

    // Sembunyikan seluruh tampilan utama
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));

    // Tampilkan tampilan target
    const activeViewEl = document.getElementById(targetViewId);
    if (activeViewEl) activeViewEl.classList.remove('hidden');

    // Perbarui gaya status link pada sidebar
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const linkTab = link.dataset.tab;
        if (linkTab === targetTab) {
            link.className = "sidebar-link active flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary-600 text-white shadow-md transition-all group";
            const iconWrap = link.querySelector('div');
            if (iconWrap) {
                iconWrap.className = "w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0";
            }
            const subtitle = link.querySelector('div > div:nth-child(2)');
            if (subtitle) subtitle.className = "text-[10px] text-white/80 font-normal truncate";
        } else {
            link.className = "sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600 dark:hover:text-primary-400 transition-all group";
            const iconWrap = link.querySelector('div');
            if (iconWrap) {
                iconWrap.className = "w-7 h-7 rounded-lg bg-slate-100 dark:bg-primary-900/40 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-primary-600 group-hover:text-white transition-all shrink-0";
            }
            const subtitle = link.querySelector('div > div:nth-child(2)');
            if (subtitle) subtitle.className = "text-[10px] text-slate-400 font-normal truncate";
        }
    });

    // Cek status ketersediaan hasil perhitungan jika membuka tab tabel analisis
    if (['matrix', 'norm', 'pref', 'detail-calc'].includes(targetTab)) {
        const notice = activeViewEl.querySelector('.empty-results-notice');
        const section = activeViewEl.querySelector('section');
        if (!results) {
            if (notice) notice.classList.remove('hidden');
            if (section) section.classList.add('hidden');
        } else {
            if (notice) notice.classList.add('hidden');
            if (section) section.classList.remove('hidden');
        }
    }

    // Scroll ke atas atau ke seksi tertentu
    if (targetTab === 'alternatives') {
        document.getElementById('section-alternatives')?.scrollIntoView({ behavior: 'smooth' });
    } else if (targetTab === 'criteria') {
        document.getElementById('section-criteria')?.scrollIntoView({ behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Buka akordion detail perhitungan secara otomatis jika di-klik dari sidebar
    if (targetTab === 'detail-calc' && results) {
        if (!accordionContent.style.maxHeight || accordionContent.style.maxHeight === "0px") {
            btnAccordion.click();
        }
    }
}

function initTabNavigation() {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            switchView(tab);
        });
    });

    document.querySelectorAll('.btn-back-dashboard').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView('dashboard');
        });
    });
}

// --- 15. INSTALASI INITIAL LISTENERS DI AWAL ---
btnCalculate.addEventListener("click", calculateSAW);

// Pemicu inisialisasi awal saat dokumen HTML selesai dimuat secara keseluruhan
window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    renderAlternatives();
    renderCriteria();
    initTabNavigation();
});