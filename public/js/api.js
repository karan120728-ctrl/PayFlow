// API Abstraction & UI Helpers

const API_BASE = 'https://payflow-t6sj.onrender.com';
window.API_BASE = API_BASE;

function getToken() {
  return localStorage.getItem('payflow_token');
}

function setToken(token) {
  localStorage.setItem('payflow_token', token);
}

function logout() {
  localStorage.removeItem('payflow_token');
  window.location.href = '/pages/login.html';
}

async function api(endpoint, method = 'GET', body = null) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();
    
    // Auto logout on unauthorized
    if (res.status === 401) {
      logout();
      return;
    }

    if (!data.success) {
      showToast(data.message || 'Error occurred', 'error');
      throw new Error(data.message);
    }
    
    return data.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

// Simple Toast Notification
function showToast(message, type = 'success') {
  const toastContainer = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `transform transition-all duration-300 translate-y-10 opacity-0 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium ${
    type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
  } mb-3`;
  
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-lg"></i>
    ${message}
  `;
  
  toastContainer.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  }, 10);
  
  // Animate out
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-none';
  document.body.appendChild(container);
  return container;
}

// Protect routes
function requireAuth() {
  if (!getToken() && !window.location.pathname.includes('login.html')) {
    window.location.href = '/pages/login.html';
  }
}

async function loadSidebar() {
  const container = document.getElementById('sidebar-container');
  if (!container) return;
  try {
    const res = await fetch('/components/sidebar.html');
    const html = await res.text();
    container.innerHTML = html;
    
    // Create overlay if not exists
    if (!document.getElementById('sidebar-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden opacity-0 transition-opacity duration-300';
      overlay.onclick = closeSidebar;
      document.body.appendChild(overlay);
    }

    // Highlight active link
    const path = window.location.pathname;
    container.querySelectorAll('a').forEach(a => {
      if (a.getAttribute('href') === path) {
        a.classList.add('bg-blue-600', 'text-white');
        a.classList.remove('text-slate-300', 'hover:bg-slate-800');
      }
    });

    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  } catch(e) { console.error("Failed to load sidebar"); }
}

function toggleSidebar() {
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('opacity-100'), 10);
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar && overlay) {
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    overlay.classList.remove('opacity-100');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }
}

// Initial checks
requireAuth();
