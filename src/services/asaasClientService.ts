import { PlanId } from './planService';

export type AsaasBillingType = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

export interface AsaasPaymentData {
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE';
  billingType: AsaasBillingType;
  value: number;
  planId: PlanId;
  planName: string;
  customer: {
    name: string;
    email: string;
    cpfCnpj?: string;
    phone?: string;
  };
  dueDate: string;
  pix?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
  boleto?: {
    identificationField: string;
    barCode: string;
    bankSlipUrl: string;
    dueDate: string;
  };
  creditCard?: {
    creditCardNumber: string;
    creditCardBrand: string;
    installments: number;
  };
  createdAt: string;
}

class AsaasClientService {
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('groply_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async createPayment(params: {
    planId: PlanId;
    billingType: AsaasBillingType;
    customer?: {
      name: string;
      email: string;
      cpfCnpj?: string;
      phone?: string;
    };
    creditCard?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
      installments?: number;
    };
  }): Promise<{ success: boolean; payment?: AsaasPaymentData; error?: string }> {
    try {
      const res = await fetch('/api/client/checkout/create', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Erro ao gerar cobrança Asaas' };
      }
      return { success: true, payment: data.payment };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão com o servidor' };
    }
  }

  async checkStatus(paymentId: string): Promise<{ success: boolean; payment?: AsaasPaymentData; error?: string }> {
    try {
      const res = await fetch(`/api/client/checkout/status/${paymentId}`, {
        headers: this.getAuthHeaders(),
      });
      const data = await res.json();
      return { success: res.ok && data.success, payment: data.payment, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async simulateConfirm(paymentId: string): Promise<{ success: boolean; payment?: AsaasPaymentData; error?: string }> {
    try {
      const res = await fetch(`/api/client/checkout/simulate-confirm/${paymentId}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      const data = await res.json();
      return { success: res.ok && data.success, payment: data.payment, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const asaasClientService = new AsaasClientService();
