const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js"

let sdkPromise = null

const loadCashfreeSdk = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout is only available in the browser"))
  }
  if (typeof window.Cashfree === "function") return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      sdkPromise = null
      reject(new Error("Cashfree checkout failed to load"))
    }
    document.body.appendChild(script)
  })
  return sdkPromise
}

export const openCashfreeCheckout = async (paymentSessionId, cashfreeEnv) => {
  if (!paymentSessionId) throw new Error("Payment session is missing")
  await loadCashfreeSdk()
  const mode = cashfreeEnv === "production" ? "production" : "sandbox"
  const cashfree = window.Cashfree({ mode })
  const result = await cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_modal",
  })
  if (result?.error) {
    throw new Error(result.error.message || "Payment was not completed")
  }
  if (!result?.paymentDetails) {
    throw new Error("Payment was not completed")
  }
  return result.paymentDetails
}
