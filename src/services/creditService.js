import { supabase } from '../config/supabaseClient';
import { CREDIT_COSTS, RATE_LIMIT_MS } from '../config/app.config';

/**
 * Service for managing user credits and transactions
 */
class CreditService {
  // ... existing methods ...

  /**
   * Add credits to user's account
   * @param {number} amount - Number of credits to add
   * @param {string} paymentMethodId - Payment method ID from payment processor
   * @param {Object} [metadata] - Additional transaction metadata
   * @returns {Promise<{success: boolean, newBalance: number, error: Error|null}>}
   */
  static async addCredits(amount, paymentMethodId, metadata = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, newBalance: 0, error: new Error('Not authenticated') };

      if (amount <= 0) {
        return {
          success: false,
          newBalance: 0,
          error: new Error('Amount must be greater than 0')
        };
      }

      // Process payment (integrate with your payment processor)
      const paymentResult = await this.processPayment(paymentMethodId, amount);
      if (!paymentResult.success) {
        return {
          success: false,
          newBalance: 0,
          error: new Error(`Payment failed: ${paymentResult.error}`)
        };
      }

      // Add credits to user's balance
      const { data, error } = await supabase.rpc('add_user_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_action: 'purchase',
        p_metadata: {
          ...metadata,
          payment_id: paymentResult.paymentId,
          payment_method_id: paymentMethodId
        }
      });

      if (error) throw error;

      return {
        success: true,
        newBalance: data.new_balance,
        error: null
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      return {
        success: false,
        newBalance: 0,
        error: error.message || 'Failed to add credits'
      };
    }
  }

  /**
   * Get expiring credits for a user
   * @param {string} [userId] - Optional user ID (defaults to current user)
   * @returns {Promise<{expiringCredits: Array, error: Error|null}>}
   */
  static async getExpiringCredits(userId = null) {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { expiringCredits: [], error: new Error('Not authenticated') };
        userId = user.id;
      }

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .not('expires_at', 'is', null)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) throw error;

      return {
        expiringCredits: data || [],
        error: null
      };
    } catch (error) {
      console.error('Error fetching expiring credits:', error);
      return {
        expiringCredits: [],
        error: error.message || 'Failed to fetch expiring credits'
      };
    }
  }

  /**
   * Get the last transaction for a specific action
   * @private
   */
  static async getLastTransaction(userId, action) {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('action', action)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
      console.error('Error fetching last transaction:', error);
      return null;
    }

    return data;
  }

  /**
   * Process payment through payment processor
   * @private
   */
  static async processPayment(paymentMethodId, amount) {
    // Replace with your actual payment processor integration
    // This is a placeholder implementation
    try {
      // Example: Using Stripe
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: amount * 100, // Convert to cents
      //   currency: 'usd',
      //   payment_method: paymentMethodId,
      //   confirm: true
      // });
      // return { success: true, paymentId: paymentIntent.id };

      // For now, simulate a successful payment
      return {
        success: true,
        paymentId: `pay_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  }

  /**
   * Debit credits from user's account for a specific action
   * @param {string} action - The action being performed
   * @param {Object} [metadata] - Additional metadata about the transaction
   * @returns {Promise<{success: boolean, newBalance: number, error: Error|null}>}
   */
  static async debitCredits(action, metadata = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, newBalance: 0, error: new Error('Not authenticated') };

      // Check rate limiting
      const lastTransaction = await this.getLastTransaction(user.id, action);
      if (lastTransaction && (Date.now() - new Date(lastTransaction.created_at) < RATE_LIMIT_MS)) {
        throw new Error(`Rate limit exceeded. Please wait before performing this action again.`);
      }

      const cost = CREDIT_COSTS[action];
      if (cost === undefined) {
        return { 
          success: false, 
          newBalance: 0, 
          error: new Error(`Invalid action: ${action}`) 
        };
      }

      // Rest of the existing debitCredits implementation...
      const { data, error } = await supabase.rpc('debit_user_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_action: action,
        p_metadata: metadata
      });

      if (error) throw error;

      return { 
        success: true, 
        newBalance: data.new_balance,
        error: null 
      };
    } catch (error) {
      console.error(`Error debiting credits for ${action}:`, error);
      return { 
        success: false, 
        newBalance: 0, 
        error: error.message || 'Failed to process credit transaction' 
      };
    }
  }

  // ... rest of the existing methods ...
}

export default CreditService;