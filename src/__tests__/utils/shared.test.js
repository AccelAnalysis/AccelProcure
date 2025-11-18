/**
 * @jest-environment jsdom
 */
// Mock the mapService before importing shared
jest.mock('../../services/mapService', () => ({
  getMapLayers: jest.fn(() => Promise.resolve({
    features: [],
    aiInsights: {},
  })),
  get3DTerrainData: jest.fn(() => Promise.resolve({})),
}));

import { 
  debounce, 
  formatCurrency, 
  formatRelativeTime, 
  setLoading, 
  safeJsonParse 
} from '../../scripts/shared';

describe('Shared Utilities', () => {
  describe('debounce', () => {
    jest.useFakeTimers();
    
    it('should call the function only once after the delay', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      // Call it multiple times
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // Fast-forward time
      jest.advanceTimersByTime(150);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    it('should pass through arguments correctly', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('test', 123);
      jest.advanceTimersByTime(150);
      
      expect(mockFn).toHaveBeenCalledWith('test', 123);
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
      expect(formatCurrency(0.99, 'USD')).toBe('$0.99');
    });
    
    it('should handle zero and negative values', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
      expect(formatCurrency(-500, 'USD')).toBe('-$500.00');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-11-17T12:00:00Z'));
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should format recent times correctly', () => {
      const oneMinuteAgo = new Date('2025-11-17T11:59:00Z');
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
      
      const fiveMinutesAgo = new Date('2025-11-17T11:55:00Z');
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
      
      const oneHourAgo = new Date('2025-11-17T11:00:00Z');
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');
    });
    
    it('should format older dates correctly', () => {
      const yesterday = new Date('2025-11-16T12:00:00Z');
      expect(formatRelativeTime(yesterday, { forceAbsolute: true })).toMatch(/^11\/16\/25/);
      
      const lastYear = new Date('2024-11-17T12:00:00Z');
      expect(formatRelativeTime(lastYear, { forceAbsolute: true })).toMatch(/^11\/17\/24/);
    });
  });

  describe('setLoading', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div>
          <button id="testButton">Click me</button>
          <div id="loadingIndicator" style="display: none;">Loading...</div>
        </div>
      `;
    });
    
    it('should show loading state', () => {
      const button = document.getElementById('testButton');
      
      setLoading(button, true);
      
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('data-loading')).toBe('true');
      expect(button.getAttribute('data-original-text')).toBe('Click me');
      expect(button.textContent).toBe('Loading...');
    });
    
    it('should restore original state', () => {
      const button = document.getElementById('testButton');
      
      // First set loading to true
      setLoading(button, true);
      // Then set it back to false
      setLoading(button, false);
      
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('data-loading')).toBe('false');
      expect(button.textContent).toBe('Click me');
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON strings', () => {
      const jsonString = '{"key": "value", "number": 123}';
      const result = safeJsonParse(jsonString);
      expect(result).toEqual({ key: 'value', number: 123 });
    });
    
    it('should return undefined for invalid JSON strings', () => {
      const invalidJson = '{invalid: json}';
      const result = safeJsonParse(invalidJson);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for non-string inputs', () => {
      const obj = { key: 'value' };
      expect(safeJsonParse(obj)).toBeUndefined();
      expect(safeJsonParse(123)).toBeUndefined();
      expect(safeJsonParse(null)).toBeUndefined();
    });
  });
});
