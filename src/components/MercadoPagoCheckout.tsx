import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, AlertCircle, Check } from 'lucide-react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface PayerInfo {
  email: string;
  identification?: {
    type: string;
    number: string;
  };
}

interface MercadoPagoCheckoutProps {
  bookingId: string;
  tenantSlug: string;
  amount: number;
  serviceName: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  onPending?: (paymentData: any) => void;
  payer: PayerInfo;
}

type PaymentStatus = 'idle' | 'loading' | 'ready' | 'processing' | 'success' | 'error' | 'pending';

export const MercadoPagoCheckout = ({
  bookingId,
  tenantSlug,
  amount,
  serviceName,
  onSuccess,
  onError,
  onPending,
  payer,
}: MercadoPagoCheckoutProps) => {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cardFormInstance, setCardFormInstance] = useState<any>(null);
  const cardFormRef = useRef<HTMLDivElement>(null);
  const mpInstanceRef = useRef<any>(null);

  useEffect(() => {
    loadMercadoPagoSDK();
    return () => {
      // Cleanup
      if (cardFormInstance) {
        try {
          cardFormInstance.unmount();
        } catch (e) {
          console.log('Error unmounting card form:', e);
        }
      }
    };
  }, []);

  const loadMercadoPagoSDK = async () => {
    setStatus('loading');

    try {
      // Get public key from backend
      const { data: keyData, error: keyError } = await supabase.functions.invoke('mp-get-public-key', {
        body: { slug: tenantSlug },
      });

      if (keyError || !keyData?.public_key) {
        throw new Error(keyData?.error || 'Não foi possível obter a chave do Mercado Pago');
      }

      const publicKey = keyData.public_key;
      console.log('Got public key, loading SDK...');

      // Load SDK if not already loaded
      if (!window.MercadoPago) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://sdk.mercadopago.com/js/v2';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Mercado Pago SDK'));
          document.body.appendChild(script);
        });
      }

      // Initialize MP
      const mp = new window.MercadoPago(publicKey, {
        locale: 'pt-BR',
      });
      mpInstanceRef.current = mp;

      // Create card form
      await initializeCardForm(mp);

    } catch (error: any) {
      console.error('Error loading MP SDK:', error);
      setErrorMessage(error.message || 'Erro ao carregar o pagamento');
      setStatus('error');
    }
  };

  const initializeCardForm = async (mp: any) => {
    if (!cardFormRef.current) return;

    try {
      const cardForm = mp.cardForm({
        amount: String(amount),
        iframe: true,
        form: {
          id: 'mp-card-form',
          cardNumber: {
            id: 'mp-card-number',
            placeholder: 'Número do cartão',
          },
          expirationDate: {
            id: 'mp-expiration-date',
            placeholder: 'MM/AA',
          },
          securityCode: {
            id: 'mp-security-code',
            placeholder: 'CVV',
          },
          cardholderName: {
            id: 'mp-cardholder-name',
            placeholder: 'Nome no cartão',
          },
          installments: {
            id: 'mp-installments',
            placeholder: 'Parcelas',
          },
          identificationType: {
            id: 'mp-identification-type',
          },
          identificationNumber: {
            id: 'mp-identification-number',
            placeholder: 'CPF',
          },
          issuer: {
            id: 'mp-issuer',
            placeholder: 'Banco emissor',
          },
        },
        callbacks: {
          onFormMounted: (error: any) => {
            if (error) {
              console.error('Form mount error:', error);
              setErrorMessage('Erro ao montar formulário de pagamento');
              setStatus('error');
            } else {
              console.log('Card form mounted successfully');
              setStatus('ready');
            }
          },
          onSubmit: (event: any) => {
            event.preventDefault();
            handlePayment();
          },
          onFetching: (resource: string) => {
            console.log('Fetching:', resource);
          },
          onError: (error: any) => {
            console.error('Card form error:', error);
          },
        },
      });

      setCardFormInstance(cardForm);
    } catch (error: any) {
      console.error('Error initializing card form:', error);
      setErrorMessage('Erro ao inicializar formulário');
      setStatus('error');
    }
  };

  const handlePayment = async () => {
    if (!cardFormInstance) {
      setErrorMessage('Formulário não está pronto');
      return;
    }

    setStatus('processing');
    setErrorMessage('');

    try {
      const cardFormData = cardFormInstance.getCardFormData();
      console.log('Card form data:', cardFormData);

      if (!cardFormData.token) {
        throw new Error('Não foi possível tokenizar o cartão. Verifique os dados.');
      }

      // Process payment
      const { data, error } = await supabase.functions.invoke('mp-process-payment', {
        body: {
          booking_id: bookingId,
          token: cardFormData.token,
          payment_method_id: cardFormData.paymentMethodId,
          installments: parseInt(cardFormData.installments) || 1,
          payer: {
            email: payer.email,
            identification: cardFormData.identificationType && cardFormData.identificationNumber ? {
              type: cardFormData.identificationType,
              number: cardFormData.identificationNumber,
            } : undefined,
          },
        },
      });

      if (error) throw error;

      console.log('Payment result:', data);

      if (data.status === 'approved') {
        setStatus('success');
        onSuccess(data);
      } else if (data.status === 'pending' || data.status === 'in_process') {
        setStatus('pending');
        onPending?.(data);
      } else {
        throw new Error(getStatusMessage(data.status, data.status_detail));
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setErrorMessage(error.message || 'Erro ao processar pagamento');
      setStatus('error');
      onError(error.message);
    }
  };

  const getStatusMessage = (status: string, statusDetail?: string): string => {
    const messages: Record<string, string> = {
      cc_rejected_bad_filled_card_number: 'Número do cartão incorreto',
      cc_rejected_bad_filled_date: 'Data de validade incorreta',
      cc_rejected_bad_filled_other: 'Dados do cartão incorretos',
      cc_rejected_bad_filled_security_code: 'Código de segurança incorreto',
      cc_rejected_blacklist: 'Cartão não permitido',
      cc_rejected_call_for_authorize: 'Você deve autorizar o pagamento',
      cc_rejected_card_disabled: 'Cartão desativado',
      cc_rejected_card_error: 'Erro no cartão',
      cc_rejected_duplicated_payment: 'Pagamento duplicado',
      cc_rejected_high_risk: 'Pagamento rejeitado',
      cc_rejected_insufficient_amount: 'Saldo insuficiente',
      cc_rejected_invalid_installments: 'Parcelas inválidas',
      cc_rejected_max_attempts: 'Limite de tentativas excedido',
      rejected: 'Pagamento rejeitado',
    };

    return messages[statusDetail || ''] || messages[status] || 'Pagamento não aprovado';
  };

  const retryPayment = () => {
    setErrorMessage('');
    setStatus('loading');
    loadMercadoPagoSDK();
  };

  // Success state
  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Pagamento aprovado!</h3>
        <p className="text-zinc-400 text-sm">Seu agendamento foi confirmado.</p>
      </div>
    );
  }

  // Pending state
  if (status === 'pending') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Pagamento em processamento</h3>
        <p className="text-zinc-400 text-sm">Aguardando confirmação do pagamento.</p>
      </div>
    );
  }

  // Loading state
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex flex-col items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
        <p className="text-zinc-400 text-sm">Carregando pagamento seguro...</p>
      </div>
    );
  }

  // Error state with retry
  if (status === 'error' && !cardFormInstance) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
        <p className="text-zinc-400 text-sm mb-4">{errorMessage}</p>
        <Button onClick={retryPayment} variant="outline" className="border-zinc-700">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment info */}
      <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-zinc-400" />
          <span className="text-sm text-zinc-400">{serviceName}</span>
        </div>
        <span className="font-semibold text-emerald-400">
          R$ {amount.toFixed(2)}
        </span>
      </div>

      {/* Card Form */}
      <form id="mp-card-form" onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
        <div className="space-y-3" ref={cardFormRef}>
          {/* Card Number */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Número do cartão</label>
            <div 
              id="mp-card-number" 
              className="h-12 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4"
            />
          </div>

          {/* Expiration + CVV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Validade</label>
              <div 
                id="mp-expiration-date" 
                className="h-12 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">CVV</label>
              <div 
                id="mp-security-code" 
                className="h-12 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4"
              />
            </div>
          </div>

          {/* Cardholder name */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Nome no cartão</label>
            <input 
              id="mp-cardholder-name"
              type="text"
              className="w-full h-12 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
              placeholder="Como está no cartão"
            />
          </div>

          {/* ID Type and Number */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Tipo</label>
              <select 
                id="mp-identification-type"
                className="w-full h-12 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 text-white focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-zinc-400 mb-2">CPF</label>
              <input 
                id="mp-identification-number"
                type="text"
                className="w-full h-12 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          {/* Installments */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Parcelas</label>
            <select 
              id="mp-installments"
              className="w-full h-12 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 text-white focus:border-zinc-600 focus:outline-none"
            />
          </div>

          {/* Hidden issuer */}
          <select id="mp-issuer" className="hidden" />

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={status === 'processing' || status !== 'ready'}
            className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium disabled:opacity-50 mt-4"
          >
            {status === 'processing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar R$ {amount.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <svg className="h-4 w-4 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
        </svg>
        <span className="text-xs text-zinc-500">Pagamento seguro via Mercado Pago</span>
      </div>
    </div>
  );
};
