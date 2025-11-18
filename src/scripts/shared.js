/**
 * Shared utility functions for AccelRFx
 * Centralized error handling, API communication, and UI helpers
 */

// ========================
// API Fetch Wrappers
// ========================

/**
 * Wrapper around fetch with standardized error handling and auth
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function apiFetch(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'API request failed');
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    showError(error.message || 'Network error occurred');
    throw error;
  }
}

/**
 * GET request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>}
 */
export function get(endpoint, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = query ? `${endpoint}?${query}` : endpoint;
  return apiFetch(url, { method: 'GET' });
}

/**
 * POST request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>}
 */
export function post(endpoint, data = {}) {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ========================
// UI Helpers
// ========================

/**
 * Show error toast notification
 * @param {string} message - Error message to display
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
export function showError(message, duration = 5000) {
  const toast = document.createElement('div');
  toast.className = 'toast error';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.remove();
    }, duration);
  }, 100);
}

/**
 * Show success toast notification
 * @param {string} message - Success message to display
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showSuccess(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.remove();
    }, duration);
  }, 100);
}

// ========================
// Utility Functions
// ========================

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Time to wait in milliseconds
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Format currency with proper symbols and decimals
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD') {
  // Ensure amount is a number
  const num = Number(amount);
  if (isNaN(num)) return '';
  
  // Format with 2 decimal places
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(num);
}

/**
 * Format date to relative time (e.g., "2 hours ago") or absolute date
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.forceAbsolute - Force absolute date format
 * @returns {string}
 */
export function formatRelativeTime(date, { forceAbsolute = false } = {}) {
  const now = new Date();
  const target = new Date(date);
  
  // If date is invalid, return empty string
  if (isNaN(target.getTime())) return '';
  
  // If forced to use absolute format or date is older than 7 days
  if (forceAbsolute || (now - target) > 7 * 24 * 60 * 60 * 1000) {
    return target.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    });
  }
  
  // Calculate time differences
  const diffInSeconds = Math.floor((now - target) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  // Return appropriate relative time string
  if (diffInSeconds < 60) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  // Default fallback (shouldn't reach here due to the forceAbsolute check above)
  return target.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
}

/**
 * Toggle loading state on an element
 * @param {HTMLElement} element - Element to show loading state on
 * @param {boolean} isLoading - Whether to show loading state
 */
export function setLoading(element, isLoading) {
  if (isLoading) {
    element.setAttribute('data-loading', 'true');
    element.setAttribute('data-original-text', element.textContent);
    element.textContent = 'Loading...';
    element.disabled = true;
  } else {
    element.setAttribute('data-loading', 'false');
    const originalText = element.getAttribute('data-original-text') || '';
    element.textContent = originalText;
    element.disabled = false;
  }
}

/**
 * Safely parse JSON string
 * @param {string} jsonString - JSON string to parse
 * @returns {Object|undefined} Parsed object or undefined if invalid
 */
export function safeJsonParse(jsonString) {
  if (typeof jsonString !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return undefined;
  }
}

// CSS for toast notifications
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 4px;
    color: white;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s, transform 0.3s;
    z-index: 1000;
    max-width: 300px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .toast.show {
    opacity: 1;
    transform: translateY(0);
  }
  
  .toast.error {
    background-color: #ef4444;
  }
  
  .toast.success {
    background-color: #10b981;
  }
  
  [data-loading] {
    position: relative;
    pointer-events: none;
    opacity: 0.7;
  }
  
  [data-loading]::after {
    content: '';
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
    margin-left: 8px;
    vertical-align: middle;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(toastStyles);