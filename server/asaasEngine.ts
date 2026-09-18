import QRCode from "qrcode";

export type AsaasBillingType = "PIX" | "CREDIT_CARD" | "BOLETO";

export interface AsaasPaymentResult {
  id: string;
  status: "PENDING" | "RECEIVED" | "CONFIRMED" | "OVERDUE";
  billingType: AsaasBillingType;
  value: number;
  netValue?: number;
  planId: "start" | "pro" | "max";
  planName: string;
  customer: {
    name: string;
    email: string;
    cpfCnpj?: string;
  };
  dueDate: string;
  // Pix specific
  pix?: {
    encodedImage: string; // Base64 QR Code
    payload: string; // Pix Copia e Cola
    expirationDate: string;
    beneficiaryName?: string;
    beneficiaryCpf?: string;
  };
  // Boleto specific
  boleto?: {
    identificationField: string; // Linha digitavel
    barCode: string; // Codigo de barras
    bankSlipUrl: string;
    dueDate: string;
  };
  // Credit card specific
  creditCard?: {
    creditCardNumber: string;
    creditCardBrand: string;
    installments: number;
  };
  createdAt: string;
}

// Fixed Beneficiary Information requested by user
export const FIXED_PIX_DATA = {
  name: "Wendisson santos Santana",
  cpf: "087.355.455-85",
  rawCpf: "08735545585",
  city: "SERRA",
};

// CRC16-CCITT for Banco Central do Brasil EMV Pix standard
function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatEMV(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

export function generateStandardPixPayload(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId?: string;
}): string {
  const cleanKey = params.pixKey.replace(/\D/g, "");
  const formattedAmount = params.amount.toFixed(2);
  const normalizedName = params.merchantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .substring(0, 25);
  const normalizedCity = params.merchantCity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .substring(0, 15)
    .toUpperCase();
  const txid = (params.txId || `GRPLY${Date.now().toString().slice(-10)}`).replace(/[^a-zA-Z0-9]/g, "").substring(0, 25);

  // Merchant Account Information (tag 26)
  const gui = formatEMV("00", "br.gov.bcb.pix");
  const key = formatEMV("01", cleanKey);
  const merchantAccountInfo = formatEMV("26", `${gui}${key}`);

  // Additional Data Field Template (tag 62)
  const txIdField = formatEMV("05", txid);
  const additionalDataField = formatEMV("62", txIdField);

  let payload =
    formatEMV("00", "01") + // Payload Format Indicator
    merchantAccountInfo + // Merchant Account Information
    formatEMV("52", "0000") + // Merchant Category Code
    formatEMV("53", "986") + // Transaction Currency (BRL)
    formatEMV("54", formattedAmount) + // Transaction Amount
    formatEMV("58", "BR") + // Country Code
    formatEMV("59", normalizedName) + // Merchant Name
    formatEMV("60", normalizedCity) + // Merchant City
    additionalDataField + // Additional Data Field
    "6304"; // CRC16 indicator

  const crc = calculateCRC16(payload);
  return `${payload}${crc}`;
}

// In-memory store for payments
const paymentsStore = new Map<string, AsaasPaymentResult>();

class AsaasEngine {
  private getApiKey(): string {
    return process.env.ASAAS_API_KEY || "";
  }

  private getBaseUrl(): string {
    const env = process.env.ASAAS_ENVIRONMENT || "production";
    return env === "sandbox"
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/v3";
  }

  private getHeaders(): Record<string, string> {
    return {
      "access_token": this.getApiKey(),
      "Content-Type": "application/json",
      "User-Agent": "Groply-Asaas-Integration/1.0",
    };
  }

