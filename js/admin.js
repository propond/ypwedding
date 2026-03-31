/* =============================================
   ADMIN PANEL — ADMIN.JS
   ============================================= */

const API_URL = 'api.php';
let weddingData = {};
let gallerySort = null;

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    setupLoginForm();
    setupNavigation();
    setupLogout();
    setupSaveButton();
    setupSidebarToggle();
    setupImageUploads();
    setupMusicUpload();
    setupGalleryUpload();
    setupAddButtons();
    setupChangePassword();
    setupCouplePositionSliders();
    setupCropModal();
    checkAuth();
});

// =============================================
// AUTH
// =============================================
function checkAuth() {
    fetch(`${API_URL}?action=check_auth`)
        .then(r => r.json())
        .then(data => {
            if (data.success && data.logged_in) {
                showAdmin();
                loadData();
            }
        })
        .catch(() => {});
}

function setupLoginForm() {
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        fetch(`${API_URL}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showAdmin();
                loadData();
            } else {
                const err = document.getElementById('login-error');
                err.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
                err.style.display = 'block';
            }
        })
        .catch(() => showToast('เกิดข้อผิดพลาด', 'error'));
    });
}

function setupLogout() {
    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        fetch(`${API_URL}?action=logout`).then(() => {
            document.getElementById('admin-panel').style.display = 'none';
            document.getElementById('login-screen').style.display = 'flex';
        });
    });
}

function showAdmin() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
}

// =============================================
// NAVIGATION
// =============================================
function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const titles = {
        hero: 'Hero Section', quotes: 'Special Quotes', parents: 'Parents',
        couple: 'Bride & Groom', schedule: 'Wedding Schedule', venue: 'Venue & Map',
        gallery: 'Gallery Layout', music: 'Music', wishes: 'Wishes',
        settings: 'Settings'
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            if (!tab) return;

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
            document.getElementById('page-title').textContent = titles[tab] || tab;

            // Load wishes when switching to that tab
            if (tab === 'wishes') loadWishesAdmin();

            // Close sidebar on mobile
            document.querySelector('.sidebar').classList.remove('open');
        });
    });
}

function setupSidebarToggle() {
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });
}

// =============================================
// LOAD DATA
// =============================================
function loadData() {
    fetch(`${API_URL}?action=load`)
        .then(r => r.json())
        .then(result => {
            if (result.success) {
                weddingData = result.data;
                populateAllForms();
            }
        })
        .catch(() => showToast('ไม่สามารถโหลดข้อมูลได้', 'error'));
}

function populateAllForms() {
    // Auto-populate inputs with data-path
    document.querySelectorAll('[data-path]').forEach(el => {
        const val = getNestedValue(weddingData, el.dataset.path);
        if (val !== undefined) {
            el.value = val;
        }
    });

    // Hero image preview
    if (weddingData.hero?.hero_image) {
        document.getElementById('hero-image-preview').src = '../' + weddingData.hero.hero_image;
    }

    // Couple images + position
    if (weddingData.couple?.bride?.image) {
        const brideImg = document.getElementById('bride-image-preview');
        brideImg.src = '../' + weddingData.couple.bride.image;
        const posX = weddingData.couple.bride.pos_x ?? 50;
        const posY = weddingData.couple.bride.pos_y ?? 50;
        brideImg.style.objectPosition = `${posX}% ${posY}%`;
        document.getElementById('bride-pos-x').value = posX;
        document.getElementById('bride-pos-y').value = posY;
    }
    if (weddingData.couple?.groom?.image) {
        const groomImg = document.getElementById('groom-image-preview');
        groomImg.src = '../' + weddingData.couple.groom.image;
        const posX = weddingData.couple.groom.pos_x ?? 50;
        const posY = weddingData.couple.groom.pos_y ?? 50;
        groomImg.style.objectPosition = `${posX}% ${posY}%`;
        document.getElementById('groom-pos-x').value = posX;
        document.getElementById('groom-pos-y').value = posY;
    }

    // Build dynamic sections
    buildQuotesEditor();
    buildParentsList();
    buildScheduleList();
    buildGalleryEditor();
    buildThemeColors();
    buildSectionToggles();

    // Gallery settings
    if (weddingData.gallery) {
        document.getElementById('gallery-columns').value = weddingData.gallery.columns || 3;
        document.getElementById('gallery-gap').value = weddingData.gallery.gap || 8;
    }

    // Music
    if (weddingData.music?.url) {
        const preview = document.getElementById('music-player-preview');
        preview.innerHTML = `<audio controls style="width:100%;"><source src="../${weddingData.music.url}" type="audio/mpeg"></audio>`;
    }
}

// =============================================
// SAVE DATA
// =============================================
function setupSaveButton() {
    document.getElementById('save-btn').addEventListener('click', saveAllData);
}

async function saveAllData() {
    // Collect data from all forms
    document.querySelectorAll('[data-path]').forEach(el => {
        setNestedValue(weddingData, el.dataset.path, el.value);
    });

    // Collect quotes
    weddingData.quotes = collectQuotes();

    // Collect parents
    weddingData.parents = collectParents();

    // Collect schedule
    weddingData.schedule = collectSchedule();

    // Collect gallery
    weddingData.gallery = collectGallery();

    // Collect theme colors
    weddingData.venue.theme_colors = collectThemeColors();

    // Collect section toggles
    weddingData.settings.sections_visible = collectSectionToggles();

    // Save each section
    try {
        const sections = ['hero', 'quotes', 'parents', 'couple', 'schedule', 'venue', 'gallery', 'music', 'wishes', 'settings'];
        for (const section of sections) {
            await fetch(`${API_URL}?action=save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, data: weddingData[section] })
            });
        }
        showToast('บันทึกสำเร็จ! ✅', 'success');
    } catch (err) {
        showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
}

