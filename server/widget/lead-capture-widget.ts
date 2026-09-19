/**
 * PropPulse OS - Embeddable Lead Capture Widget
 * High-performance, zero-dependency embeddable script with Shadow DOM isolation.
 * Dual render modes: inline container or floating bottom-right popup modal.
 */

declare const __RECAPTCHA_SITE_KEY__: string

;(function () {
  // Prevent duplicate initialization
  if ((window as any).__PROPPULSE_WIDGET_INITIALIZED__) {
    return
  }
  ;(window as any).__PROPPULSE_WIDGET_INITIALIZED__ = true

  // Determine API Origin from script src
  function getApiOrigin(): string {
    const currentScript =
      (document.currentScript as HTMLScriptElement) ||
      (document.querySelector('script[src*="lead-capture"]') as HTMLScriptElement)

    if (currentScript && currentScript.src) {
      try {
        const url = new URL(currentScript.src)
        return url.origin
      } catch {
        // fallback
      }
    }
    return window.location.origin
  }

  // Get reCAPTCHA site key from injection or script attribute or window
  function getRecaptchaSiteKey(scriptEl?: HTMLScriptElement | null): string {
    if (typeof __RECAPTCHA_SITE_KEY__ !== 'undefined' && __RECAPTCHA_SITE_KEY__ && !__RECAPTCHA_SITE_KEY__.startsWith('__')) {
      return __RECAPTCHA_SITE_KEY__
    }
    if ((window as any).__RECAPTCHA_SITE_KEY__) {
      return (window as any).__RECAPTCHA_SITE_KEY__
    }
    if (scriptEl && scriptEl.dataset.recaptchaSiteKey) {
      return scriptEl.dataset.recaptchaSiteKey
    }
    return ''
  }

  // Load Google reCAPTCHA v3 script dynamically
  let recaptchaLoaded = false
  function loadRecaptcha(siteKey: string) {
    if (!siteKey || recaptchaLoaded || document.getElementById('proppulse-recaptcha-script')) return
    const script = document.createElement('script')
    script.id = 'proppulse-recaptcha-script'
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.async = true
    script.defer = true
    script.onload = () => {
      recaptchaLoaded = true
    }
    document.head.appendChild(script)
  }

  // Generate reCAPTCHA v3 token
  async function executeRecaptcha(siteKey: string): Promise<string | undefined> {
    if (!siteKey) return undefined
    const grecaptcha = (window as any).grecaptcha
    if (!grecaptcha) return undefined

    return new Promise((resolve) => {
      try {
        grecaptcha.ready(async () => {
          try {
            const token = await grecaptcha.execute(siteKey, { action: 'lead_capture' })
            resolve(token)
          } catch {
            resolve(undefined)
          }
        })
      } catch {
        resolve(undefined)
      }
    })
  }

  interface WidgetConfig {
    captureKey: string
    title: string
    subtitle: string
    buttonText: string
    accent: string
    mode: 'inline' | 'popup'
  }

  function parseConfig(element?: HTMLElement | null): WidgetConfig {
    const scriptEl =
      (document.currentScript as HTMLScriptElement) ||
      (document.querySelector('script[src*="lead-capture"]') as HTMLScriptElement)

    const el = element || scriptEl || document.body

    const captureKey =
      el.getAttribute('data-capture-key') ||
      scriptEl?.getAttribute('data-capture-key') ||
      (window as any).__PROPPULSE_CAPTURE_KEY__ ||
      ''

    const title = el.getAttribute('data-title') || scriptEl?.getAttribute('data-title') || 'Schedule a Showing'
    const subtitle =
      el.getAttribute('data-subtitle') ||
      scriptEl?.getAttribute('data-subtitle') ||
      'Connect with a local property specialist.'
    const buttonText =
      el.getAttribute('data-button-text') || scriptEl?.getAttribute('data-button-text') || 'Request Tour'
    const accent = el.getAttribute('data-accent') || scriptEl?.getAttribute('data-accent') || '#9CB080'
    const mode = (el.getAttribute('data-mode') || scriptEl?.getAttribute('data-mode') || 'auto') as string

    // If explicit inline container is provided, default to inline unless mode is explicitly popup
    const resolvedMode: 'inline' | 'popup' =
      mode === 'inline' ? 'inline' : mode === 'popup' ? 'popup' : element ? 'inline' : 'popup'

    return {
      captureKey,
      title,
      subtitle,
      buttonText,
      accent,
      mode: resolvedMode,
    }
  }

  function getWidgetStyles(accent: string): string {
    return `
      :host {
        --pp-accent: ${accent};
        --pp-accent-hover: #7E9665;
        --pp-bg: #FFFFFF;
        --pp-card-bg: #FFFFFF;
        --pp-text: #1E293B;
        --pp-text-muted: #64748B;
        --pp-border: #E2E8F0;
        --pp-input-bg: #F8FAFC;
        --pp-focus-ring: rgba(156, 176, 128, 0.35);
        --pp-success: #10B981;
        --pp-error: #EF4444;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        box-sizing: border-box;
        display: block;
        color: var(--pp-text);
      }

      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .pp-widget-card {
        background: var(--pp-card-bg);
        border: 1px solid var(--pp-border);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
        width: 100%;
        max-width: 440px;
        margin: 0 auto;
        animation: pp-fade-in 0.25s ease-out;
      }

      @keyframes pp-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .pp-header {
        background: var(--pp-accent);
        padding: 20px 24px;
        color: #FFFFFF;
        position: relative;
      }

      .pp-title {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.3;
        margin-bottom: 4px;
        color: #FFFFFF;
      }

      .pp-subtitle {
        font-size: 13px;
        opacity: 0.92;
        line-height: 1.4;
        color: #F8FAFC;
      }

      .pp-close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #FFFFFF;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        transition: background 0.15s;
      }
      .pp-close-btn:hover {
        background: rgba(255, 255, 255, 0.35);
      }

      .pp-body {
        padding: 20px 24px;
      }

      .pp-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }

      .pp-form-group {
        margin-bottom: 12px;
      }

      .pp-form-group.last {
        margin-bottom: 16px;
      }

      .pp-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 5px;
        color: var(--pp-text);
      }

      .pp-label span.req {
        color: var(--pp-error);
        margin-left: 2px;
      }

      .pp-input, .pp-textarea {
        width: 100%;
        padding: 9px 12px;
        border: 1px solid var(--pp-border);
        border-radius: 8px;
        background: var(--pp-input-bg);
        color: var(--pp-text);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }

      .pp-input:focus, .pp-textarea:focus {
        border-color: var(--pp-accent);
        box-shadow: 0 0 0 3px var(--pp-focus-ring);
        background: #FFFFFF;
      }

      .pp-textarea {
        resize: vertical;
        min-height: 68px;
      }

      .pp-submit-btn {
        width: 100%;
        padding: 12px 16px;
        background: var(--pp-accent);
        color: #FFFFFF;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: opacity 0.15s, transform 0.1s;
      }

      .pp-submit-btn:hover:not(:disabled) {
        opacity: 0.92;
        transform: translateY(-1px);
      }

      .pp-submit-btn:active:not(:disabled) {
        transform: translateY(0);
      }

      .pp-submit-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .pp-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.4);
        border-top-color: #FFFFFF;
        border-radius: 50%;
        animation: pp-spin 0.6s linear infinite;
      }

      @keyframes pp-spin {
        to { transform: rotate(360deg); }
      }

      .pp-alert-error {
        background: #FEF2F2;
        border: 1px solid #FCA5A5;
        color: #991B1B;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        margin-bottom: 12px;
        display: none;
      }

      .pp-success-card {
        padding: 36px 24px;
        text-align: center;
        display: none;
      }

      .pp-success-icon {
        width: 48px;
        height: 48px;
        background: #DEF7EC;
        color: #0E9F6E;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 24px;
        font-weight: bold;
      }

      .pp-success-title {
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 6px;
      }

      .pp-success-desc {
        font-size: 13px;
        color: var(--pp-text-muted);
        line-height: 1.4;
      }

      .pp-powered-by {
        text-align: center;
        margin-top: 14px;
        font-size: 11px;
        color: var(--pp-text-muted);
      }

      /* Popup trigger button */
      .pp-popup-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483640;
        background: var(--pp-accent);
        color: #FFFFFF;
        border: none;
        border-radius: 30px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        font-family: inherit;
      }

      .pp-popup-fab:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 14px 28px -5px rgba(0, 0, 0, 0.3);
      }

      .pp-popup-fab svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      /* Modal overlay for popup mode */
      .pp-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: pp-fade-in 0.2s ease-out;
      }

      .pp-modal-overlay.open {
        display: flex;
      }

      @media (max-width: 480px) {
        .pp-grid-2 {
          grid-template-columns: 1fr;
        }
        .pp-popup-fab {
          bottom: 16px;
          right: 16px;
          padding: 10px 16px;
          font-size: 13px;
        }
      }
    `
  }

  function createWidgetFormHtml(config: WidgetConfig, isPopup: boolean): string {
    return `
      <div class="pp-widget-card">
        <div class="pp-header">
          <h2 class="pp-title">${escapeHtml(config.title)}</h2>
          <p class="pp-subtitle">${escapeHtml(config.subtitle)}</p>
          ${isPopup ? `<button type="button" class="pp-close-btn" aria-label="Close form">&times;</button>` : ''}
        </div>

        <div class="pp-success-card">
          <div class="pp-success-icon">&#10003;</div>
          <h3 class="pp-success-title">Thank you!</h3>
          <p class="pp-success-desc">A specialist will contact you shortly.</p>
        </div>

        <form class="pp-body" novalidate>
          <div class="pp-alert-error"></div>

          <div class="pp-grid-2">
            <div>
              <label class="pp-label">First Name<span class="req">*</span></label>
              <input type="text" name="firstName" required class="pp-input" placeholder="Sarah" autocomplete="given-name" />
            </div>
            <div>
              <label class="pp-label">Last Name<span class="req">*</span></label>
              <input type="text" name="lastName" required class="pp-input" placeholder="Connor" autocomplete="family-name" />
            </div>
          </div>

          <div class="pp-grid-2">
            <div>
              <label class="pp-label">Email</label>
              <input type="email" name="email" class="pp-input" placeholder="sarah@example.com" autocomplete="email" />
            </div>
            <div>
              <label class="pp-label">Phone</label>
              <input type="tel" name="phone" class="pp-input" placeholder="+1 (555) 000-0000" autocomplete="tel" />
            </div>
          </div>

          <div class="pp-grid-2">
            <div>
              <label class="pp-label">Property Address</label>
              <input type="text" name="propertyAddress" class="pp-input" placeholder="123 Main St" />
            </div>
            <div>
              <label class="pp-label">Budget / Price ($)</label>
              <input type="number" name="propertyPrice" min="0" step="1000" class="pp-input" placeholder="500000" />
            </div>
          </div>

          <div class="pp-form-group">
            <label class="pp-label">ZIP Code</label>
            <input type="text" name="zipCode" maxlength="20" class="pp-input" placeholder="78701" />
          </div>

          <div class="pp-form-group last">
            <label class="pp-label">Message</label>
            <textarea name="message" class="pp-textarea" placeholder="Tell us what you are looking for..."></textarea>
          </div>

          <button type="submit" class="pp-submit-btn">
            <span class="pp-btn-text">${escapeHtml(config.buttonText)}</span>
            <span class="pp-spinner" style="display: none;"></span>
          </button>

          <div class="pp-powered-by">
            Powered by PropPulse OS
          </div>
        </form>
      </div>
    `
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function initWidget() {
    const apiOrigin = getApiOrigin()
    const scriptEl =
      (document.currentScript as HTMLScriptElement) ||
      (document.querySelector('script[src*="lead-capture"]') as HTMLScriptElement)

    const siteKey = getRecaptchaSiteKey(scriptEl)
    if (siteKey) {
      loadRecaptcha(siteKey)
    }

    // Check if an inline container element exists
    const inlineContainers = document.querySelectorAll<HTMLElement>('#proppulse-lead-widget, [data-proppulse-widget]')

    if (inlineContainers.length > 0) {
      inlineContainers.forEach((container) => {
        const config = parseConfig(container)
        if (config.mode === 'popup') {
          renderPopupWidget(config, apiOrigin, siteKey)
        } else {
          renderInlineWidget(container, config, apiOrigin, siteKey)
        }
      })
    } else {
      // Default to popup widget attached to body
      const config = parseConfig(null)
      renderPopupWidget(config, apiOrigin, siteKey)
    }
  }

  function renderInlineWidget(container: HTMLElement, config: WidgetConfig, apiOrigin: string, siteKey: string) {
    if ((container as any).__pp_rendered__) return
    ;(container as any).__pp_rendered__ = true

    const shadow = container.attachShadow({ mode: 'open' })
    const styleEl = document.createElement('style')
    styleEl.textContent = getWidgetStyles(config.accent)
    shadow.appendChild(styleEl)

    const wrapper = document.createElement('div')
    wrapper.innerHTML = createWidgetFormHtml(config, false)
    shadow.appendChild(wrapper)

    bindFormEvents(shadow, config, apiOrigin, siteKey)
  }

  function renderPopupWidget(config: WidgetConfig, apiOrigin: string, siteKey: string) {
    const host = document.createElement('div')
    host.id = 'proppulse-widget-popup-host'
    document.body.appendChild(host)

    const shadow = host.attachShadow({ mode: 'open' })
    const styleEl = document.createElement('style')
    styleEl.textContent = getWidgetStyles(config.accent)
    shadow.appendChild(styleEl)

    const fab = document.createElement('button')
    fab.type = 'button'
    fab.className = 'pp-popup-fab'
    fab.setAttribute('aria-label', config.title)
    fab.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
      <span>${escapeHtml(config.buttonText || 'Contact Us')}</span>
    `
    shadow.appendChild(fab)

    const modalOverlay = document.createElement('div')
    modalOverlay.className = 'pp-modal-overlay'
    modalOverlay.innerHTML = createWidgetFormHtml(config, true)
    shadow.appendChild(modalOverlay)

    // Event listeners
    fab.addEventListener('click', () => {
      modalOverlay.classList.add('open')
    })

    const closeBtn = modalOverlay.querySelector('.pp-close-btn')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('open')
      })
    }

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('open')
      }
    })

    bindFormEvents(shadow, config, apiOrigin, siteKey, () => {
      // On success in popup mode, close after 5s
      setTimeout(() => {
        modalOverlay.classList.remove('open')
      }, 5000)
    })
  }

  function bindFormEvents(
    shadow: ShadowRoot,
    config: WidgetConfig,
    apiOrigin: string,
    siteKey: string,
    onSuccessCallback?: () => void
  ) {
    const form = shadow.querySelector('form.pp-body') as HTMLFormElement
    if (!form) return

    const submitBtn = form.querySelector('.pp-submit-btn') as HTMLButtonElement
    const btnText = form.querySelector('.pp-btn-text') as HTMLElement
    const spinner = form.querySelector('.pp-spinner') as HTMLElement
    const errorAlert = form.querySelector('.pp-alert-error') as HTMLElement
    const successCard = shadow.querySelector('.pp-success-card') as HTMLElement

    function showError(msg: string) {
      if (errorAlert) {
        errorAlert.textContent = msg
        errorAlert.style.display = 'block'
      }
    }

    function clearError() {
      if (errorAlert) {
        errorAlert.textContent = ''
        errorAlert.style.display = 'none'
      }
    }

    function setLoading(isLoading: boolean) {
      submitBtn.disabled = isLoading
      if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none'
      if (btnText) btnText.style.display = isLoading ? 'none' : 'inline'
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      clearError()

      const formData = new FormData(form)
      const firstName = (formData.get('firstName') as string)?.trim()
      const lastName = (formData.get('lastName') as string)?.trim()
      const email = (formData.get('email') as string)?.trim()
      const phone = (formData.get('phone') as string)?.trim()
      const propertyAddress = (formData.get('propertyAddress') as string)?.trim()
      const propertyPriceRaw = formData.get('propertyPrice') as string
      const zipCode = (formData.get('zipCode') as string)?.trim()
      const message = (formData.get('message') as string)?.trim()

      if (!firstName || !lastName) {
        showError('First and last name are required.')
        return
      }

      if (!email && !phone) {
        showError('Please provide either an email or a phone number.')
        return
      }

      if (!config.captureKey) {
        showError('Configuration error: captureKey is missing.')
        return
      }

      setLoading(true)

      let recaptchaToken: string | undefined
      if (siteKey) {
        try {
          recaptchaToken = await executeRecaptcha(siteKey)
        } catch {
          // Graceful fallback
        }
      }

      const payload: Record<string, any> = {
        captureKey: config.captureKey,
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        propertyAddress: propertyAddress || undefined,
        propertyPrice: propertyPriceRaw ? Number(propertyPriceRaw) : undefined,
        zipCode: zipCode || undefined,
        message: message || undefined,
        recaptchaToken,
      }

      try {
        const targetUrl = `${apiOrigin}/api/leads/capture`
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok || data.success === false) {
          throw new Error(data.message || `Submission failed (${res.status})`)
        }

        // Show styled success card
        form.style.display = 'none'
        if (successCard) {
          successCard.style.display = 'block'
        }

        if (onSuccessCallback) {
          onSuccessCallback()
        }

        // Auto-reset form after 5 seconds
        setTimeout(() => {
          form.reset()
          clearError()
          if (successCard) successCard.style.display = 'none'
          form.style.display = 'block'
        }, 5000)
      } catch (err: any) {
        showError(err.message || 'Unable to submit your inquiry. Please try again later.')
      } finally {
        setLoading(false)
      }
    })
  }

  // Self-execute once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget, { once: true })
  } else {
    initWidget()
  }
})()