  /**
   * Creates a payment (Pix, Credit Card, or Boleto) with full support for fixed CPF 087.355.455-85
   */
  async createPayment(params: {
    planId: "start" | "pro" | "max";
    planName: string;
    value: number;
    billingType: AsaasBillingType;
    customer: {
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
  }): Promise<AsaasPaymentResult> {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const apiKey = this.getApiKey();

    // If API Key is present, try real Asaas call; otherwise generate authenticated standard Pix
    if (apiKey && !apiKey.includes("your_asaas_api_key")) {
      try {
        console.log(`[Asaas] Criando cobrança real ${params.billingType} para ${params.customer.email} em ${this.getBaseUrl()}...`);

        // 1. Procurar ou criar cliente no Asaas
        let customerId = "";
        
        if (params.customer.email) {
          const findCustRes = await fetch(
            `${this.getBaseUrl()}/customers?email=${encodeURIComponent(params.customer.email)}`,
            { headers: this.getHeaders() }
          );
          const findCustData = await findCustRes.json();
          if (findCustData?.data && findCustData.data.length > 0) {
            customerId = findCustData.data[0].id;
          }
        }

        if (!customerId) {
          const cleanCpfCnpj = (params.customer.cpfCnpj || FIXED_PIX_DATA.rawCpf).replace(/\D/g, "");
          const cleanPhone = (params.customer.phone || "27996599231").replace(/\D/g, "");

          const custPayload: any = {
            name: params.customer.name || FIXED_PIX_DATA.name,
            email: params.customer.email || "daianewendisson@gmail.com",
            cpfCnpj: cleanCpfCnpj,
            phone: cleanPhone,
          };

          const custRes = await fetch(`${this.getBaseUrl()}/customers`, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(custPayload),
          });
          const custData = await custRes.json();

          if (custData.id) {
            customerId = custData.id;
          } else if (custData.errors && custData.errors.length > 0) {
            const errDesc = custData.errors.map((e: any) => e.description).join(", ");
            throw new Error(`Asaas (Cliente): ${errDesc}`);
          }
        }

        if (customerId) {
          // 2. Criar cobrança no Asaas
          const payload: any = {
            customer: customerId,
            billingType: params.billingType,
            value: params.value,
            dueDate,
            description: `Assinatura Plano ${params.planName} - Grouply WhatsApp`,
            externalReference: paymentId,
          };

          if (params.billingType === "CREDIT_CARD" && params.creditCard) {
            payload.creditCard = {
              holderName: params.creditCard.holderName,
              number: params.creditCard.number.replace(/\s+/g, ""),
              expiryMonth: params.creditCard.expiryMonth,
              expiryYear: params.creditCard.expiryYear,
              ccv: params.creditCard.ccv,
            };
            payload.creditCardHolderInfo = {
              name: params.customer.name || FIXED_PIX_DATA.name,
              email: params.customer.email || "daianewendisson@gmail.com",
              cpfCnpj: (params.customer.cpfCnpj || FIXED_PIX_DATA.rawCpf).replace(/\D/g, ""),
              postalCode: "29160-000",
              addressNumber: "100",
              phone: (params.customer.phone || "27996599231").replace(/\D/g, ""),
            };
            payload.installmentCount = 1;
            payload.installmentValue = params.value;
          }

          const payRes = await fetch(`${this.getBaseUrl()}/payments`, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
          });
          const payData = await payRes.json();

          if (payData.id) {
            let pixData: any = undefined;
            if (params.billingType === "PIX") {
              const qrRes = await fetch(`${this.getBaseUrl()}/payments/${payData.id}/pixQrCode`, {
                headers: this.getHeaders(),
              });
              const qrJson = await qrRes.json();

              if (qrJson.payload) {
                const rawImage = qrJson.encodedImage || "";
                const encodedImage = rawImage
                  ? rawImage.startsWith("data:image")
                    ? rawImage
                    : `data:image/png;base64,${rawImage}`
                  : await QRCode.toDataURL(qrJson.payload, { width: 300, margin: 1 });

                pixData = {
                  encodedImage,
                  payload: qrJson.payload,
                  expirationDate: qrJson.expirationDate || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                  beneficiaryName: FIXED_PIX_DATA.name,
                  beneficiaryCpf: FIXED_PIX_DATA.cpf,
                };
              }
            }

            const isPaid = payData.status === "CONFIRMED" || payData.status === "RECEIVED";
            const record: AsaasPaymentResult = {
              id: payData.id,
              status: isPaid ? "CONFIRMED" : "PENDING",
              billingType: params.billingType,
              value: payData.value || params.value,
              netValue: payData.netValue,
              planId: params.planId,
              planName: params.planName,
              customer: {
                name: params.customer.name || FIXED_PIX_DATA.name,
                email: params.customer.email || "daianewendisson@gmail.com",
                cpfCnpj: FIXED_PIX_DATA.cpf,
              },
              dueDate,
              pix: pixData,
              createdAt: new Date().toISOString(),
            };

            paymentsStore.set(payData.id, record);
            return record;
          }
        }
      } catch (err: any) {
        console.warn("[Asaas API Call Warning] Falling back to high-fidelity instant Pix generator:", err.message);
      }
    }

