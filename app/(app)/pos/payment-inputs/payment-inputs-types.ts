export interface CreditCardDetails {
  cardType: string;
  cardLastFour: string;
  authCode: string;
  gatewayReference?: string;
}

export interface EWalletDetails {
  walletProvider: string;
  walletReference: string;
}

export interface GiftCheckDetails {
  giftCheckNumber: string;
  giftCheckBalanceBefore?: number;
  giftCheckBalanceAfter?: number;
}

export interface PointsDetails {
  pointsUsed: number;
  pointsRemaining: number;
  pointsConversionRate: number;
}