// =============================================
// QUOTES EDITOR
// =============================================
function buildQuotesEditor() {
    const container = document.getElementById('quotes-container');
    container.innerHTML = '';

    (weddingData.quotes || []).forEach((quote, idx) => {
        container.appendChild(createQuoteCard(quote, idx));
    });
}

function createQuoteCard(quote, idx) {
    const card = document.createElement('div');
    card.className = 'card quote-editor-block';
    card.innerHTML = `
        <div class="card-header">
            <h3><i class="fas fa-quote-left"></i> Quote ${idx + 1}</h3>
            <button class="btn btn-danger btn-sm" onclick="removeQuote(${idx})"><i class="fas fa-trash"></i></button>
        </div>
        <div class="card-body">
            <div class="form-group">
                <label>หัวข้อ</label>
                <input type="text" class="quote-heading" value="${escapeAttr(quote.heading || '')}">
            </div>
            <div class="form-group">
                <label>ย่อหน้า (แต่ละบรรทัดเป็น 1 ย่อหน้า)</label>
                <textarea class="quote-paragraphs" rows="4">${(quote.paragraphs || []).join('\n')}</textarea>
            </div>
            <div class="form-group">
                <label>ข้อความเด่น (Highlight)</label>
                <textarea class="quote-highlight" rows="2">${quote.highlight || ''}</textarea>
            </div>
            <div class="form-group">
                <label>ลงชื่อ</label>
                <input type="text" class="quote-author" value="${escapeAttr(quote.author || '')}">
            </div>
        </div>
    `;
    return card;
}

function collectQuotes() {
    const blocks = document.querySelectorAll('.quote-editor-block');
    return Array.from(blocks).map(block => ({
        heading: block.querySelector('.quote-heading').value,
        paragraphs: block.querySelector('.quote-paragraphs').value.split('\n').filter(p => p.trim()),
        highlight: block.querySelector('.quote-highlight').value,
        author: block.querySelector('.quote-author').value
    }));
}

window.removeQuote = function(idx) {
    weddingData.quotes.splice(idx, 1);
    buildQuotesEditor();
};

function setupAddButtons() {
    document.getElementById('add-quote-btn').addEventListener('click', () => {
        if (!weddingData.quotes) weddingData.quotes = [];
        weddingData.quotes.push({ heading: '', paragraphs: [''], highlight: '', author: '' });
        buildQuotesEditor();
    });

    document.getElementById('add-parent-btn').addEventListener('click', () => {
        if (!weddingData.parents) weddingData.parents = [];
        weddingData.parents.push({ name: '', role: '' });
        buildParentsList();
    });

    document.getElementById('add-schedule-btn').addEventListener('click', () => {
        if (!weddingData.schedule) weddingData.schedule = [];
        weddingData.schedule.push({ title_en: '', title_th: '', time: '', icon: 'fas fa-star' });
        buildScheduleList();
    });

    document.getElementById('add-color-btn').addEventListener('click', () => {
        if (!weddingData.venue) weddingData.venue = {};
        if (!weddingData.venue.theme_colors) weddingData.venue.theme_colors = [];
        weddingData.venue.theme_colors.push('#cccccc');
        buildThemeColors();
    });
}

