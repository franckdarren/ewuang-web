// app/lib/pvit.ts
// Client PVIT — https://docs.mypvit.pro
//
// Architecture PVIT :
//   1. POST /v2/{URL_CODE}/renew-secret  → obtient un token temporaire (1h)
//   2. POST /v2/{URL_CODE}/rest          → initie un paiement (header X-Secret)
//   3. PVIT envoie un webhook → notre /api/paiements/webhook
//   4. On répond { transactionId, responseCode: 200 } pour valider la réception
//
// Variables d'environnement requises (voir .env.pvit.example) :
//   PVIT_URL_CODE                 → Code URL marchand (settings/apis)
//   PVIT_OPERATION_ACCOUNT_CODE   → Code compte opération ex: ACC_TEST_xxx
//   PVIT_API_PASSWORD             → Mot de passe API (settings/apis)
//   PVIT_AGENT                    → Identifiant agent marchand
//   PVIT_CALLBACK_URL_CODE        → Code URL webhook (settings/urls)

import crypto from "crypto";

const URL_CODE = process.env.PVIT_URL_CODE ?? "";
const OPERATION_ACCOUNT_CODE = process.env.PVIT_OPERATION_ACCOUNT_CODE ?? "";
const API_PASSWORD = process.env.PVIT_API_PASSWORD ?? "";
const CALLBACK_URL_CODE = process.env.PVIT_CALLBACK_URL_CODE ?? "";
// PVIT_AGENT est optionnel — seulement si tu as plusieurs agents sur ton compte
const AGENT = process.env.PVIT_AGENT ?? "";

const PVIT_BASE = `https://api.mypvit.pro/v2/${URL_CODE}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PvitOperateurCode =
  | "AIRTEL_MONEY"
  | "MOOV_MONEY"
  | "VISA_MASTERCARD";

// Statuts dans les webhooks PVIT
export type PvitWebhookStatut = "SUCCESS" | "FAILED";

export interface PvitWebhookPayload {
  transactionId: string;
  merchantReferenceId: string;
  status: PvitWebhookStatut;
  amount: number;
  customerID: string;
  fees: number;
  totalAmount: number;
  operator: PvitOperateurCode;
  code: number;
}

export interface PvitWebhookAck {
  transactionId: string;
  responseCode: number;
}

export interface PvitInitResponse {
  status: "PENDING" | string;
  reference_id: string;
  merchant_reference_id: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Token management : renouvellement automatique (TTL 3600s avec marge)
// ---------------------------------------------------------------------------

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSecret(): Promise<string> {
  const now = Date.now();

  // Renouveler 5 minutes avant expiration
  if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  if (!URL_CODE || !OPERATION_ACCOUNT_CODE || !API_PASSWORD) {
    throw new Error(
      "PVIT non configuré : PVIT_URL_CODE, PVIT_OPERATION_ACCOUNT_CODE et PVIT_API_PASSWORD sont requis"
    );
  }

  // application/x-www-form-urlencoded requis par PVIT
  const body = new URLSearchParams({
    operationAccountCode: OPERATION_ACCOUNT_CODE,
    password: API_PASSWORD,
  });

  const response = await fetch(`${PVIT_BASE}/renew-secret`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PVIT renew-secret ${response.status}: ${text}`);
  }

  const data = await response.json() as {
    secret: string;
    expires_in: number;
    operation_account_code?: string;
  };

  cachedToken = data.secret;
  // expires_in est en secondes
  tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

  return cachedToken;
}

// ---------------------------------------------------------------------------
// Initier un paiement
// ---------------------------------------------------------------------------

export interface PvitInitPayload {
  /** Montant en XAF (minimum 500) */
  amount: number;
  /** Numéro de téléphone du client (MSISDN, ex: 077XXXXXXX) — max 23 caractères */
  customerAccountNumber: string;
  /** Code opérateur */
  operatorCode: PvitOperateurCode;
  /** Référence unique côté Ewuang — MAX 15 CARACTÈRES */
  reference: string;
  /** Qui supporte les frais PVIT : MERCHANT (marchand) ou CUSTOMER (client) */
  ownerCharge?: "MERCHANT" | "CUSTOMER";
}

/**
 * Initie un paiement mobile money via PVIT.
 * Retourne un statut PENDING — attendre le webhook pour la confirmation finale.
 */
export async function pvitInitiatePaiement(
  payload: PvitInitPayload
): Promise<PvitInitResponse> {
  const secret = await getSecret();

  if (payload.reference.length > 15) {
    throw new Error(
      `PVIT: reference trop longue (${payload.reference.length} car.) — max 15 caractères`
    );
  }

  const body: Record<string, unknown> = {
    service: "REST",
    amount: payload.amount,
    callback_url_code: CALLBACK_URL_CODE,
    customer_account_number: payload.customerAccountNumber,
    merchant_operation_account_code: OPERATION_ACCOUNT_CODE,
    transaction_type: "PAYMENT",
    operator_code: payload.operatorCode,
    reference: payload.reference,
    owner_charge: payload.ownerCharge ?? "MERCHANT",
  };

  // agent est optionnel — uniquement si configuré
  if (AGENT) body.agent = AGENT;

  const response = await fetch(`${PVIT_BASE}/rest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Secret": secret,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PVIT /rest ${response.status}: ${text}`);
  }

  return response.json() as Promise<PvitInitResponse>;
}

// ---------------------------------------------------------------------------
// Vérifier le statut d'une transaction (fallback si webhook non reçu)
// ---------------------------------------------------------------------------

export async function pvitGetStatus(
  transactionId: string
): Promise<{ status: PvitWebhookStatut | string; [key: string]: unknown }> {
  const secret = await getSecret();

  // TODO: Confirmer l'URL exacte du check-status dans ta doc PVIT
  const response = await fetch(`${PVIT_BASE}/check-status/${transactionId}`, {
    headers: { "X-Secret": secret },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PVIT check-status ${response.status}: ${text}`);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Mappage opérateur Ewuang → code PVIT
// ---------------------------------------------------------------------------

export function toOperateurCode(
  operateur: "airtel_money" | "moov_money" | "visa_mastercard"
): PvitOperateurCode {
  const map: Record<string, PvitOperateurCode> = {
    airtel_money: "AIRTEL_MONEY",
    moov_money: "MOOV_MONEY",
    visa_mastercard: "VISA_MASTERCARD",
  };
  return map[operateur] ?? "AIRTEL_MONEY";
}

// ---------------------------------------------------------------------------
// Sécurité webhook : vérification HMAC optionnelle
// (PVIT ne semble pas utiliser de signature — à confirmer dans ta doc)
// Si PVIT_WEBHOOK_HMAC_SECRET est défini, on vérifie ; sinon on passe.
// ---------------------------------------------------------------------------

export function pvitVerifyWebhookHmac(
  signature: string,
  rawBody: string
): boolean {
  const secret = process.env.PVIT_WEBHOOK_HMAC_SECRET;
  if (!secret) return true; // Non configuré → on accepte

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
