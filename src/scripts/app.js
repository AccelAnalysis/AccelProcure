import { 
  signIn, 
  signUp, 
  signOut, 
  getCurrentUser, 
  resetPassword, 
  updatePassword,
  onAuthStateChanged
} from '../services/authService.js';
import { initMap } from './map3d.js';
import { setupNavigation, updateNavigation } from './nav.js';
import { showToast } from '../utils/notifications.js';

class App {
  constructor() {
    this.currentUser = null;
    this.map = null;
    this.initialized = false;
    this.authStateListeners = [];
  }

  async initialize() {
    try {
      // Initialize services
      await this.initializeServices();
      
      // Setup UI components
      this.setupEventListeners();
      setupNavigation();
      
      // Initialize map if on map page
      if (document.getElementById('map')) {
        this.map = await initMap();
      }
      
      // Update UI based on auth state
      this.updateUI();
      
      this.initialized = true;
      console.log('App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      showToast('Failed to initialize application', 'error');
    }
  }

  async initializeServices() {
    try {
      // Initialize auth state
      const { user, error } = await getCurrentUser();
      if (error) throw error;
      this.currentUser = user;
      
      // Set up auth state listener
      onAuthStateChanged((user) => {
        this.currentUser = user;
        this.notifyAuthStateChanged(user);
        this.updateUI();
        
        // If we have a user and we're on the map page, refresh map data
        if (user && this.map) {
          this.map.refreshData();
        }
      });
      
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Global error handling
    window.addEventListener('error', (event) => {
      console.error('Unhandled error:', event.error);
      showToast('An unexpected error occurred', 'error');
    });

    // Handle offline/online status
    window.addEventListener('online', () => {
      showToast('You are back online', 'success');
      // Refresh data when coming back online
      if (this.map) this.map.refreshData();
    });

    window.addEventListener('offline', () => {
      showToast('You are offline. Some features may be limited.', 'warning');
    });
  }

  updateUI() {
    // Update navigation based on auth state
    updateNavigation(this.currentUser);
    
    // Update page-specific UIs
    this.updateAuthDependentUI();
  }

  updateAuthDependentUI() {
    const authElements = document.querySelectorAll('[data-auth]');
    const guestElements = document.querySelectorAll('[data-guest]');
    const userElements = document.querySelectorAll('[data-user]');
    
    if (this.currentUser) {
      // User is logged in
      authElements.forEach(el => el.classList.remove('hidden'));
      guestElements.forEach(el => el.classList.add('hidden'));
      userElements.forEach(el => {
        el.textContent = this.currentUser.email || 'User';
        el.classList.remove('hidden');
      });
      
      // Update any elements that should show user data
      const userCreditElements = document.querySelectorAll('[data-user-credits]');
      if (this.currentUser.credits !== undefined) {
        userCreditElements.forEach(el => {
          el.textContent = this.currentUser.credits.toLocaleString();
        });
      }
    } else {
      // User is not logged in
      authElements.forEach(el => el.classList.add('hidden'));
      guestElements.forEach(el => el.classList.remove('hidden'));
      userElements.forEach(el => el.classList.add('hidden'));
    }
  }
}

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app; // Make app globally available for debugging
  app.initialize().catch(console.error);
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { App };
}