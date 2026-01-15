// Payment error handler utility for centralized error management

export enum PaymentErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface PaymentError {
  type: PaymentErrorType;
  message: string;
  userMessage: string;
  recoveryAction?: string;
  retryable: boolean;
  details?: any;
}

export class PaymentErrorHandler {
  static categorizeError(error: any): PaymentError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    // Network errors
    if (
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed')
    ) {
      return {
        type: PaymentErrorType.NETWORK_ERROR,
        message: errorMessage,
        userMessage: 'Network connection failed. Please check your internet connection.',
        recoveryAction: 'Retry the payment or use an alternative payment method.',
        retryable: true,
        details: error
      };
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return {
        type: PaymentErrorType.TIMEOUT_ERROR,
        message: errorMessage,
        userMessage: 'Payment request timed out. The transaction may not have been processed.',
        recoveryAction: 'Please check if the payment was successful before retrying.',
        retryable: true,
        details: error
      };
    }

    // Validation errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required')
    ) {
      return {
        type: PaymentErrorType.VALIDATION_ERROR,
        message: errorMessage,
        userMessage: 'Payment information is invalid or incomplete.',
        recoveryAction: 'Please verify the payment details and try again.',
        retryable: false,
        details: error
      };
    }

    // Insufficient funds
    if (
      errorMessage.includes('insufficient') ||
      errorMessage.includes('balance') ||
      errorMessage.includes('not enough')
    ) {
      return {
        type: PaymentErrorType.INSUFFICIENT_FUNDS,
        message: errorMessage,
        userMessage: 'Insufficient funds or balance for this payment.',
        recoveryAction: 'Please use a different payment method or reduce the amount.',
        retryable: false,
        details: error
      };
    }

    // Gateway errors
    if (
      errorMessage.includes('gateway') ||
      errorMessage.includes('declined') ||
      errorMessage.includes('authorization')
    ) {
      return {
        type: PaymentErrorType.GATEWAY_ERROR,
        message: errorMessage,
        userMessage: 'Payment gateway declined the transaction.',
        recoveryAction: 'Please try a different payment method or contact your bank.',
        retryable: false,
        details: error
      };
    }

    // Duplicate transaction
    if (errorMessage.includes('duplicate') || errorMessage.includes('already processed')) {
      return {
        type: PaymentErrorType.DUPLICATE_TRANSACTION,
        message: errorMessage,
        userMessage: 'This transaction has already been processed.',
        recoveryAction: 'Please check your transaction history before retrying.',
        retryable: false,
        details: error
      };
    }

    // System errors
    if (
      errorMessage.includes('database') ||
      errorMessage.includes('server') ||
      errorMessage.includes('internal')
    ) {
      return {
        type: PaymentErrorType.SYSTEM_ERROR,
        message: errorMessage,
        userMessage: 'A system error occurred while processing the payment.',
        recoveryAction: 'Please contact technical support if the problem persists.',
        retryable: true,
        details: error
      };
    }

    // Unknown errors
    return {
      type: PaymentErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      userMessage: 'An unexpected error occurred during payment processing.',
      recoveryAction: 'Please try again or contact support if the problem persists.',
      retryable: true,
      details: error
    };
  }

  static shouldRetry(error: PaymentError, attemptCount: number, maxAttempts: number = 3): boolean {
    if (attemptCount >= maxAttempts) {
      return false;
    }

    return error.retryable;
  }

  static getRetryDelay(attemptCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.min(1000 * Math.pow(2, attemptCount), 10000);
  }

  static formatUserMessage(error: PaymentError): string {
    let message = error.userMessage;

    if (error.recoveryAction) {
      message += `\n\n${error.recoveryAction}`;
    }

    return message;
  }

  static async logError(error: PaymentError, context: {
    transactionId?: string;
    paymentMethod?: string;
    amount?: number;
    userId?: string;
  }): Promise<void> {
    // Log to console for development
    console.error('Payment Error:', {
      type: error.type,
      message: error.message,
      context,
      timestamp: new Date().toISOString()
    });

    // In production, you would also:
    // - Log to payment_audit_log table
    // - Send to error monitoring service (e.g., Sentry)
    // - Alert supervisors for critical errors
    // - Queue for manual review if needed
  }
}

// Retry utility for payment operations
export async function retryPaymentOperation<T>(
  operation: () => Promise<T>,
  context: {
    transactionId?: string;
    paymentMethod?: string;
    amount?: number;
    userId?: string;
  },
  maxAttempts: number = 3
): Promise<T> {
  let lastError: PaymentError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = PaymentErrorHandler.categorizeError(error);
      
      await PaymentErrorHandler.logError(lastError, {
        ...context,
        transactionId: context.transactionId || `attempt-${attempt + 1}`
      });

      if (!PaymentErrorHandler.shouldRetry(lastError, attempt, maxAttempts)) {
        throw lastError;
      }

      // Wait before retrying
      const delay = PaymentErrorHandler.getRetryDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
