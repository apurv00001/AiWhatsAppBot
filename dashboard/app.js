import { apiClient, setApiBaseUrl } from './api.js';

const state = {
  currentSection: 'dashboard',
  leads: [],
  orders: [],
  messages: {},
  stats: null,
  selectedLead: null,
};

const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  sections: document.querySelectorAll('.section'),
  statusIndicator: document.getElementById('status-indicator'),
  statTotalLeads: document.getElementById('stat-total-leads'),
  statConverted: document.getElementById('stat-converted'),
  statNeedsHuman: document.getElementById('stat-needs-human'),
  statTotalOrders: document.getElementById('stat-total-orders'),
  recentLeads: document.getElementById('recent-leads'),
  recentOrders: document.getElementById('recent-orders'),
  leadsTable: document.getElementById('leads-table'),
  ordersTable: document.getElementById('orders-table'),
  messagesList: document.getElementById('messages-list'),
  leadsStatusFilter: document.getElementById('leads-status-filter'),
  ordersStatusFilter: document.getElementById('orders-status-filter'),
  dateFilter: document.getElementById('date-filter'),
  settingApiEndpoint: document.getElementById('setting-api-endpoint'),
  settingRefreshInterval: document.getElementById('setting-refresh-interval'),
};

function loadSettings() {
  const savedEndpoint = localStorage.getItem('apiEndpoint') || 'http://localhost:3000';
  const savedInterval = localStorage.getItem('refreshInterval') || '30';

  elements.settingApiEndpoint.value = savedEndpoint;
  elements.settingRefreshInterval.value = savedInterval;

  setApiBaseUrl(savedEndpoint);
}

