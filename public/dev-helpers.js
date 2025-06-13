/**
 * Development Helper Functions
 * Available in browser console for development mode only
 */

window.devHelpers = {
  /**
   * Reset AI usage limits for current user
   */
  async resetAIUsage() {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('🔄 Resetting AI usage limits...');
      
      const response = await fetch('/api/dev/reset-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ AI usage reset successfully!', data);
        console.log('🚀 You can now make AI requests again');
        
        // Refresh the page to update the UI
        if (confirm('AI usage reset! Refresh page to update UI?')) {
          window.location.reload();
        }
      } else {
        console.error('❌ Failed to reset usage:', data);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error resetting usage:', error);
      return { error: error.message };
    }
  },

  /**
   * Check current AI usage status
   */
  async checkUsage() {
    console.log('📊 Checking AI usage status...');
    console.log('ℹ️  Check the Network tab or server logs for usage details');
    
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feature: 'basic_suggestions',
          tasks: [],
          context: { check: true }
        })
      });

      const data = await response.json();
      console.log('Current usage status:', data.usage);
      return data;
    } catch (error) {
      console.error('Error checking usage:', error);
      return null;
    }
  },

  /**
   * Clear localStorage and sessionStorage
   */
  clearStorage() {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 Local storage cleared');
  },

  /**
   * Show available helper functions
   */
  help() {
    console.log(`
🛠️  Development Helper Functions:

devHelpers.resetAIUsage()  - Reset daily AI usage limits
devHelpers.checkUsage()    - Check current usage status  
devHelpers.clearStorage()  - Clear browser storage
devHelpers.help()          - Show this help message

💡 Tip: These functions only work in development mode!
    `);
  }
};

// Auto-show help in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('🚀 StudySpark Development Mode');
  console.log('Type devHelpers.help() for available functions');
} 