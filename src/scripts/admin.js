import { rfxService } from '../services/rfxService.js';
import { profileService } from '../services/profileService.js';
import { creditService } from '../services/creditService.js';
import { aiService } from '../services/aiService.js';
import { showToast } from './shared.js';
import { analyticsService } from '../services/analyticsService.js';

class AdminDashboard {
  constructor() {
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.currentSort = { field: 'createdAt', order: 'desc' };
    this.filters = {
      status: 'all',
      dateRange: '30days',
      searchQuery: ''
    };

    this.initializeEventListeners();
    this.loadDashboardData();
  }

  async initializeEventListeners() {
    // Filter controls
    document.getElementById('status-filter')?.addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.loadResponses();
    });

    document.getElementById('date-range-filter')?.addEventListener('change', (e) => {
      this.filters.dateRange = e.target.value;
      this.loadResponses();
    });

    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.filters.searchQuery = e.target.value;
      this.debouncedSearch();
    });

    // Pagination
    document.querySelector('.pagination')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('page-link')) {
        e.preventDefault();
        const page = parseInt(e.target.dataset.page);
        if (!isNaN(page)) {
          this.currentPage = page;
          this.loadResponses();
        }
      }
    });

    // Sortable headers
    document.querySelectorAll('.sortable-header').forEach(header => {
      header.addEventListener('click', () => {
        const field = header.dataset.field;
        if (this.currentSort.field === field) {
          this.currentSort.order = this.currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
          this.currentSort.field = field;
          this.currentSort.order = 'asc';
        }
        this.loadResponses();
      });
    });
  }

  debouncedSearch = this.debounce(() => {
    this.loadResponses();
  }, 300);

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async loadDashboardData() {
    try {
      // Load initial dashboard data
      const [metrics, recentResponses, aiInsights] = await Promise.all([
        this.loadMetrics(),
        this.loadResponses(),
        this.loadAiInsights()
      ]);
      
      this.renderMetrics(metrics);
      this.renderResponses(recentResponses);
      this.initializeCharts(metrics);
      this.renderAiInsights(aiInsights);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    }
  }

  async loadMetrics() {
    try {
      // Fetch metrics from your API
      const response = await fetch('/api/admin/metrics');
      if (!response.ok) throw new Error('Failed to load metrics');
      return await response.json();
    } catch (error) {
      console.error('Error loading metrics:', error);
      showToast('Failed to load metrics', 'error');
      return null;
    }
  }

  async loadResponses() {
    try {
      const { status, dateRange, searchQuery } = this.filters;
      const { field, order } = this.currentSort;
      
      const query = new URLSearchParams({
        page: this.currentPage,
        limit: this.itemsPerPage,
        status,
        dateRange,
        search: searchQuery,
        sortBy: field,
        sortOrder: order
      });

      const response = await fetch(`/api/admin/responses?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to load responses');
      
      const data = await response.json();
      this.renderResponses(data);
      this.updatePagination(data.total, data.page, data.pages);
      
      return data;
    } catch (error) {
      console.error('Error loading responses:', error);
      showToast('Failed to load responses', 'error');
      return { items: [], total: 0, page: 1, pages: 1 };
    }
  }

  async loadAiInsights() {
    try {
      // Fetch AI-powered insights
      const response = await fetch('/api/ai/insights');
      if (!response.ok) throw new Error('Failed to load AI insights');
      return await response.json();
    } catch (error) {
      console.error('Error loading AI insights:', error);
      showToast('Failed to load AI insights', 'error');
      return null;
    }
  }

  renderAiInsights(insights) {
    if (!insights) return;

    // Update AI summary section
    const summaryContainer = document.getElementById('ai-summary');
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">AI-Powered Insights</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Trend Analysis</h6>
                <p>${insights.trendAnalysis || 'No trend data available'}</p>
                
                <h6 class="mt-3">Top Opportunities</h6>
                <ul class="list-unstyled">
                  ${(insights.topOpportunities || []).map(opp => 
                    `<li class="mb-2">
                      <i class="fas fa-arrow-circle-right text-primary me-2"></i>
                      ${opp}
                    </li>`
                  ).join('')}
                </ul>
              </div>
              <div class="col-md-6">
                <h6>Performance Metrics</h6>
                <div class="mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span>Match Accuracy</span>
                    <strong>${insights.matchAccuracy || 0}%</strong>
                  </div>
                  <div class="progress" style="height: 10px;">
                    <div class="progress-bar bg-success" role="progressbar" 
                         style="width: ${insights.matchAccuracy || 0}%" 
                         aria-valuenow="${insights.matchAccuracy || 0}" 
                         aria-valuemin="0" 
                         aria-valuemax="100"></div>
                  </div>
                </div>
                
                <h6 class="mt-4">AI Recommendations</h6>
                <div class="alert alert-info">
                  ${insights.recommendations || 'No specific recommendations at this time.'}
                </div>
              </div>
            </div>
            
            ${insights.anomalies ? `
              <div class="alert alert-warning mt-3">
                <h6><i class="fas fa-exclamation-triangle me-2"></i>Anomaly Detected</h6>
                <p class="mb-0">${insights.anomalies}</p>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
  }

  renderMetrics(metrics) {
    if (!metrics) return;
    
    // Update metric cards
    document.getElementById('total-rfps').textContent = metrics.totalRfps?.toLocaleString() || '0';
    document.getElementById('total-responses').textContent = metrics.totalResponses?.toLocaleString() || '0';
    document.getElementById('active-users').textContent = metrics.activeUsers?.toLocaleString() || '0';
    document.getElementById('conversion-rate').textContent = metrics.conversionRate ? 
      `${(metrics.conversionRate * 100).toFixed(1)}%` : '0%';
      
    // Update AI-specific metrics if available
    if (metrics.aiMetrics) {
      const aiEfficiency = document.getElementById('ai-efficiency');
      if (aiEfficiency) {
        aiEfficiency.textContent = `${(metrics.aiMetrics.efficiency * 100).toFixed(1)}%`;
        aiEfficiency.className = `badge ${
          metrics.aiMetrics.efficiency > 0.8 ? 'bg-success' : 
          metrics.aiMetrics.efficiency > 0.5 ? 'bg-warning' : 'bg-danger'
        }`;
      }
    }
  }

  renderResponses(data) {
    const tbody = document.querySelector('#responses-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = data.items?.map(item => `
      <tr>
        <td>${new Date(item.createdAt).toLocaleDateString()}</td>
        <td>${this.escapeHtml(item.rfpTitle || 'Untitled')}</td>
        <td>${this.escapeHtml(item.respondentName || 'Anonymous')}</td>
        <td><span class="badge ${this.getStatusBadgeClass(item.status)}">${item.status}</span></td>
        <td>${item.matchScore ? `${Math.round(item.matchScore)}%` : 'N/A'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary view-response" data-id="${item.id}">
            View
          </button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="text-center">No responses found</td></tr>';

    // Add event listeners to view buttons
    document.querySelectorAll('.view-response').forEach(button => {
      button.addEventListener('click', (e) => {
        const responseId = e.target.dataset.id;
        this.viewResponseDetails(responseId);
      });
    });
  }

  updatePagination(totalItems, currentPage, totalPages) {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    
    let paginationHtml = '';
    const maxPagesToShow = 5;
    let startPage, endPage;
    
    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrentPage = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxPagesToShow / 2) - 1;
      
      if (currentPage <= maxPagesBeforeCurrentPage) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBeforeCurrentPage;
        endPage = currentPage + maxPagesAfterCurrentPage;
      }
    }
    
    // Previous button
    paginationHtml += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}" ${currentPage === 1 ? 'tabindex="-1"' : ''}>
          &laquo;
        </a>
      </li>`;
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
    }
    
    // Next button
    paginationHtml += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'tabindex="-1"' : ''}>
          &raquo;
        </a>
      </li>`;
    
    pagination.innerHTML = paginationHtml;
    
    // Update item count info
    const startItem = (currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(currentPage * this.itemsPerPage, totalItems);
    const countInfo = document.querySelector('.pagination-info');
    if (countInfo) {
      countInfo.textContent = `Showing ${startItem} to ${endItem} of ${totalItems} entries`;
    }
  }

  async viewResponseDetails(responseId) {
    try {
      // Show loading state
      const modal = document.getElementById('responseDetailModal');
      const modalBody = modal?.querySelector('.modal-body');
      
      if (modal && modalBody) {
        modalBody.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"></div></div>';
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        // Fetch response details
        const response = await fetch(`/api/admin/responses/${responseId}`);
        if (!response.ok) throw new Error('Failed to load response details');
        
        const data = await response.json();
        
        // Render response details
        modalBody.innerHTML = `
          <div class="response-details">
            <h5>${this.escapeHtml(data.rfpTitle || 'Response Details')}</h5>
            <div class="mb-3">
              <strong>Status:</strong> 
              <span class="badge ${this.getStatusBadgeClass(data.status)}">${data.status}</span>
            </div>
            <div class="mb-3">
              <strong>Submitted:</strong> ${new Date(data.createdAt).toLocaleString()}
            </div>
            <div class="mb-3">
              <strong>Match Score:</strong> ${data.matchScore ? `${Math.round(data.matchScore)}%` : 'N/A'}
            </div>
            <div class="mb-3">
              <strong>Response:</strong>
              <div class="border p-3 mt-2 bg-light">
                ${data.content ? this.formatResponseContent(data.content) : 'No content available'}
              </div>
            </div>
            ${this.renderResponseActions(data)}
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading response details:', error);
      showToast('Failed to load response details', 'error');
    }
  }

  renderResponseActions(response) {
    if (response.status === 'pending') {
      return `
        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-success btn-sm" data-action="approve" data-id="${response.id}">
            Approve
          </button>
          <button class="btn btn-danger btn-sm" data-action="reject" data-id="${response.id}">
            Reject
          </button>
          <button class="btn btn-outline-secondary btn-sm" data-action="request-revision" data-id="${response.id}">
            Request Revision
          </button>
        </div>
      `;
    }
    return '';
  }

  formatResponseContent(content) {
    // Simple formatting for line breaks and paragraphs
    if (typeof content === 'string') {
      return content
        .split('\n\n')
        .map(paragraph => `<p>${this.escapeHtml(paragraph)}</p>`)
        .join('');
    } else if (typeof content === 'object' && content !== null) {
      // Handle structured content (e.g., from a form)
      return `
        <dl class="row">
          ${Object.entries(content)
            .map(([key, value]) => `
              <dt class="col-sm-3">${this.formatLabel(key)}</dt>
              <dd class="col-sm-9">${this.formatValue(value)}</dd>
            `)
            .join('')}
        </dl>
      `;
    }
    return '';
  }

  formatLabel(key) {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  formatValue(value) {
    if (value === null || value === undefined) return '<em>Not provided</em>';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return this.escapeHtml(String(value));
  }

  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  getStatusBadgeClass(status) {
    const statusClasses = {
      pending: 'bg-warning text-dark',
      approved: 'bg-success',
      rejected: 'bg-danger',
      draft: 'bg-secondary',
      submitted: 'bg-primary',
      'under-review': 'bg-info text-dark',
      completed: 'bg-success',
      cancelled: 'bg-dark'
    };
    
    return statusClasses[status.toLowerCase()] || 'bg-secondary';
  }

  initializeCharts(metrics) {
    if (!metrics || !window.Chart) return;
    
    // Response Trends Chart
    const responseCtx = document.getElementById('responseTrendsChart')?.getContext('2d');
    if (responseCtx && metrics.responseTrends) {
      new Chart(responseCtx, {
        type: 'line',
        data: {
          labels: metrics.responseTrends.labels || [],
          datasets: [
            {
              label: 'Responses',
              data: metrics.responseTrends.data || [],
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Response Trends (Last 30 Days)' }
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }
    
    // Status Distribution Chart
    const statusCtx = document.getElementById('statusDistributionChart')?.getContext('2d');
    if (statusCtx && metrics.statusDistribution) {
      const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)'
      ];
      
      new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: metrics.statusDistribution.labels || [],
          datasets: [{
            data: metrics.statusDistribution.data || [],
            backgroundColor: backgroundColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'right' },
            title: { display: true, text: 'Response Status Distribution' }
          }
        }
      });
    }
  }
}

// Initialize the admin dashboard when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.admin-dashboard')) {
    window.adminDashboard = new AdminDashboard();
  }
});