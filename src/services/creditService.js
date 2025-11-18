import httpClient from './httpClient';
import { CREDIT_COSTS } from '../config/app.config';

const CREDIT_BASE = '/credits';

export const addCredits = (amount, paymentMethodId, metadata = {}) => {
  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }
  if (!paymentMethodId) {
    throw new Error('Payment method ID is required');
  }
  return httpClient.post(`${CREDIT_BASE}/add`, { amount, paymentMethodId, metadata });
};

export const debitCredits = (action, metadata = {}) => {
  if (!action) {
    throw new Error('Action is required');
  }
  if (!Object.prototype.hasOwnProperty.call(CREDIT_COSTS, action)) {
    throw new Error(`Invalid credit action: ${action}`);
  }
  return httpClient.post(`${CREDIT_BASE}/debit`, { action, metadata });
};

export const getCreditBalance = () => httpClient.get(`${CREDIT_BASE}/balance`);

export const getExpiringCredits = () => httpClient.get(`${CREDIT_BASE}/expiring`);

export const getCreditTransactions = (params = {}) =>
  httpClient.get(`${CREDIT_BASE}/transactions`, { params });

export const creditService = {
  addCredits,
  debitCredits,
  getCreditBalance,
  getExpiringCredits,
  getCreditTransactions
};

export default creditService;
