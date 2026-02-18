class ApiClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getHealth() {
    return this.request('/health');
  }

  async getLeads(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.needs_human_agent !== undefined) {
      params.append('needs_human_agent', filters.needs_human_agent);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/api/leads?${queryString}` : '/api/leads';
    return this.request(endpoint);
  }

  async getLeadStats() {
    return this.request('/api/leads/stats');
  }

  async updateLead(id, updates) {
    return this.request(`/api/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getMessages(phoneNumber) {
    return this.request(`/api/messages/history/${phoneNumber}`);
  }

  async sendMessage(phoneNumber, message) {
    return this.request('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, message }),
    });
  }

  async broadcastMessage(message, filters = {}) {
    return this.request('/api/messages/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message, filters }),
    });
  }

  async getMessageStatus() {
    return this.request('/api/messages/status');
  }

  async getOrders(phoneNumber = '') {
    const endpoint = phoneNumber ? `/api/orders/${phoneNumber}` : '/api/orders';
    return this.request(endpoint);
  }

  async createOrder(orderData) {
    return this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(orderId, status) {
    return this.request(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }
}

export const apiClient = new ApiClient();

export function setApiBaseUrl(url) {
  apiClient.baseUrl = url;
}
