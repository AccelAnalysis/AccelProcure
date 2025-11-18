import { authService } from '../services/authService.js';
import { showToast } from './shared.js';

class Navigation {
  constructor() {
    this.drawer = document.querySelector('.drawer');
    this.drawerToggle = document.querySelector('.drawer-toggle');
    this.drawerBackdrop = document.querySelector('.drawer-backdrop');
    this.notificationBell = document.querySelector('.notification-bell');
    this.notificationPanel = document.querySelector('.notification-panel');
    this.userMenu = document.querySelector('.user-menu');
    this.userMenuToggle = document.querySelector('.user-menu-toggle');
    this.mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.notificationCount = document.querySelector('.notification-count');
    this.notificationList = document.querySelector('.notification-list');
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadNotifications();
    this.updateActiveLink();
  }

  setupEventListeners() {
    // Drawer toggle
    if (this.drawerToggle) {
      this.drawerToggle.addEventListener('click', () => this.toggleDrawer());
      this.drawerBackdrop.addEventListener('click', () => this.closeDrawer());
    }

    // Notification bell
    if (this.notificationBell) {
      this.notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNotificationPanel();
      });
    }

    // User menu
    if (this.userMenuToggle) {
      this.userMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleUserMenu();
      });
    }

    // Mobile menu toggle
    if (this.mobileMenuToggle) {
      this.mobileMenuToggle.addEventListener('click', () => {
        document.body.classList.toggle('mobile-menu-open');
      });
    }

    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
      if (this.notificationPanel && !this.notificationPanel.contains(e.target) && !this.notificationBell.contains(e.target)) {
        this.notificationPanel.classList.remove('active');
      }
      if (this.userMenu && !this.userMenu.contains(e.target) && !this.userMenuToggle.contains(e.target)) {
        this.userMenu.classList.remove('active');
      }
    });

    // Close drawer when clicking on a nav link on mobile
    this.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
          this.closeDrawer();
        }
      });
    });

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  toggleDrawer() {
    this.drawer.classList.toggle('open');
    this.drawerBackdrop.classList.toggle('active');
    document.body.classList.toggle('drawer-open');
  }

  closeDrawer() {
    this.drawer.classList.remove('open');
    this.drawerBackdrop.classList.remove('active');
    document.body.classList.remove('drawer-open');
  }

  toggleNotificationPanel() {
    this.notificationPanel.classList.toggle('active');
    // Mark notifications as read when panel is opened
    if (this.notificationPanel.classList.contains('active')) {
      this.markNotificationsAsRead();
    }
  }

  toggleUserMenu() {
    this.userMenu.classList.toggle('active');
  }

  async loadNotifications() {
    try {
      // This would typically be an API call to your backend
      // const notifications = await notificationService.getUnreadNotifications();
      // this.renderNotifications(notifications);
      
      // Mock data for now
      const mockNotifications = [
        { id: 1, message: 'New RFX match found', read: false, timestamp: new Date(), type: 'match' },
        { id: 2, message: 'Your response was submitted successfully', read: false, timestamp: new Date(), type: 'success' },
        { id: 3, message: 'Credit balance is running low', read: true, timestamp: new Date(), type: 'warning' }
      ];
      
      this.renderNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      showToast('Failed to load notifications', 'error');
    }
  }

  renderNotifications(notifications) {
    if (!this.notificationList) return;
    
    // Clear existing notifications
    this.notificationList.innerHTML = '';
    
    // Update notification count
    const unreadCount = notifications.filter(n => !n.read).length;
    if (this.notificationCount) {
      this.notificationCount.textContent = unreadCount;
      this.notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    if (notifications.length === 0) {
      this.notificationList.innerHTML = '<div class="notification-empty">No new notifications</div>';
      return;
    }
    
    // Add each notification to the list
    notifications.forEach(notification => {
      const notificationElement = document.createElement('div');
      notificationElement.className = `notification-item ${notification.read ? 'read' : 'unread'} ${notification.type || ''}`;
      notificationElement.innerHTML = `
        <div class="notification-icon">
          ${this.getNotificationIcon(notification.type)}
        </div>
        <div class="notification-content">
          <div class="notification-message">${notification.message}</div>
          <div class="notification-time">${this.formatTimeAgo(notification.timestamp)}</div>
        </div>
      `;
      
      // Add click handler for notification actions
      notificationElement.addEventListener('click', () => this.handleNotificationClick(notification));
      
      this.notificationList.appendChild(notificationElement);
    });
  }

  getNotificationIcon(type) {
    const icons = {
      'match': '🔍',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'info': 'ℹ️'
    };
    return icons[type] || '🔔';
  }

  formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'Just now';
  }

  async markNotificationsAsRead() {
    try {
      // This would typically be an API call to your backend
      // await notificationService.markAllAsRead();
      
      // Update UI
      document.querySelectorAll('.notification-item.unread').forEach(item => {
        item.classList.remove('unread');
        item.classList.add('read');
      });
      
      if (this.notificationCount) {
        this.notificationCount.style.display = 'none';
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  handleNotificationClick(notification) {
    // Handle notification click (e.g., navigate to relevant page)
    console.log('Notification clicked:', notification);
    
    // Example: Navigate to RFX if it's an RFX notification
    if (notification.rfxId) {
      // window.location.href = `/rfx/${notification.rfxId}`;
    }
    
    // Close the notification panel
    this.notificationPanel.classList.remove('active');
  }

  updateActiveLink() {
    const currentPath = window.location.pathname;
    this.navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && currentPath.includes(href)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  handleResize() {
    // Close drawer on desktop
    if (window.innerWidth >= 1024) {
      this.closeDrawer();
    }
  }

  // Public method to add a notification dynamically
  addNotification(notification) {
    // This would typically add to the existing notifications and re-render
    // For now, we'll just reload all notifications
    this.loadNotifications();
  }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on a page with navigation
  if (document.querySelector('.app-header')) {
    window.navigation = new Navigation();
  }
});

export default Navigation;