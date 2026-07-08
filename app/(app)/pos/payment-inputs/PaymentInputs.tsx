'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreditCardDetails, EWalletDetails, GiftCheckDetails, PointsDetails } from './payment-inputs-types';
export type { CreditCardDetails, EWalletDetails, GiftCheckDetails, PointsDetails } from './payment-inputs-types';

// Credit Card Input Component
export function CreditCardInputs({
  details,
  onChange
}: {
  details: Partial<CreditCardDetails>;
  onChange: (details: Partial<CreditCardDetails>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardType">Card Type</Label>
        <Select
          value={details.cardType || ''}
          onValueChange={(value) => onChange({ ...details, cardType: value })}
        >
          <SelectTrigger id="cardType">
            <SelectValue placeholder="Select card type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="VISA">Visa</SelectItem>
            <SelectItem value="MASTERCARD">Mastercard</SelectItem>
            <SelectItem value="AMEX">American Express</SelectItem>
            <SelectItem value="JCB">JCB</SelectItem>
            <SelectItem value="DISCOVER">Discover</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardLastFour">Last 4 Digits</Label>
        <Input
          id="cardLastFour"
          type="text"
          maxLength={4}
          placeholder="1234"
          value={details.cardLastFour || ''}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            onChange({ ...details, cardLastFour: value });
          }}
          className="text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authCode">Authorization Code</Label>
        <Input
          id="authCode"
          type="text"
          placeholder="Enter auth code"
          value={details.authCode || ''}
          onChange={(e) => onChange({ ...details, authCode: e.target.value })}
          className="text-lg"
        />
      </div>
    </div>
  );
}

// E-Wallet Input Component
export function EWalletInputs({
  details,
  onChange
}: {
  details: Partial<EWalletDetails>;
  onChange: (details: Partial<EWalletDetails>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="walletProvider">E-Wallet Provider</Label>
        <Select
          value={details.walletProvider || ''}
          onValueChange={(value) => onChange({ ...details, walletProvider: value })}
        >
          <SelectTrigger id="walletProvider">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GCASH">GCash</SelectItem>
            <SelectItem value="PAYMAYA">PayMaya</SelectItem>
            <SelectItem value="GRABPAY">GrabPay</SelectItem>
            <SelectItem value="SHOPEEPAY">ShopeePay</SelectItem>
            <SelectItem value="COINS_PH">Coins.ph</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="walletReference">Reference Number</Label>
        <Input
          id="walletReference"
          type="text"
          placeholder="Enter reference number"
          value={details.walletReference || ''}
          onChange={(e) => onChange({ ...details, walletReference: e.target.value })}
          className="text-lg"
        />
      </div>
    </div>
  );
}

// Gift Check Input Component
export function GiftCheckInputs({
  details,
  onChange,
  onValidate
}: {
  details: Partial<GiftCheckDetails>;
  onChange: (details: Partial<GiftCheckDetails>) => void;
  onValidate: (checkNumber: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="giftCheckNumber">Gift Check Number</Label>
        <div className="flex gap-2">
          <Input
            id="giftCheckNumber"
            type="text"
            placeholder="Enter check number"
            value={details.giftCheckNumber || ''}
            onChange={(e) => onChange({ ...details, giftCheckNumber: e.target.value })}
            className="text-lg flex-1"
          />
          <button
            type="button"
            onClick={() => details.giftCheckNumber && onValidate(details.giftCheckNumber)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Validate
          </button>
        </div>
      </div>

      {details.giftCheckBalanceBefore !== undefined && (
        <div className="p-3 bg-blue-50 rounded-lg space-y-1">
          <div className="flex justify-between text-sm">
            <span>Current Balance:</span>
            <span className="font-mono font-semibold">₱{details.giftCheckBalanceBefore.toFixed(2)}</span>
          </div>
          {details.giftCheckBalanceAfter !== undefined && (
            <div className="flex justify-between text-sm">
              <span>Remaining Balance:</span>
              <span className="font-mono font-semibold">₱{details.giftCheckBalanceAfter.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Points Input Component
export function PointsInputs({
  details,
  totalDue
}: {
  details: Partial<PointsDetails>;
  totalDue: number;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Points to Use:</span>
          <span className="text-2xl font-bold text-purple-600">
            {details.pointsUsed?.toFixed(0) || '0'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Remaining Points:</span>
          <span className="text-lg font-semibold text-slate-700">
            {details.pointsRemaining?.toFixed(0) || '0'}
          </span>
        </div>
        {details.pointsConversionRate && (
          <div className="text-xs text-slate-500 text-center pt-2 border-t">
            Conversion Rate: {details.pointsConversionRate} points = ₱1
          </div>
        )}
      </div>
    </div>
  );
}
