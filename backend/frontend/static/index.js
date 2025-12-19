/* index.js - full updated frontend for AVK EVENTS
   - Reads items returned by /api/media as objects { type, url, original_name, file_size, mime_type }
   - Renders photos and videos reliably
   - Shows filename/size/mime under thumbnails and in modal
   - Defensive: skips bad items like "[object Object]"
*/

const categories = [
  { id: 'marriage', name: 'Marriage Decorations', icon: '💒' },
  { id: 'haldi', name: 'Haldi Decorations', icon: '🌼' },
  { id: 'engagement', name: 'Engagement Decorations', icon: '💍' },
  { id: 'birthday', name: 'Birthday Decorations', icon: '🎂' },
  { id: 'reception', name: 'Reception Decorations', icon: '🎊' },
  { id: 'temple', name: 'Temple Decorations', icon: '🛕' },
  { id: 'home', name: 'Home Decorations', icon: '🏡' }
];

let currentCategory = null;
let currentTab = 'photos';
let isAdmin = false;

document.addEventListener('DOMContentLoaded', init);

function init() {
  renderCategories();
  populateAdminCategories();
  checkAuth().then(updateMenu);
}

/* --------------------
   Utility helpers
   -------------------- */
function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  const b = Number(bytes);
  if (b === 0) return '0 B';
  const sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i];
}

function mimeTypeFromUrl(url) {
  const ext = (url.split('.').pop() || '').toLowerCase();
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'ogg' || ext === 'ogv') return 'video/ogg';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  return '';
}

function createVideoElement(url) {
  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.style.maxWidth = '320px';
  video.style.maxHeight = '240px';
  video.style.display = 'block';

  const source = document.createElement('source');
  source.src = url;
  const t = mimeTypeFromUrl(url);
  if (t) source.type = t;
  video.appendChild(source);

  video.addEventListener('error', (ev) => {
    console.error('Video error for', url, ev);
    try { console.error('MediaError code:', video.error && video.error.code); } catch(e) {}
  });
  video.addEventListener('loadedmetadata', () => console.log('Video metadata loaded:', url, 'duration=', video.duration));
  return video;
}

/* --------------------
   Render categories
   -------------------- */
function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  grid.innerHTML = categories.map(cat => `
    <div class="category-card" onclick="viewCategory('${cat.id}')">
      <div class="category-icon">${cat.icon}</div>
      <div class="category-info">
        <h3>${cat.name}</h3>
        <p>Click to view gallery</p>
      </div>
    </div>
  `).join('');
}

function populateAdminCategories() {
  const select = document.getElementById('uploadCategory');
  if (!select) return;
  select.innerHTML = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

/* --------------------
   Auth
   -------------------- */
async function checkAuth() {
  try {
    const res = await fetch('/api/check-auth');
    const data = await res.json();
    isAdmin = !!data.authenticated;
    return isAdmin;
  } catch (e) {
    console.warn('Auth check failed', e);
    return false;
  }
}

function updateMenu() {
  const menuBtn = document.getElementById('adminMenuBtn');
  if (!menuBtn) return;
  menuBtn.textContent = isAdmin ? 'Admin Panel' : 'Admin Login';
}

/* --------------------
   Category / Gallery
   -------------------- */
function viewCategory(categoryId) {
  currentCategory = categoryId;
  const cat = categories.find(c => c.id === categoryId);
  document.getElementById('hero').classList.add('hidden');
  document.getElementById('categoriesSection').classList.add('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('galleryView').classList.remove('hidden');
  document.getElementById('galleryTitle').textContent = cat ? cat.name : '';
  currentTab = 'photos';
  setActiveTabButton('photos');
  loadGallery();
}

function switchTab(tab) {
  currentTab = tab;
  setActiveTabButton(tab);
  loadGallery();
}

function setActiveTabButton(tab) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => btn.classList.remove('active'));
  if (tab === 'photos' && tabs[0]) tabs[0].classList.add('active');
  if (tab === 'videos' && tabs[1]) tabs[1].classList.add('active');
}

