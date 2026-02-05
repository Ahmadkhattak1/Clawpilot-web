type GtagEventParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

export function trackEvent(name: string, params?: GtagEventParams) {
  if (typeof window === "undefined") return
  if (typeof window.gtag !== "function") return
  window.gtag("event", name, params || {})
}
