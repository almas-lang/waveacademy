'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, Sparkles, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { paymentApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId: string;
  programName: string;
  price: number;
  currency: string;
  lockedLessonCount: number;
}

declare global {
  interface Window {
    Cashfree: (config: { mode: string }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget: string;
      }) => Promise<{
        error?: { message: string };
        redirect?: boolean;
        paymentDetails?: Record<string, unknown>;
      }>;
    };
  }
}

function loadCashfreeSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ('Cashfree' in window) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load payment SDK'));
    document.head.appendChild(script);
  });
}

export default function UpgradeModal({
  isOpen,
  onClose,
  programId,
  programName,
  price,
  currency,
  lockedLessonCount,
}: UpgradeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Preload SDK when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCashfreeSDK().catch(() => {});
    }
  }, [isOpen]);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create order
      const { data } = await paymentApi.createOrder(programId);
      const { sessionId, orderId, cashfreeEnv } = data;

      // 2. Load Cashfree SDK
      await loadCashfreeSDK();

      // 3. Initialize Cashfree
      const cashfree = window.Cashfree({
        mode: cashfreeEnv || 'sandbox',
      });

      // 4. Open checkout modal
      const result = await cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: '_modal',
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      // 5. Verify payment
      const verifyRes = await paymentApi.verify(orderId);

      if (verifyRes.data.status === 'SUCCESS') {
        toast.success('Payment successful! All lessons are now unlocked.');
        queryClient.invalidateQueries({ queryKey: ['learner'] });
        onClose();
      } else if (verifyRes.data.status === 'FAILED') {
        setError(verifyRes.data.message || 'Payment failed. Please try again.');
      } else {
        setError('Payment is still processing. Please wait a moment and refresh the page.');
      }
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'Payment failed. Please try again.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const currencySymbol = currency === 'INR' ? '\u20B9' : '$';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-600 to-accent-700 p-6 text-white relative">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6" />
            <h2 className="text-xl font-bold">Unlock Full Program</h2>
          </div>
          <p className="text-accent-100 text-sm">{programName}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Price */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-slate-900 mb-1">
              {currencySymbol}{price}
            </div>
            <p className="text-sm text-slate-500">One-time payment</p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-slate-700">
                Unlock all {lockedLessonCount} remaining lessons
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-slate-700">Lifetime access to program content</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span className="text-slate-700">Secure payment via Cashfree</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Pay Button */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handlePayment}
            disabled={isProcessing}
            leftIcon={isProcessing ? undefined : <CreditCard className="w-4 h-4" />}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Pay ${currencySymbol}${price}`
            )}
          </Button>

          <p className="text-xs text-slate-400 text-center mt-3">
            Payments are processed securely by Cashfree
          </p>
        </div>
      </div>
    </div>
  );
}