/* --------------------
   loadGallery - full updated
   -------------------- */
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-gallery">Loading...</div>';

  try {
    const res = await fetch(`/api/media/${currentCategory}/${currentTab}`);
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const items = await res.json();

    console.log('Gallery items from API:', items);
    grid.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
      grid.innerHTML = '<div class="empty-gallery">No content available yet</div>';
      return;
    }

    items.forEach(item => {
      // item expected shape: { type: "photo"|"video", url: "http://...", original_name?, file_size?, mime_type? }
      let url = null;
      let type = null;
      let origName = null;
      let fsize = null;
      let mime = null;

      if (typeof item === 'string') {
        url = item;
        type = url.includes('/videos/') ? 'video' : 'photo';
      } else if (item && typeof item === 'object') {
        url = item.url || item.file_path || item.path || null;
        type = item.type || (url && url.includes('/videos/') ? 'video' : 'photo');
        origName = item.original_name || item.originalName || null;
        fsize = item.file_size || item.fileSize || null;
        mime = item.mime_type || item.mimeType || item.mime || null;
      }

      if (!url || typeof url !== 'string') {
        console.warn('Skipping invalid item from server:', item);
        return;
      }
      if (url === '[object Object]') {
        console.warn('Skipping bad url "[object Object]" from server item:', item);
        return;
      }

      const wrap = document.createElement('div');
      wrap.className = 'gallery-item';

      // display the media element
      if (type === 'photo') {
        const img = document.createElement('img');
        img.src = url;
        img.alt = origName || 'Photo';
        img.style.maxWidth = '240px';
        img.style.maxHeight = '180px';
        img.style.objectFit = 'cover';
        img.loading = 'lazy';
        img.onclick = () => openMedia(url, 'photo', { original_name: origName, file_size: fsize, mime_type: mime });

        img.onerror = function() {
          console.error('Image failed to load:', url);
          this.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 300%22><rect fill=%22%23f0f0f0%22 width=%22300%22 height=%22300%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2220%22>Image</text></svg>';
        };

        wrap.appendChild(img);
      } else if (type === 'video') {
        const vid = createVideoElement(url);
        vid.onclick = () => openMedia(url, 'video', { original_name: origName, file_size: fsize, mime_type: mime });
        wrap.appendChild(vid);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.textContent = origName || url.split('/').pop();
        a.target = '_blank';
        wrap.appendChild(a);
      }

      // metadata caption
      const caption = document.createElement('div');
      caption.className = 'media-caption';
      let captionParts = [];
      if (origName) captionParts.push(origName);
      if (fsize) captionParts.push(formatBytes(fsize));
      if (mime) captionParts.push(mime);
      caption.textContent = captionParts.join(' · ');
      wrap.appendChild(caption);

      grid.appendChild(wrap);
    });

  } catch (err) {
    console.error('Failed to load gallery', err);
    grid.innerHTML = '<div class="empty-gallery">Failed to load content</div>';
  }
}

/* --------------------
   Modal
   -------------------- */
function openMedia(url, type, meta) {
  const modal = document.getElementById('mediaModal');
  const content = document.getElementById('mediaContent');
  if (!modal || !content) return;

  content.innerHTML = '';

  // show metadata
  const metaDiv = document.createElement('div');
  metaDiv.className = 'media-meta';
  const parts = [];
  if (meta && meta.original_name) parts.push(meta.original_name);
  if (meta && (meta.file_size || meta.fileSize)) parts.push(formatBytes(meta.file_size || meta.fileSize));
  if (meta && (meta.mime_type || meta.mimeType || meta.mime)) parts.push(meta.mime_type || meta.mimeType || meta.mime);
  if (parts.length) {
    metaDiv.textContent = parts.join(' · ');
    metaDiv.style.marginBottom = '0.5rem';
    content.appendChild(metaDiv);
  }

  if (type === 'photo') {
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    content.appendChild(img);
  } else {
    const video = createVideoElement(url);
    content.appendChild(video);
    // optionally autoplay:
    // video.play().catch(() => {});
  }

  modal.classList.add('active');
}

function closeMediaModal() {
  const modal = document.getElementById('mediaModal');
  const content = document.getElementById('mediaContent');
  if (modal) modal.classList.remove('active');
  if (content) content.innerHTML = '';
}

/* --------------------
   Navigation & admin UI
   -------------------- */
