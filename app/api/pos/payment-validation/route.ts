import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export interface PaymentValidationRequest {
  paymentMethod: string;
  amount: number;
  customerId?: string;
  giftCheckNumber?: string;
}

export interface PaymentValidationResponse {
  valid: boolean;
  message?: string;
  details?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentValidationRequest = await request.json();
    const { paymentMethod, amount, customerId, giftCheckNumber } = body;

    if (!paymentMethod || amount <= 0) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid payment method or amount'
      }, { status: 400 });
    }

    let validationResult: PaymentValidationResponse = { valid: true };

    switch (paymentMethod.toUpperCase()) {
      case 'CASH':
        validationResult = await validateCashPayment(amount);
        break;

      case 'CREDIT_CARD':
        validationResult = await validateCreditCardPayment(amount);
        break;

      case 'E_WALLET':
        validationResult = await validateEWalletPayment(amount);
        break;

      case 'GIFT_CHECK':
        if (!giftCheckNumber) {
          validationResult = {
            valid: false,
            message: 'Gift check number is required'
          };
        } else {
          validationResult = await validateGiftCheckPayment(giftCheckNumber, amount);
        }
        break;

      case 'POINTS':
        if (!customerId) {
          validationResult = {
            valid: false,
            message: 'Customer ID is required for points payment'
          };
        } else {
          validationResult = await validatePointsPayment(customerId, amount);
        }
        break;

      default:
        validationResult = {
          valid: false,
          message: `Unsupported payment method: ${paymentMethod}`
        };
    }

    return NextResponse.json(validationResult);

  } catch (error: any) {
    console.error('Payment validation error:', error);
    return NextResponse.json({
      valid: false,
      message: 'Payment validation failed',
      details: error.message
    }, { status: 500 });
  }
}

// Validation functions for each payment method

async function validateCashPayment(amount: number): Promise<PaymentValidationResponse> {
  // Check if cash drawer is available (this could be enhanced with actual hardware integration)
  // For now, we'll just validate the amount
  
  if (amount > 100000) {
    return {
      valid: false,
      message: 'Cash payment exceeds maximum limit of ₱100,000. Please use alternative payment method or split payment.'
    };
  }

  return {
    valid: true,
    message: 'Cash payment validated',
    details: { maxAmount: 100000 }
  };
}

async function validateCreditCardPayment(amount: number): Promise<PaymentValidationResponse> {
  // In a real implementation, this would check:
  // - Payment gateway connection status
  // - Terminal availability
  // - Network connectivity
  
  // For now, we'll simulate a basic check
  const isGatewayAvailable = true; // This would be an actual check in production

  if (!isGatewayAvailable) {
    return {
      valid: false,
      message: 'Payment gateway is currently unavailable. Please use cash or try again later.'
    };
  }

  if (amount < 100) {
    return {
      valid: false,
      message: 'Credit card payments must be at least ₱100'
    };
  }

  return {
    valid: true,
    message: 'Credit card payment validated',
    details: { minAmount: 100, gatewayStatus: 'online' }
  };
}

async function validateEWalletPayment(amount: number): Promise<PaymentValidationResponse> {
  // In a real implementation, this would check:
  // - E-wallet service availability
  // - QR code generator status
  // - Network connectivity
  
  const isServiceAvailable = true; // This would be an actual check in production

  if (!isServiceAvailable) {
    return {
      valid: false,
      message: 'E-wallet service is currently unavailable. Please use cash or credit card.'
    };
  }

  if (amount < 50) {
    return {
      valid: false,
      message: 'E-wallet payments must be at least ₱50'
    };
  }

  return {
    valid: true,
    message: 'E-wallet payment validated',
    details: { minAmount: 50, serviceStatus: 'online' }
  };
}

async function validateGiftCheckPayment(
  giftCheckNumber: string,
  amount: number
): Promise<PaymentValidationResponse> {
  try {
    // Note: Gift checks table does not exist in Prisma schema yet.
    return {
      valid: false,
      message: 'Gift check system is not yet configured. Please use alternative payment method.'
    };
  } catch (error: any) {
    throw error;
  }
}

async function validatePointsPayment(
  customerId: string,
  amount: number
): Promise<PaymentValidationResponse> {
  try {
    // Query customer loyalty points
    const loyalty = await db.customerLoyalty.findUnique({
      where: { customerId }
    });

    if (!loyalty) {
      return {
        valid: false,
        message: 'Customer loyalty account not found.'
      };
    }

    // Get points conversion rate from settings
    const settings = await db.loyaltyPointsSetting.findFirst();

    if (!settings) {
      return {
        valid: false,
        message: 'Loyalty points system is not configured.'
      };
    }

    // Assuming equivalent / amount represents points per peso
    const pointsPerPeso = settings.equivalent && settings.amount 
      ? Number(settings.equivalent) / Number(settings.amount) 
      : 1;

    const pointsRequired = amount * pointsPerPeso;
    const currentPoints = Number(loyalty.currentPoints);

    if (currentPoints < pointsRequired) {
      return {
        valid: false,
        message: `Insufficient loyalty points. Available: ${currentPoints.toFixed(0)} points, Required: ${pointsRequired.toFixed(0)} points`,
        details: { 
          availablePoints: currentPoints,
          requiredPoints: pointsRequired,
          conversionRate: pointsPerPeso
        }
      };
    }

    return {
      valid: true,
      message: 'Loyalty points validated',
      details: {
        currentPoints: currentPoints,
        pointsToUse: pointsRequired,
        remainingPoints: currentPoints - pointsRequired,
        conversionRate: pointsPerPeso
      }
    };

  } catch (error: any) {
    console.error('Points validation error:', error);
    return {
      valid: false,
      message: 'Unable to validate loyalty points. Please use alternative payment method.'
    };
  }
}