    // Standard high-fidelity Pix generation with fixed CPF: 087.355.455-85 and Wendisson santos Santana
    const pixPayload = generateStandardPixPayload({
      pixKey: FIXED_PIX_DATA.rawCpf,
      merchantName: FIXED_PIX_DATA.name,
      merchantCity: FIXED_PIX_DATA.city,
      amount: params.value,
      txId: paymentId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20),
    });

    const qrBase64 = await QRCode.toDataURL(pixPayload, {
      width: 320,
      margin: 1,
      color: {
        dark: "#11241c",
        light: "#ffffff",
      },
    });

    const fallbackRecord: AsaasPaymentResult = {
      id: paymentId,
      status: "PENDING",
      billingType: params.billingType,
      value: params.value,
      netValue: params.value,
      planId: params.planId,
      planName: params.planName,
      customer: {
        name: FIXED_PIX_DATA.name,
        email: params.customer.email || "daianewendisson@gmail.com",
        cpfCnpj: FIXED_PIX_DATA.cpf,
      },
      dueDate,
      pix: {
        encodedImage: qrBase64,
        payload: pixPayload,
        expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        beneficiaryName: FIXED_PIX_DATA.name,
        beneficiaryCpf: FIXED_PIX_DATA.cpf,
      },
      createdAt: new Date().toISOString(),
    };

    paymentsStore.set(paymentId, fallbackRecord);
    return fallbackRecord;
  }

  async createMonthlyPixSubscription(params: { planId:"start"|"pro"|"max"; planName:string; value:number; customer:{name:string;email:string;cpfCnpj:string;phone?:string}; externalReference:string }) {
    const apiKey=this.getApiKey();
    if(!apiKey) throw new Error("ASAAS_API_KEY não configurada.");
    let customerId="";
    const find=await fetch(`${this.getBaseUrl()}/customers?email=${encodeURIComponent(params.customer.email)}`,{headers:this.getHeaders()});
    const found:any=await find.json(); customerId=found?.data?.[0]?.id||"";
    if(!customerId){
      const cr=await fetch(`${this.getBaseUrl()}/customers`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({
        name:params.customer.name,email:params.customer.email,cpfCnpj:params.customer.cpfCnpj.replace(/\D/g,""),phone:(params.customer.phone||"").replace(/\D/g,"")
      })}); const cj:any=await cr.json(); if(!cj.id) throw new Error(cj?.errors?.map((x:any)=>x.description).join(", ")||"Falha ao criar cliente Asaas"); customerId=cj.id;
    }
    const nextDueDate=new Date().toISOString().slice(0,10);
    const sr=await fetch(`${this.getBaseUrl()}/subscriptions`,{method:"POST",headers:this.getHeaders(),body:JSON.stringify({
      customer:customerId,billingType:"PIX",value:params.value,nextDueDate,cycle:"MONTHLY",
      description:`Groply - Plano ${params.planName}`,externalReference:params.externalReference
    })}); const sub:any=await sr.json(); if(!sub.id) throw new Error(sub?.errors?.map((x:any)=>x.description).join(", ")||"Falha ao criar assinatura Asaas");
    const pr=await fetch(`${this.getBaseUrl()}/subscriptions/${sub.id}/payments`,{headers:this.getHeaders()}); const pj:any=await pr.json();
    const payment=pj?.data?.[0]; if(!payment?.id) throw new Error("Cobrança inicial da assinatura não encontrada.");
    const qr=await fetch(`${this.getBaseUrl()}/payments/${payment.id}/pixQrCode`,{headers:this.getHeaders()}); const q:any=await qr.json();
    return {customerId,subscriptionId:sub.id,paymentId:payment.id,nextDueDate:sub.nextDueDate||nextDueDate,status:payment.status,pix:{payload:q.payload,encodedImage:q.encodedImage,expirationDate:q.expirationDate}};
  }

  getPayment(paymentId: string): AsaasPaymentResult | undefined {
    return paymentsStore.get(paymentId);
  }

  confirmPayment(paymentId: string): AsaasPaymentResult | undefined {
    const payment = paymentsStore.get(paymentId);
    if (payment) {
      payment.status = "CONFIRMED";
      paymentsStore.set(paymentId, payment);
    }
    return payment;
  }
}

export const asaasEngine = new AsaasEngine();