function backToHome() {
  document.getElementById('hero').classList.remove('hidden');
  document.getElementById('categoriesSection').classList.remove('hidden');
  document.getElementById('galleryView').classList.add('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  currentCategory = null;
  window.scrollTo(0, 0);
}

function updateFileAccept() {
  const type = document.getElementById('uploadType').value;
  const fileInput = document.getElementById('uploadFile');
  if (!fileInput) return;
  fileInput.accept = type === 'photo' ? 'image/*' : 'video/*';
  document.getElementById('filePreview').innerHTML = '';
}

function previewFile() {
  const file = document.getElementById('uploadFile').files[0];
  const preview = document.getElementById('filePreview');
  if (!preview) return;
  const type = document.getElementById('uploadType').value;
  preview.innerHTML = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    if (type === 'photo') {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width:200px;max-height:150px;">`;
    } else {
      preview.innerHTML = `<video src="${e.target.result}" controls style="max-width:320px;max-height:240px;"></video>`;
    }
  };
  reader.readAsDataURL(file);
}

/* --------------------
   Auth / Upload
   -------------------- */
async function login() {
  const email = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (!email || !password) { alert('Enter email and password'); return; }
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    const data = await res.json();
    if (data.success) {
      isAdmin = true;
      localStorage.setItem('token', data.token);
      closeModal();
      showAdminPanel();
      updateMenu();
    } else {
      alert('Invalid credentials');
    }
  } catch (e) {
    console.error('Login error', e);
    alert('Login failed');
  }
}

async function forgotPassword() {
  const email = document.getElementById('username').value;
  if (!email) { alert('Enter email'); return; }
  try {
    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    alert(data.message || 'Check email');
  } catch (e) {
    console.error('Forgot error', e);
    alert('Request failed');
  }
}

function showAdminPanel() {
  document.getElementById('hero').classList.add('hidden');
  document.getElementById('categoriesSection').classList.add('hidden');
  document.getElementById('galleryView').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  window.scrollTo(0, 0);
}

async function logout() {
  isAdmin = false;
  localStorage.removeItem('token');
  try { await fetch('/api/logout', { method: 'POST' }); } catch(e) {}
  document.getElementById('hero').classList.remove('hidden');
  document.getElementById('categoriesSection').classList.remove('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  updateMenu();
}

async function uploadContent() {
  const category = document.getElementById('uploadCategory').value;
  const type = document.getElementById('uploadType').value;
  const file = document.getElementById('uploadFile').files[0];
  const uploadBtn = document.getElementById('uploadBtn');
  const statusDiv = document.getElementById('uploadStatus');

  if (!file) { statusDiv.innerHTML = '<div class="upload-status error">Please select a file</div>'; return; }
  if (file.size > 50 * 1024 * 1024) { statusDiv.innerHTML = '<div class="upload-status error">File too large</div>'; return; }

  const token = localStorage.getItem('token');
  if (!token) { alert('Please login'); return; }

  const form = new FormData();
  form.append('file', file);
  form.append('category', category);
  form.append('type', type);

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';
  statusDiv.innerHTML = '<div class="upload-status">Uploading...</div>';

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    const data = await res.json();
    if (data.success) {
      statusDiv.innerHTML = '<div class="upload-status success">Uploaded</div>';
      document.getElementById('uploadFile').value = '';
      document.getElementById('filePreview').innerHTML = '';
      setTimeout(() => {
        currentTab = type === 'photo' ? 'photos' : 'videos';
        viewCategory(category);
      }, 800);
    } else {
      statusDiv.innerHTML = `<div class="upload-status error">${data.message}</div>`;
    }
  } catch (e) {
    console.error('Upload failed', e);
    statusDiv.innerHTML = '<div class="upload-status error">Upload error</div>';
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload';
  }
}

/* --------------------
   UI helpers
   -------------------- */
function toggleMenu() { document.getElementById('mobileMenu').classList.toggle('hidden'); }
function showAdminLogin() { toggleMenu(); if (isAdmin) showAdminPanel(); else document.getElementById('loginModal').classList.add('active'); }
function closeModal() { document.getElementById('loginModal').classList.remove('active'); }
