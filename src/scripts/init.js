// Import the auth service with the correct path
import { isAuthenticated } from '../services/authService.js';

// Import the app initialization function with the correct path
import { initializeApp as initApp } from './app.js';

export async function initializeApp() {
    try {
        // Check authentication status
        if (!isAuthenticated()) {
            window.location.href = '/login.html';
            return;
        }
        
        // Initialize the application
        const app = new App();
        await app.initialize();
        
        // Store app instance globally for debugging
        window.app = app;
        
        // Hide loading overlay when everything is ready
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        
        // Show error to user
        const notificationArea = document.getElementById('notification-area');
        if (notificationArea) {
            const notification = document.createElement('div');
            notification.className = 'notification error';
            notification.textContent = 'Failed to load application. Please refresh the page.';
            notificationArea.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }
}

// Start the app when the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
