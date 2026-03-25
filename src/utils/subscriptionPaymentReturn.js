const STORAGE_KEY = "shms_subscription_pay_pending";

export function setSubscriptionPaymentPending({ hospital_id, package: pkg, email }) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      hospital_id,
      package: String(pkg || "silver").toLowerCase(),
      email: String(email || "")
        .toLowerCase()
        .trim(),
    })
  );
}

export function clearSubscriptionPaymentPending() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Call after Paystack redirect (?reference= or ?trxref=). Returns { ok, noPending, message }.
 * Clears pending storage only on success.
 */
export async function completeSubscriptionPaymentReturn(reference) {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  const ref = reference && String(reference).trim();
  if (!raw || !ref) return { ok: false, noPending: true };

  let pending;
  try {
    pending = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return { ok: false, message: "Invalid payment session. Start payment again from sign in." };
  }

  const res = await fetch("/api/auth/payment/complete-subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      hospital_id: pending.hospital_id,
      reference: ref,
      package: pending.package,
      email: pending.email,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    return { ok: false, message: json.message || "Could not confirm payment with the server." };
  }

  sessionStorage.removeItem(STORAGE_KEY);
  return { ok: true, message: json.message || "Payment recorded." };
}