function saveSettings() {
  localStorage.setItem('apiEndpoint', elements.settingApiEndpoint.value);
  localStorage.setItem('refreshInterval', elements.settingRefreshInterval.value);
  setApiBaseUrl(elements.settingApiEndpoint.value);
  showNotification('Settings saved successfully', 'success');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function updateStatusIndicator(connected) {
  const dot = elements.statusIndicator.querySelector('.status-dot');
  const text = elements.statusIndicator.querySelector('.status-text');

  if (connected) {
    dot.classList.add('connected');
    text.textContent = 'Connected';
  } else {
    dot.classList.remove('connected');
    text.textContent = 'Disconnected';
  }
}

async function testApiConnection() {
  try {
    const response = await apiClient.getHealth();
    updateStatusIndicator(true);
    showNotification('API connection successful!', 'success');
  } catch (error) {
    updateStatusIndicator(false);
    showNotification('API connection failed: ' + error.message, 'error');
  }
}

async function loadDashboard() {
  try {
    const [leadsData, statsData] = await Promise.all([
      apiClient.getLeads(),
      apiClient.getLeadStats(),
    ]);

    state.leads = leadsData.data || [];
    state.stats = statsData.data || {};

    updateDashboardStats();
    renderRecentLeads();
    renderRecentOrders();
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    showNotification('Failed to load dashboard data', 'error');
  }
}

function updateDashboardStats() {
  const stats = state.stats || {};

  elements.statTotalLeads.textContent = stats.total_leads || 0;
  elements.statConverted.textContent = stats.converted_count || 0;
  elements.statNeedsHuman.textContent = stats.needs_human_agent || 0;
  elements.statTotalOrders.textContent = stats.total_orders || 0;
}

function renderRecentLeads() {
  const recentLeads = state.leads.slice(0, 5);

  if (recentLeads.length === 0) {
    elements.recentLeads.innerHTML = '<tr><td colspan="4" class="table-empty">No leads available</td></tr>';
    return;
  }

  elements.recentLeads.innerHTML = recentLeads
    .map(
      (lead) => `
    <tr>
      <td>${lead.customer_name || 'N/A'}</td>
      <td>${lead.city || 'N/A'}</td>
      <td><span class="badge badge-${lead.status || 'new'}">${lead.status || 'new'}</span></td>
      <td>${new Date(lead.updated_at).toLocaleDateString()}</td>
    </tr>
  `
    )
    .join('');
}

function renderRecentOrders() {
  const mockOrders = [
    { id: 'ORD001', customer: 'John Doe', status: 'completed', amount: '$150' },
    { id: 'ORD002', customer: 'Jane Smith', status: 'pending', amount: '$200' },
  ];

  elements.recentOrders.innerHTML = mockOrders
    .map(
      (order) => `
    <tr>
      <td>${order.id}</td>
      <td>${order.customer}</td>
      <td><span class="badge badge-${order.status}">${order.status}</span></td>
      <td>${order.amount}</td>
    </tr>
  `
    )
    .join('');
}

async function loadLeads() {
  try {
    const status = elements.leadsStatusFilter.value;
    const filters = status ? { status } : {};
    const data = await apiClient.getLeads(filters);

    state.leads = data.data || [];
    renderLeadsTable();
  } catch (error) {
    console.error('Failed to load leads:', error);
    showNotification('Failed to load leads', 'error');
  }
}

function renderLeadsTable() {
  if (state.leads.length === 0) {
    elements.leadsTable.innerHTML = '<tr><td colspan="6" class="table-empty">No leads found</td></tr>';
    return;
  }

  elements.leadsTable.innerHTML = state.leads
    .map(
      (lead) => `
    <tr>
      <td>${lead.customer_name || 'N/A'}</td>
      <td>${lead.phone_number || 'N/A'}</td>
      <td>${lead.city || 'N/A'}</td>
      <td><span class="badge badge-${lead.status || 'new'}">${lead.status || 'new'}</span></td>
      <td>${lead.needs_human_agent ? '✅ Yes' : '❌ No'}</td>
      <td>
        <button class="btn-action" onclick="editLead('${lead.id}')">Edit</button>
        <button class="btn-action" onclick="deleteLead('${lead.id}')">Delete</button>
      </td>
    </tr>
  `
    )
    .join('');
}

async function loadOrders() {
  try {
    const data = await apiClient.getOrders();
    state.orders = data.data || [];
    renderOrdersTable();
  } catch (error) {
    console.error('Failed to load orders:', error);
    showNotification('Failed to load orders', 'error');
  }
}

function renderOrdersTable() {
  if (state.orders.length === 0) {
    elements.ordersTable.innerHTML = '<tr><td colspan="6" class="table-empty">No orders found</td></tr>';
    return;
  }

  elements.ordersTable.innerHTML = state.orders
    .map(
      (order) => `
    <tr>
      <td>${order.id || 'N/A'}</td>
      <td>${order.phone_number || 'N/A'}</td>
      <td>${order.product_name || 'N/A'}</td>
      <td><span class="badge badge-${order.status || 'pending'}">${order.status || 'pending'}</span></td>
      <td>${order.total || '0'}</td>
      <td>${new Date(order.created_at).toLocaleDateString()}</td>
    </tr>
  `
    )
    .join('');
}

function switchSection(sectionName) {
  state.currentSection = sectionName;

  elements.navItems.forEach((item) => {
    item.classList.remove('active');
    if (item.dataset.section === sectionName) {
      item.classList.add('active');
    }
  });

  elements.sections.forEach((section) => {
    section.classList.remove('active');
  });

  const activeSection = document.getElementById(`${sectionName}-section`);
  if (activeSection) {
    activeSection.classList.add('active');
  }

  if (sectionName === 'dashboard') {
    loadDashboard();
  } else if (sectionName === 'leads') {
    loadLeads();
  } else if (sectionName === 'orders') {
    loadOrders();
  }
}

function setupEventListeners() {
  elements.navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(item.dataset.section);
    });
  });

  elements.leadsStatusFilter.addEventListener('change', loadLeads);
  elements.ordersStatusFilter.addEventListener('change', loadOrders);
  elements.dateFilter.addEventListener('change', loadDashboard);

  document.getElementById('btn-test-api')?.addEventListener('click', testApiConnection);
  document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
  document.getElementById('btn-add-lead')?.addEventListener('click', () => {
    showNotification('Add lead feature coming soon', 'info');
  });
  document.getElementById('btn-broadcast')?.addEventListener('click', () => {
    showNotification('Broadcast feature coming soon', 'info');
  });
}

async function initialize() {
  loadSettings();
  setupEventListeners();
  testApiConnection();
  loadDashboard();
}

window.editLead = (id) => {
  showNotification(`Edit lead ${id} feature coming soon`, 'info');
};

window.deleteLead = (id) => {
  showNotification(`Delete lead ${id} feature coming soon`, 'info');
};

document.addEventListener('DOMContentLoaded', initialize);
