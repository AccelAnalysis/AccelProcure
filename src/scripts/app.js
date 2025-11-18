import {
  getCurrentUser,
  onAuthStateChanged,
} from '../services/authService.js';
import { initMap } from './map3d.js';
import { setupNavigation, updateNavigation } from './nav.js';
import { showError } from './shared.js';

class App {
  constructor() {
    this.currentUser = null;
    this.mapController = null;
    this.navigation = null;
    this.hasInitialized = false;
  }

  async initialize() {
    try {
      this.navigation = setupNavigation();
      this.setupGlobalHandlers();
      await this.bootstrapAuthState();
      await this.initializeMap();
      this.updateUI();
      this.hasInitialized = true;
      document.dispatchEvent(new CustomEvent('app:ready'));
    } catch (error) {
      console.error('Failed to initialize app', error);
      showError('Unable to load AccelRFx. Please refresh and try again.');
    }
  }

  setupGlobalHandlers() {
    window.addEventListener('online', () => {
      document.body.dataset.network = 'online';
      if (this.mapController) {
        this.mapController.refreshData();
      }
    });

    window.addEventListener('offline', () => {
      document.body.dataset.network = 'offline';
      showError('You are offline. Some functionality may be limited.');
    });

    window.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.mapController) {
        this.mapController.refreshData();
      }
    });
  }

  async bootstrapAuthState() {
    const { user, error } = await getCurrentUser();
    if (error) {
      throw error;
    }

    this.currentUser = user;
    onAuthStateChanged((authUser) => {
      this.currentUser = authUser;
      this.updateUI();
      if (this.mapController && this.hasInitialized) {
        this.mapController.refreshData(this.buildMapFilters());
      }
    });
  }

  async initializeMap() {
    const container = document.getElementById('map');
    if (!container) {
      return;
    }

    this.mapController = await initMap({
      containerId: 'map',
      filters: this.buildMapFilters(),
    });
  }

  buildMapFilters() {
    if (!this.currentUser) {
      return { status: 'active' };
    }

    const filters = { status: 'active' };
    if (this.currentUser.region) {
      filters.region = this.currentUser.region;
    }
    if (this.currentUser.industry) {
      filters.industry = this.currentUser.industry;
    }
    return filters;
  }

  updateUI() {
    updateNavigation(this.currentUser);
    document.body.dataset.auth = this.currentUser ? 'authenticated' : 'guest';
    this.updateAuthBlocks();
  }

  updateAuthBlocks() {
    const authed = document.querySelectorAll('[data-auth]');
    const guests = document.querySelectorAll('[data-guest]');
    const userLabels = document.querySelectorAll('[data-user-name]');
    const creditLabels = document.querySelectorAll('[data-user-credits]');

    if (this.currentUser) {
      authed.forEach((el) => el.classList.remove('hidden'));
      guests.forEach((el) => el.classList.add('hidden'));
      userLabels.forEach((el) => {
        el.textContent = this.currentUser.name || this.currentUser.email || 'Account';
      });
      if (typeof this.currentUser.credits === 'number') {
        creditLabels.forEach((el) => {
          el.textContent = this.currentUser.credits.toLocaleString();
        });
      }
    } else {
      authed.forEach((el) => el.classList.add('hidden'));
      guests.forEach((el) => el.classList.remove('hidden'));
      userLabels.forEach((el) => {
        el.textContent = '';
      });
      creditLabels.forEach((el) => {
        el.textContent = '0';
      });
    }
  }
}

export function initializeApp() {
  const app = new App();
  window.app = app;
  return app.initialize();
}

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

export default App;