// =============================================
// PARENTS LIST
// =============================================
function buildParentsList() {
    const container = document.getElementById('parents-list');
    container.innerHTML = '';

    (weddingData.parents || []).forEach((parent, idx) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
            <div class="list-item-fields">
                <input type="text" class="parent-name-input" value="${escapeAttr(parent.name)}" placeholder="ชื่อ">
                <input type="text" class="parent-role-input" value="${escapeAttr(parent.role)}" placeholder="ตำแหน่ง">
            </div>
            <button class="btn-icon" onclick="removeParent(${idx})" title="ลบ"><i class="fas fa-trash" style="color:var(--danger);font-size:0.8rem;"></i></button>
        `;
        container.appendChild(item);
    });

    new Sortable(container, { handle: '.drag-handle', animation: 200 });
}

function collectParents() {
    const items = document.querySelectorAll('#parents-list .list-item');
    return Array.from(items).map(item => ({
        name: item.querySelector('.parent-name-input').value,
        role: item.querySelector('.parent-role-input').value
    }));
}

window.removeParent = function(idx) {
    weddingData.parents.splice(idx, 1);
    buildParentsList();
};

// =============================================
// SCHEDULE LIST
// =============================================
function buildScheduleList() {
    const container = document.getElementById('schedule-list');
    container.innerHTML = '';

    (weddingData.schedule || []).forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'list-item';
        el.innerHTML = `
            <span class="drag-handle"><i class="fas fa-grip-vertical"></i></span>
            <div class="list-item-fields" style="grid-template-columns: 1fr 1fr 120px 110px;">
                <input type="text" class="sched-en" value="${escapeAttr(item.title_en)}" placeholder="Title EN">
                <input type="text" class="sched-th" value="${escapeAttr(item.title_th)}" placeholder="Title TH">
                <input type="text" class="sched-time" value="${escapeAttr(item.time)}" placeholder="เวลา">
                <input type="text" class="sched-icon" value="${escapeAttr(item.icon)}" placeholder="icon class">
            </div>
            <button class="btn-icon" onclick="removeSchedule(${idx})" title="ลบ"><i class="fas fa-trash" style="color:var(--danger);font-size:0.8rem;"></i></button>
        `;
        container.appendChild(el);
    });

    new Sortable(container, { handle: '.drag-handle', animation: 200 });
}

function collectSchedule() {
    const items = document.querySelectorAll('#schedule-list .list-item');
    return Array.from(items).map(item => ({
        title_en: item.querySelector('.sched-en').value,
        title_th: item.querySelector('.sched-th').value,
        time: item.querySelector('.sched-time').value,
        icon: item.querySelector('.sched-icon').value
    }));
}

window.removeSchedule = function(idx) {
    weddingData.schedule.splice(idx, 1);
    buildScheduleList();
};

// =============================================
// THEME COLORS
// =============================================
function buildThemeColors() {
    const container = document.getElementById('theme-colors-editor');
    container.innerHTML = '';

    (weddingData.venue?.theme_colors || []).forEach((color, idx) => {
        const item = document.createElement('div');
        item.className = 'color-editor-item';
        item.innerHTML = `
            <input type="color" value="${color}" class="color-picker">
            <input type="text" value="${color}" class="color-hex">
            <button class="btn-icon" onclick="removeColor(${idx})" title="ลบ"><i class="fas fa-times" style="font-size:0.7rem;"></i></button>
        `;
        // Sync color picker and text
        const picker = item.querySelector('.color-picker');
        const hex = item.querySelector('.color-hex');
        picker.addEventListener('input', () => { hex.value = picker.value; });
        hex.addEventListener('input', () => { picker.value = hex.value; });
        container.appendChild(item);
    });
}

function collectThemeColors() {
    const items = document.querySelectorAll('.color-editor-item');
    return Array.from(items).map(item => item.querySelector('.color-hex').value);
}

window.removeColor = function(idx) {
    weddingData.venue.theme_colors.splice(idx, 1);
    buildThemeColors();
};

// =============================================
// SECTION TOGGLES
// =============================================
function buildSectionToggles() {
    const container = document.getElementById('section-toggles');
    container.innerHTML = '';

    const labels = {
        hero: 'Hero', music: 'เพลง', quotes: 'Quotes', countdown: 'Countdown',
        parents: 'ผู้ใหญ่', couple: 'บ่าวสาว', schedule: 'กำหนดการ',
        venue: 'สถานที่', gallery: 'Gallery', wishes: 'อวยพร', footer: 'Footer'
    };

    const visible = weddingData.settings?.sections_visible || {};
    Object.keys(labels).forEach(key => {
        const checked = visible[key] !== false;
        const item = document.createElement('div');
        item.className = 'toggle-item';
        item.innerHTML = `
            <div class="toggle-switch">
                <input type="checkbox" id="toggle-${key}" ${checked ? 'checked' : ''} data-section="${key}">
                <span class="toggle-slider"></span>
            </div>
            <label for="toggle-${key}">${labels[key]}</label>
        `;
        container.appendChild(item);
    });
}

function collectSectionToggles() {
    const toggles = {};
    document.querySelectorAll('#section-toggles input[type="checkbox"]').forEach(cb => {
        toggles[cb.dataset.section] = cb.checked;
    });
    return toggles;
}

// =============================================
// GALLERY EDITOR — GROUPS + DRAG & DROP + RESIZE + CROP
// =============================================

// Auto-migrate old flat layout → groups
function migrateGalleryToGroups() {
    if (!weddingData.gallery) weddingData.gallery = {};
    if (weddingData.gallery.groups) return; // Already migrated

    const oldLayout = weddingData.gallery.layout || [];
    weddingData.gallery.groups = [{
        name: 'All Photos',
        layout: oldLayout.map(item => ({
            ...item,
            crop: item.crop || { scale: 1, x: 0, y: 0, rotate: 0 }
        }))
    }];
    delete weddingData.gallery.layout; // Remove old key
}

function buildGalleryEditor() {
    migrateGalleryToGroups();
    const container = document.getElementById('gallery-groups-container');
    container.innerHTML = '';

    const groups = weddingData.gallery.groups || [];
    const cols = weddingData.gallery?.columns || 3;

    groups.forEach((group, gIdx) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'gallery-group';
        groupEl.dataset.groupIndex = gIdx;

        // Group header with upload button
        const header = document.createElement('div');
        header.className = 'gallery-group-header';
        header.innerHTML = `
            <i class="fas fa-layer-group" style="color:var(--accent-light);"></i>
            <input type="text" value="${escapeAttr(group.name)}" placeholder="ชื่อชุดรูป..." onchange="renameGalleryGroup(${gIdx}, this.value)">
            <button class="gallery-group-upload-btn" onclick="triggerGroupUpload(${gIdx})" title="เพิ่มรูปในชุดนี้"><i class="fas fa-plus"></i> เพิ่มรูป</button>
            <input type="file" class="gallery-group-file-input" data-group="${gIdx}" accept="image/*" multiple style="display:none;">
            <button class="btn-icon" onclick="removeGalleryGroup(${gIdx})" title="ลบชุดรูป"><i class="fas fa-trash"></i></button>
        `;
        groupEl.appendChild(header);

        // Wire up this group's file input
        const fileInput = header.querySelector('.gallery-group-file-input');
        fileInput.addEventListener('change', (e) => uploadToGroup(gIdx, e.target));

        const quoteSection = document.createElement('div');
        quoteSection.style.padding = '0 15px 15px 45px';
        quoteSection.innerHTML = `
            <textarea placeholder="ประโยคคำพูด หรือ เรื่องราวดีๆ สำหรับรูปภาพชุดนี้... (เว้นว่างได้)" rows="2" style="width:100%; max-width:100%; padding:10px; font-family:inherit; border:1px solid var(--border); border-radius:var(--radius); font-size:0.9rem; background:var(--bg);" onchange="updateGroupQuote(${gIdx}, this.value)">${group.quote_text ? group.quote_text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : ''}</textarea>
        `;
        groupEl.appendChild(quoteSection);

        // Grid editor for this group
        const editorEl = document.createElement('div');
        editorEl.className = 'gallery-editor';
        editorEl.id = `gallery-editor-group-${gIdx}`;
        editorEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        (group.layout || []).forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = 'gallery-editor-item';
            el.dataset.index = idx;
            el.dataset.group = gIdx;

            el.innerHTML = `
                <img src="../${item.src}" alt="Gallery ${idx}" loading="lazy">
                <div class="gallery-item-drag"><i class="fas fa-grip-vertical"></i></div>
                <div class="gallery-item-controls">
                    <button class="btn-icon" onclick="removeGalleryItem(${gIdx}, ${idx})" title="ลบ"><i class="fas fa-trash" style="color:var(--danger);font-size:0.7rem;"></i></button>
                </div>
            `;

            editorEl.appendChild(el);
        });

        groupEl.appendChild(editorEl);
        container.appendChild(groupEl);

        // Sortable for this group's editor
        new Sortable(editorEl, {
            animation: 250,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            handle: '.gallery-item-drag',
            group: 'gallery-items',
            onEnd: () => {
                reorderGroupData(gIdx, editorEl);
                updateGalleryPreview();
            }
        });
    });

    updateGalleryPreview();
}

// Group management
window.addGalleryGroup = function() {
    migrateGalleryToGroups();
    weddingData.gallery.groups.push({ name: 'ชุดใหม่', layout: [] });
    buildGalleryEditor();
    showToast('เพิ่มชุดรูปใหม่ ✅', 'success');
};

window.removeGalleryGroup = function(gIdx) {
    if (weddingData.gallery.groups.length <= 1) {
        showToast('ต้องมีอย่างน้อย 1 ชุดรูป', 'error');
        return;
    }
    if (!confirm('ลบชุดรูปนี้? (รูปทั้งหมดในชุดจะถูกลบ)')) return;
    weddingData.gallery.groups.splice(gIdx, 1);
    buildGalleryEditor();
};

window.renameGalleryGroup = function(gIdx, name) {
    if (weddingData.gallery.groups[gIdx]) {
        weddingData.gallery.groups[gIdx].name = name;
        updateGalleryPreview();
    }
};

window.updateGroupQuote = function(gIdx, text) {
    if (weddingData.gallery.groups[gIdx]) {
        weddingData.gallery.groups[gIdx].quote_text = text;
        updateGalleryPreview();
    }
};

// Per-group upload
window.triggerGroupUpload = function(gIdx) {
    const input = document.querySelector(`.gallery-group-file-input[data-group="${gIdx}"]`);
    if (input) input.click();
};

async function uploadToGroup(gIdx, inputEl) {
    const files = inputEl.files;
    if (!files.length) return;

    const maxSize = 25 * 1024 * 1024;
    let uploadCount = 0;

    for (const file of files) {
        if (file.size > maxSize) {
            showToast(`ข้าม ${file.name} (ใหญ่เกิน 25MB)`, 'error');
            continue;
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('target', 'gallery');

        try {
            const res = await fetch(`${API_URL}?action=upload_image`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                migrateGalleryToGroups();
                if (!weddingData.gallery.groups[gIdx]) return;
                weddingData.gallery.groups[gIdx].layout.push({
                    src: data.path
                });
                uploadCount++;
            }
        } catch {}
    }

    buildGalleryEditor();
    if (uploadCount > 0) {
        showToast(`อัปโหลด ${uploadCount} รูปในชุด "${weddingData.gallery.groups[gIdx]?.name}" สำเร็จ! 📸`, 'success');
    }
    inputEl.value = '';
}

window.removeGalleryItem = function(gIdx, idx) {
    weddingData.gallery.groups[gIdx]?.layout.splice(idx, 1);
    buildGalleryEditor();
};

function reorderGroupData(gIdx, editorEl) {
    const items = editorEl.querySelectorAll('.gallery-editor-item');
    const newLayout = [];
    items.forEach(item => {
        const origIdx = parseInt(item.dataset.index);
        const origGroup = parseInt(item.dataset.group);
        const origItem = weddingData.gallery.groups[origGroup]?.layout[origIdx];
        if (origItem) {
            newLayout.push({ ...origItem });
        }
    });
    weddingData.gallery.groups[gIdx].layout = newLayout;
    items.forEach((item, i) => {
        item.dataset.index = i;
        item.dataset.group = gIdx;
    });
}

function updateGalleryPreview() {
    const preview = document.getElementById('gallery-preview');
    const cols = parseInt(document.getElementById('gallery-columns').value) || 3;
    const gap = parseInt(document.getElementById('gallery-gap').value) || 8;
    preview.innerHTML = '';

    migrateGalleryToGroups();
    const groups = weddingData.gallery?.groups || [];

    groups.forEach(group => {
        // Group title in preview
        if (groups.length > 1) {
            const title = document.createElement('div');
            title.style.cssText = `grid-column: 1 / -1; text-align: center; padding: 8px; font-weight: 600; color: var(--accent-light); font-size: 0.85rem; border-bottom: 1px solid var(--border); margin-bottom: 5px;`;
            title.textContent = group.name;
            preview.appendChild(title);
        }

        // Create sub-grid for this group
        const subGrid = document.createElement('div');
        subGrid.style.cssText = `display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: ${gap}px; grid-column: 1 / -1;`;

        (group.layout || []).forEach(item => {
            const div = document.createElement('div');
            if (item.col_span > 1) div.classList.add(`gp-span-${item.col_span}`);
            if (item.row_span > 1) div.classList.add(`gp-row-${item.row_span}`);
            const crop = item.crop || { scale: 1, x: 0, y: 0, rotate: 0 };
            const hasCrop = crop.scale !== 1 || crop.x !== 0 || crop.y !== 0 || crop.rotate !== 0;
            let imgStyle = '';
            if (hasCrop) {
                imgStyle = `object-position: calc(50% + ${crop.x}px) calc(50% + ${crop.y}px); transform: scale(${crop.scale}) rotate(${crop.rotate}deg); transform-origin: center center;`;
            } else {
                const posX = item.pos_x ?? 50;
                const posY = item.pos_y ?? 50;
                imgStyle = `object-position: ${posX}% ${posY}%;`;
            }
            div.innerHTML = `<img src="../${item.src}" alt="" style="${imgStyle}">`;
            subGrid.appendChild(div);
        });

        preview.appendChild(subGrid);
    });
}

function collectGallery() {
    migrateGalleryToGroups();
    return {
        groups: weddingData.gallery?.groups || [],
        columns: parseInt(document.getElementById('gallery-columns').value) || 3,
        gap: parseInt(document.getElementById('gallery-gap').value) || 8
    };
}

// Gallery columns/gap change → update preview
document.getElementById('gallery-columns')?.addEventListener('change', () => {
    const cols = document.getElementById('gallery-columns').value;
    // Update all group editors
    document.querySelectorAll('[id^="gallery-editor-group-"]').forEach(ed => {
        ed.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    });
    updateGalleryPreview();
});
document.getElementById('gallery-gap')?.addEventListener('input', updateGalleryPreview);

// "Add group" button
document.getElementById('add-gallery-group-btn')?.addEventListener('click', () => {
    addGalleryGroup();
});

// =============================================
// CROP MODAL LOGIC
// =============================================
let cropState = { scale: 1, x: 0, y: 0, rotate: 0 };
let cropDragging = false;
let cropDragStart = { x: 0, y: 0 };
let cropCallback = null;
let cropShape = 'rectangle';

function setupCropModal() {
    const canvas = document.getElementById('crop-canvas');

    // Mouse drag
    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        cropDragging = true;
        cropDragStart = { x: e.clientX - cropState.x, y: e.clientY - cropState.y };
        canvas.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (!cropDragging) return;
        cropState.x = e.clientX - cropDragStart.x;
        cropState.y = e.clientY - cropDragStart.y;
        applyCropTransform();
    });
    document.addEventListener('mouseup', () => {
        cropDragging = false;
        canvas.style.cursor = 'grab';
    });

    // Touch drag
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        cropDragging = true;
        cropDragStart = { x: t.clientX - cropState.x, y: t.clientY - cropState.y };
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
        if (!cropDragging) return;
        const t = e.touches[0];
        cropState.x = t.clientX - cropDragStart.x;
        cropState.y = t.clientY - cropDragStart.y;
        applyCropTransform();
    }, { passive: false });
    document.addEventListener('touchend', () => { cropDragging = false; });

    // Zoom with mouse wheel
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        cropState.scale = Math.max(1, Math.min(5, +(cropState.scale + delta).toFixed(1)));
        applyCropTransform();
    }, { passive: false });

    // Range Sliders
    const zoomSlider = document.getElementById('crop-slider-zoom');
    const xSlider = document.getElementById('crop-slider-x');
    const ySlider = document.getElementById('crop-slider-y');

    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            cropState.scale = parseFloat(e.target.value);
            applyCropTransform();
        });
    }
    if (xSlider) {
        xSlider.addEventListener('input', (e) => {
            cropState.x = parseInt(e.target.value, 10);
            applyCropTransform();
        });
    }
    if (ySlider) {
        ySlider.addEventListener('input', (e) => {
            cropState.y = parseInt(e.target.value, 10);
            applyCropTransform();
        });
    }
    document.getElementById('crop-rotate-right').addEventListener('click', () => {
        cropState.rotate = (cropState.rotate + 90) % 360;
        applyCropTransform();
    });
    document.getElementById('crop-rotate-left').addEventListener('click', () => {
        cropState.rotate = (cropState.rotate - 90 + 360) % 360;
        applyCropTransform();
    });
    document.getElementById('crop-reset').addEventListener('click', () => {
        cropState = { scale: 1, x: 0, y: 0, rotate: 0 };
        applyCropTransform();
    });
    document.getElementById('crop-cancel').addEventListener('click', closeCropModal);
    document.getElementById('crop-save').addEventListener('click', () => {
        if (cropCallback) cropCallback({ ...cropState });
        closeCropModal();
        showToast('บันทึกการครอปสำเร็จ! ✅', 'success');
    });
}

function applyCropTransform() {
    const img = document.getElementById('crop-image');
    // translate(-50%,-50%) centers the image on the canvas
    // then user's translate, scale, rotate are applied on top
    img.style.transform = `translate(-50%, -50%) translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.scale}) rotate(${cropState.rotate}deg)`;

    // Keep sliders synced
    const zoomSlider = document.getElementById('crop-slider-zoom');
    const xSlider = document.getElementById('crop-slider-x');
    const ySlider = document.getElementById('crop-slider-y');
    if (zoomSlider) zoomSlider.value = cropState.scale;
    if (xSlider) xSlider.value = cropState.x;
    if (ySlider) ySlider.value = cropState.y;
}

function openCropModalGeneric(imgSrc, shape, initialCrop, callback) {
    cropState = { ...initialCrop };
    cropCallback = callback;
    cropShape = shape;

    const overlay = document.getElementById('crop-modal-overlay');
    const img = document.getElementById('crop-image');
    const frame = document.getElementById('crop-frame');

    frame.className = `crop-frame ${shape}`;
    overlay.classList.add('active');

    // Size image to cover canvas when loaded
    img.onload = () => {
        const canvas = document.getElementById('crop-canvas');
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;

        // Calculate scale to cover the entire canvas
        const coverRatio = Math.max(cw / nw, ch / nh);
        img.style.width = Math.ceil(nw * coverRatio) + 'px';
        img.style.height = Math.ceil(nh * coverRatio) + 'px';

        applyCropTransform();
    };

    // Force reload if same src
    img.src = '';
    img.src = imgSrc;
}

function closeCropModal() {
    document.getElementById('crop-modal-overlay').classList.remove('active');
    cropCallback = null;
}

// Open crop for couple images
window.openCropModal = function(target, shape) {
    const person = weddingData.couple?.[target];
    if (!person?.image) {
        showToast('กรุณาอัปโหลดรูปก่อน', 'error');
        return;
    }

    const imgSrc = '../' + person.image;
    const initialCrop = person.crop || { scale: 1, x: 0, y: 0, rotate: 0 };

    openCropModalGeneric(imgSrc, shape, initialCrop, (cropData) => {
        weddingData.couple[target].crop = cropData;
        // Update admin circle preview — only apply scale for visual feedback
        // Full transform (with translate) is applied on the frontend
        const imgEl = document.getElementById(`${target}-image-preview`);
        if (imgEl) {
            imgEl.style.objectPosition = `calc(50% + ${cropData.x}px) calc(50% + ${cropData.y}px)`;
            imgEl.style.transform = `scale(${cropData.scale}) rotate(${cropData.rotate}deg)`;
        }
    });
};



// =============================================
// IMAGE UPLOADS
// =============================================
function setupImageUploads() {
    document.querySelectorAll('.image-upload-area').forEach(area => {
        const fileInput = area.querySelector('.file-input');
        if (!fileInput || fileInput.id === 'music-file-input') return;

        const target = fileInput.dataset.target;

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Client-side file size check (25MB)
            const maxSize = 25 * 1024 * 1024;
            if (file.size > maxSize) {
                showToast(`ไฟล์ใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(1)}MB) — สูงสุด 25MB`, 'error');
                fileInput.value = '';
                return;
            }

            // Show progress for large files
            const isLarge = file.size > 5 * 1024 * 1024;
            if (isLarge) {
                showToast(`กำลังอัปโหลด ${(file.size / 1024 / 1024).toFixed(1)}MB... กรุณารอสักครู่`, 'success');
            }

            const formData = new FormData();
            formData.append('image', file);
            formData.append('target', target);

            try {
                const res = await fetch(`${API_URL}?action=upload_image`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    showToast('อัปโหลดสำเร็จ! 📸', 'success');

                    // Update data
                    if (target === 'hero') {
                        weddingData.hero.hero_image = data.path;
                        const preview = area.querySelector('.upload-preview');
                        if (preview) preview.src = '../' + data.path;
                    }
                    if (target === 'bride') {
                        weddingData.couple.bride.image = data.path;
                        const circleImg = document.getElementById('bride-image-preview');
                        if (circleImg) {
                            circleImg.src = '../' + data.path;
                            circleImg.style.objectPosition = '50% 50%';
                        }
                        document.getElementById('bride-pos-x').value = 50;
                        document.getElementById('bride-pos-y').value = 50;
                        weddingData.couple.bride.pos_x = 50;
                        weddingData.couple.bride.pos_y = 50;
                    }
                    if (target === 'groom') {
                        weddingData.couple.groom.image = data.path;
                        const circleImg = document.getElementById('groom-image-preview');
                        if (circleImg) {
                            circleImg.src = '../' + data.path;
                            circleImg.style.objectPosition = '50% 50%';
                        }
                        document.getElementById('groom-pos-x').value = 50;
                        document.getElementById('groom-pos-y').value = 50;
                        weddingData.couple.groom.pos_x = 50;
                        weddingData.couple.groom.pos_y = 50;
                    }

                } else {
                    showToast(data.error || 'อัปโหลดล้มเหลว', 'error');
                }
            } catch {
                showToast('เกิดข้อผิดพลาด — ตรวจสอบขนาดไฟล์หรือ PHP upload limit', 'error');
            }
        });
    });
}

// =============================================
// GALLERY UPLOAD
// =============================================
function setupGalleryUpload() {
    const input = document.getElementById('gallery-upload-input');
    if (!input) return;

    input.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files.length) return;

        const maxSize = 25 * 1024 * 1024;
        let uploadCount = 0;
        let skipCount = 0;

        // Check all file sizes first
        for (const file of files) {
            if (file.size > maxSize) {
                skipCount++;
                continue;
            }
        }
        if (skipCount > 0) {
            showToast(`ข้าม ${skipCount} ไฟล์ที่ใหญ่เกิน 25MB`, 'error');
        }

        // Calculate total upload size
        let totalSize = 0;
        for (const file of files) {
            if (file.size <= maxSize) totalSize += file.size;
        }
        if (totalSize > 50 * 1024 * 1024) {
            showToast(`กำลังอัปโหลด ${(totalSize / 1024 / 1024).toFixed(0)}MB... กรุณารอสักครู่`, 'success');
        }

        for (const file of files) {
            if (file.size > maxSize) continue;

            const formData = new FormData();
            formData.append('image', file);
            formData.append('target', 'gallery');

            try {
                const res = await fetch(`${API_URL}?action=upload_image`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    migrateGalleryToGroups();
                    if (!weddingData.gallery.groups.length) {
                        weddingData.gallery.groups.push({ name: 'All Photos', layout: [] });
                    }
                    weddingData.gallery.groups[0].layout.push({
                        src: data.path
                    });
                    uploadCount++;
                }
            } catch {}
        }

        buildGalleryEditor();
        if (uploadCount > 0) {
            showToast(`อัปโหลด ${uploadCount} รูปสำเร็จ! 📸`, 'success');
        }
        input.value = '';
    });
}

// =============================================
// MUSIC UPLOAD
// =============================================
function setupMusicUpload() {
    const input = document.getElementById('music-file-input');
    if (!input) return;

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('music', file);

        try {
            const res = await fetch(`${API_URL}?action=upload_music`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                showToast('อัปโหลดเพลงสำเร็จ! 🎵', 'success');
                document.getElementById('music-url').value = data.path;
                weddingData.music.url = data.path;

                const preview = document.getElementById('music-player-preview');
                preview.innerHTML = `<audio controls style="width:100%;"><source src="../${data.path}" type="audio/mpeg"></audio>`;
            } else {
                showToast(data.error || 'อัปโหลดเพลงล้มเหลว', 'error');
            }
        } catch {
            showToast('เกิดข้อผิดพลาด', 'error');
        }
    });
}

// =============================================
// WISHES (Admin)
// =============================================
function loadWishesAdmin() {
    fetch(`${API_URL}?action=load_wishes`)
        .then(r => r.json())
        .then(data => {
            const list = document.getElementById('wishes-admin-list');
            const wishes = data.wishes || [];

            if (wishes.length === 0) {
                list.innerHTML = '<p class="help-text">ยังไม่มีข้อความอวยพร</p>';
                return;
            }

            list.innerHTML = wishes.map(w => `
                <div class="wish-admin-item">
                    <div class="wish-content">
                        <div class="wish-name"><i class="fas fa-heart" style="margin-right:5px;font-size:0.7rem;"></i>${w.name}</div>
                        <div class="wish-msg">${w.message}</div>
                        <div class="wish-time">${w.time}</div>
                    </div>
                </div>
            `).join('');
        });
}

// =============================================
// CHANGE PASSWORD
// =============================================
function setupChangePassword() {
    document.getElementById('change-password-btn').addEventListener('click', () => {
        const newPass = document.getElementById('new-password').value;
        if (newPass.length < 6) {
            showToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
            return;
        }

        fetch(`${API_URL}?action=change_password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_password: newPass })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                showToast('เปลี่ยนรหัสผ่านสำเร็จ! 🔒', 'success');
                document.getElementById('new-password').value = '';
            } else {
                showToast(data.error || 'เกิดข้อผิดพลาด', 'error');
            }
        });
    });
}

// =============================================
// COUPLE IMAGE POSITION SLIDERS
// =============================================
function setupCouplePositionSliders() {
    document.querySelectorAll('.pos-slider').forEach(slider => {
        slider.addEventListener('input', () => {
            const target = slider.dataset.target; // 'bride' or 'groom'
            const axis = slider.dataset.axis;     // 'x' or 'y'
            const val = slider.value;

            // Update data
            if (!weddingData.couple) weddingData.couple = {};
            if (!weddingData.couple[target]) weddingData.couple[target] = {};
            weddingData.couple[target][`pos_${axis}`] = parseInt(val);

            // Update preview
            const imgEl = document.getElementById(`${target}-image-preview`);
            if (imgEl) {
                const posX = document.getElementById(`${target}-pos-x`).value;
                const posY = document.getElementById(`${target}-pos-y`).value;
                imgEl.style.objectPosition = `${posX}% ${posY}%`;
            }
        });
    });
}

// =============================================
// HELPERS
// =============================================
function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('admin-toast');
    toast.textContent = message;
    toast.className = `admin-toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}
