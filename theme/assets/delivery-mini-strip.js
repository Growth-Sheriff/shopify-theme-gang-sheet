/**
 * Delivery Info Panel v4.0.0
 * Premium delivery info panel - RIGHT of price, WIDE layout
 * Features: Inline dropdown shipping rates, Same-day PICKUP + SHIPPING
 */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  // Get config from Shopify settings or use defaults
  const SHOPIFY_CONFIG = window.DELIVERY_CONFIG || {};
  const DISPLAY_CONFIG = SHOPIFY_CONFIG.display || {};

  const CONFIG = {
    freeShippingThreshold: 10000,
    warehouseZip: SHOPIFY_CONFIG.warehouses?.[0]?.zipCode || '07105',
    warehouseCity: DISPLAY_CONFIG.locationText || 'NJ',
    pickupLocation: DISPLAY_CONFIG.pickupLocation || 'Garfield, NJ',
    pickupMapUrl: DISPLAY_CONFIG.pickupMapUrl || 'https://maps.app.goo.gl/CRMkNFqWB57YPpxG6',
    mobileCollapsed: DISPLAY_CONFIG.mobile?.collapsed ?? true,
    mobileTitle: DISPLAY_CONFIG.mobile?.title || '🚚 Shipping Info',
    timezone: 'America/New_York',

    sameDayRules: {
      'thanksgiving-sale': {
        pickup: { cutoffHour: 12, cutoffMinute: 0, label: '12:00 PM' },
        shipping: { cutoffHour: 13, cutoffMinute: 0, label: '1:00 PM' }
      },
      'dtf-supplies': {
        pickup: { cutoffHour: 16, cutoffMinute: 0, label: '4:00 PM' },
        shipping: { cutoffHour: 16, cutoffMinute: 0, label: '4:00 PM' }
      }
    },

    defaultRule: {
      pickup: { cutoffHour: 12, cutoffMinute: 0, label: '12:00 PM' },
      shipping: { cutoffHour: 13, cutoffMinute: 0, label: '1:00 PM' }
    }
  };

  const dataEl = document.querySelector('[data-delivery-data]');
  if (dataEl) {
    const threshold = dataEl.getAttribute('data-free-shipping-threshold');
    if (threshold) CONFIG.freeShippingThreshold = parseInt(threshold);
  }

  // ═══════════════════════════════════════════════════════════════
  // CART TOTAL
  // ═══════════════════════════════════════════════════════════════

  let cachedCartTotal = null;

  async function getCartTotal() {
    if (window.Shopify && window.Shopify.cart && window.Shopify.cart.total_price) {
      return window.Shopify.cart.total_price;
    }

    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      if (cart && cart.total_price !== undefined) {
        cachedCartTotal = cart.total_price;
        return cart.total_price;
      }
    } catch(e) {}

    if (cachedCartTotal !== null) return cachedCartTotal;
    return getProductPrice();
  }

  function getProductPrice() {
    if (dataEl) {
      const price = dataEl.getAttribute('data-product-price');
      if (price) return parseInt(price);
    }

    const priceEl = document.querySelector('#pm-current-price, .current-price');
    if (priceEl) {
      const text = priceEl.textContent || '';
      const match = text.match(/[\d,.]+/);
      if (match) {
        return Math.round(parseFloat(match[0].replace(',', '')) * 100);
      }
    }
    return 169;
  }

  // ═══════════════════════════════════════════════════════════════
  // SHIPPING RATES
  // ═══════════════════════════════════════════════════════════════

  function getShippingRatesFromWidget() {
    if (window.DeliveryWidget && window.DeliveryWidget.lastRates) {
      return window.DeliveryWidget.lastRates;
    }

    try {
      const cached = localStorage.getItem('delivery_shipping_rates');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.timestamp > Date.now() - 600000 && data.rates) {
          return data.rates;
        }
      }
    } catch(e) {}

    return null;
  }

  function getCustomerState() {
    // Try to get state from delivery widget's cached location
    try {
      const cached = localStorage.getItem('delivery_shipping_rates');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.state) return data.state;
      }
      // Try geoIP cache
      const geoCache = localStorage.getItem('deliveryGeoIP');
      if (geoCache) {
        const geo = JSON.parse(geoCache);
        if (geo.state) return geo.state;
      }
      // Try customerState
      const state = localStorage.getItem('customerState');
      if (state) return state;

      // Calculate state from ZIP code as fallback
      const zip = getCustomerZip();
      if (zip) {
        const ZIP_TO_STATE = {
          '0': 'CT', '1': 'NY', '2': 'DC', '3': 'FL', '4': 'KY',
          '5': 'IA', '6': 'IL', '7': 'TX', '8': 'CO', '9': 'CA',
          '00': 'PR', '01': 'MA', '02': 'MA', '03': 'NH', '04': 'ME',
          '05': 'VT', '06': 'CT', '07': 'NJ', '08': 'NJ', '09': 'PR',
          '10': 'NY', '11': 'NY', '12': 'NY', '13': 'NY', '14': 'NY',
          '15': 'PA', '16': 'PA', '17': 'PA', '18': 'PA', '19': 'PA',
          '20': 'DC', '21': 'MD', '22': 'VA', '23': 'VA', '24': 'VA',
          '25': 'WV', '26': 'WV', '27': 'NC', '28': 'NC', '29': 'SC',
          '30': 'GA', '31': 'GA', '32': 'FL', '33': 'FL', '34': 'FL',
          '35': 'AL', '36': 'AL', '37': 'TN', '38': 'TN', '39': 'MS',
          '40': 'KY', '41': 'KY', '42': 'KY', '43': 'OH', '44': 'OH',
          '45': 'OH', '46': 'IN', '47': 'IN', '48': 'MI', '49': 'MI',
          '50': 'IA', '51': 'IA', '52': 'IA', '53': 'WI', '54': 'WI',
          '55': 'MN', '56': 'MN', '57': 'SD', '58': 'ND', '59': 'MT',
          '60': 'IL', '61': 'IL', '62': 'IL', '63': 'MO', '64': 'MO',
          '65': 'MO', '66': 'KS', '67': 'KS', '68': 'NE', '69': 'NE',
          '70': 'LA', '71': 'LA', '72': 'AR', '73': 'OK', '74': 'OK',
          '75': 'TX', '76': 'TX', '77': 'TX', '78': 'TX', '79': 'TX',
          '80': 'CO', '81': 'CO', '82': 'WY', '83': 'ID', '84': 'UT',
          '85': 'AZ', '86': 'AZ', '87': 'NM', '88': 'TX', '89': 'NV',
          '90': 'CA', '91': 'CA', '92': 'CA', '93': 'CA', '94': 'CA',
          '95': 'CA', '96': 'CA', '97': 'OR', '98': 'WA', '99': 'WA'
        };
        return ZIP_TO_STATE[zip.substring(0,2)] || ZIP_TO_STATE[zip.charAt(0)] || null;
      }
    } catch(e) {}
    return null;
  }

  function getCustomerZip() {
    try {
      const zip = localStorage.getItem('customerZip');
      if (zip && /^\d{5}$/.test(zip)) return zip;

      const cached = localStorage.getItem('delivery_shipping_rates');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.zip) return data.zip;
      }

      const geoCache = localStorage.getItem('deliveryGeoIP');
      if (geoCache) {
        const geo = JSON.parse(geoCache);
        if (geo.zip) return geo.zip;
      }
    } catch(e) {}
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT TYPE & SAME-DAY RULES
  // ═══════════════════════════════════════════════════════════════

  function getProductType() {
    const breadcrumbs = document.querySelectorAll('.breadcrumb a, nav a');
    for (const a of breadcrumbs) {
      const href = a.getAttribute('href') || '';
      if (href.includes('/collections/thanksgiving') || href.includes('/collections/dtf-transfer')) {
        return 'transfer';
      }
      if (href.includes('/collections/dtf-supplies') || href.includes('/collections/supplies')) {
        return 'supplies';
      }
    }

    const url = window.location.href.toLowerCase();
    if (url.includes('supplies')) return 'supplies';

    const title = document.querySelector('h1, .product-title')?.textContent?.toLowerCase() || '';
    if (title.includes('transfer') || title.includes('gang sheet') || title.includes('dtf ')) {
      return 'transfer';
    }

    return 'transfer';
  }

  function getSameDayRule() {
    const type = getProductType();
    if (type === 'supplies') return CONFIG.sameDayRules['dtf-supplies'];
    return CONFIG.sameDayRules['thanksgiving-sale'];
  }

  // ═══════════════════════════════════════════════════════════════
  // TIME CALCULATIONS
  // ═══════════════════════════════════════════════════════════════

  function getESTTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: CONFIG.timezone }));
  }

  function isBusinessDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  }

  function getNextBusinessDay(fromDate) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + 1);
    while (!isBusinessDay(date)) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  function formatDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function checkSameDayEligibility(type = 'shipping') {
    const rule = getSameDayRule();
    const typeRule = rule[type];
    const now = getESTTime();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (!isBusinessDay(now)) {
      const nextBiz = getNextBusinessDay(now);
      return {
        eligible: false,
        reason: 'weekend',
        nextAvailable: nextBiz,
        nextDayName: formatDayName(nextBiz),
        cutoffLabel: typeRule.label
      };
    }

    const totalMinutesNow = currentHour * 60 + currentMinute;
    const cutoffMinutes = typeRule.cutoffHour * 60 + typeRule.cutoffMinute;

    if (totalMinutesNow < cutoffMinutes) {
      const remainingMinutes = cutoffMinutes - totalMinutesNow;
      const hours = Math.floor(remainingMinutes / 60);
      const mins = remainingMinutes % 60;

      return {
        eligible: true,
        timeRemaining: { hours, minutes: mins, total: remainingMinutes },
        cutoffLabel: typeRule.label,
        urgency: remainingMinutes < 60 ? 'critical' : remainingMinutes < 120 ? 'high' : 'normal'
      };
    }

    const nextBiz = getNextBusinessDay(now);
    return {
      eligible: false,
      reason: 'after-cutoff',
      nextAvailable: nextBiz,
      nextDayName: formatDayName(nextBiz),
      cutoffLabel: typeRule.label
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════

  function injectStyles() {
    if (document.getElementById('dip-styles-v4')) return;

    const styles = document.createElement('style');
    styles.id = 'dip-styles-v4';
    styles.textContent = `
      /* ═══ LAYOUT ═══ */
      .product-price-box {
        display: block !important;
      }

      .price-delivery-wrapper {
        display: flex;
        align-items: stretch;
        gap: 24px;
        flex-wrap: nowrap;
      }

      .price-left-section {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 140px;
      }

      .price-left-section .price-badge {
        margin-bottom: 6px;
      }

      .price-left-section .current-price {
        font-size: 2rem !important;
        font-weight: 700 !important;
        color: #1a1a1a !important;
        line-height: 1.1;
      }

      .price-left-section .compare-price {
        font-size: 1rem;
        color: #999;
        text-decoration: line-through;
        margin-left: 8px;
      }

      /* ═══ DELIVERY PANEL ═══ */
      .delivery-info-panel {
        flex: 1;
        min-width: 420px;
        max-width: 700px;
        background: #ffffff;
        border: 1px solid #eaeaea;
        border-radius: 16px;
        padding: 16px 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      }

      /* ═══ SAME-DAY ROW ═══ */
      /* ═══ PICKUP ALERT ═══ */
      .dip-pickup-alert {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        margin-bottom: 14px;
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 1px solid #fbbf24;
        border-radius: 12px;
        border-left: 4px solid #f59e0b;
      }

      .dip-pickup-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .dip-pickup-icon svg {
        width: 28px;
        height: 28px;
        color: #92400e;
      }

      .dip-pickup-content {
        flex: 1;
        min-width: 0;
      }

      .dip-pickup-title {
        font-size: 13px;
        font-weight: 700;
        color: #92400e;
        margin-bottom: 2px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .dip-pickup-badge {
        font-size: 9px;
        background: #f59e0b;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .dip-pickup-subtitle {
        font-size: 11px;
        color: #a16207;
      }

      .dip-pickup-link {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: rgba(255,255,255,0.7);
        border: 1px solid #fbbf24;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 600;
        color: #92400e;
        text-decoration: none;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .dip-pickup-link:hover {
        background: white;
        color: #78350f;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
      }

      .dip-pickup-link svg {
        width: 14px;
        height: 14px;
      }

      /* ═══ SAME-DAY ROW ═══ */
      .dip-sameday-section {
        display: flex;
        gap: 12px;
        margin-bottom: 14px;
      }

      .dip-sameday-item {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 10px;
        background: #f9f9f9;
        border: 1px solid #eee;
        transition: all 0.2s;
      }

      .dip-sameday-item.eligible {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border-color: #86efac;
      }

      .dip-sameday-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
      }
      
      .dip-sameday-item.eligible .dip-sameday-icon {
        color: #16a34a;
      }

      .dip-sameday-info {
        flex: 1;
      }

      .dip-sameday-label {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #888;
        margin-bottom: 2px;
      }

      .dip-sameday-item.eligible .dip-sameday-label {
        color: #16a34a;
      }

      .dip-sameday-status {
        font-size: 13px;
        font-weight: 700;
        color: #333;
      }

      .dip-sameday-item.eligible .dip-sameday-status {
        color: #15803d;
      }

      .dip-sameday-time {
        font-size: 10px;
        color: #888;
        margin-top: 1px;
      }

      .dip-sameday-item.eligible .dip-sameday-time {
        color: #22c55e;
      }

      .dip-countdown-urgent {
        color: #dc2626 !important;
        animation: blink 1s ease-in-out infinite;
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      /* ═══ SHIPPING ROW ═══ */
      .dip-shipping-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        border-top: 1px solid #f0f0f0;
        border-bottom: 1px solid #f0f0f0;
        margin-bottom: 12px;
      }

      .dip-shipping-main {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .dip-shipping-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #555;
      }

      .dip-shipping-name {
        font-size: 14px;
        font-weight: 600;
        color: #222;
      }

      .dip-shipping-days {
        font-size: 12px;
        color: #16a34a;
        font-weight: 500;
      }

      .dip-shipping-right {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .dip-shipping-price {
        font-size: 18px;
        font-weight: 700;
        color: #111;
      }

      .dip-view-rates-btn {
        font-size: 12px;
        color: #3b82f6;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        border-radius: 6px;
        background: #eff6ff;
        border: none;
        transition: all 0.2s;
      }

      .dip-view-rates-btn:hover {
        background: #dbeafe;
        color: #2563eb;
      }

      .dip-view-rates-btn .arrow {
        transition: transform 0.2s;
      }

      .dip-view-rates-btn.open .arrow {
        transform: rotate(180deg);
      }

      /* ═══ RATES DROPDOWN ═══ */
      .dip-rates-dropdown {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        margin-bottom: 0;
      }

      .dip-rates-dropdown.open {
        max-height: 300px;
        margin-bottom: 12px;
      }

      .dip-rates-list {
        padding: 10px 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .dip-rate-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: #fafafa;
        border-radius: 8px;
        border: 1px solid #eee;
        transition: all 0.15s;
      }

      .dip-rate-item:hover {
        background: #f5f5f5;
        border-color: #ddd;
      }

      .dip-rate-item.best {
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border-color: #fbbf24;
      }

      .dip-rate-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .dip-rate-name {
        font-size: 13px;
        font-weight: 600;
        color: #333;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .dip-rate-badge {
        font-size: 9px;
        background: #f59e0b;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .dip-rate-days {
        font-size: 11px;
        color: #16a34a;
      }

      .dip-rate-price {
        font-size: 15px;
        font-weight: 700;
        color: #111;
      }

      /* ═══ FREE SHIPPING ═══ */
      .dip-free-section {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .dip-free-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
      }

      .dip-free-text {
        flex: 1;
        font-size: 12px;
        color: #555;
      }

      .dip-free-amount {
        font-weight: 700;
        color: #16a34a;
      }

      .dip-free-progress {
        width: 80px;
        height: 5px;
        background: #e5e5e5;
        border-radius: 3px;
        overflow: hidden;
      }

      .dip-free-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #4ade80);
        border-radius: 3px;
        transition: width 0.3s;
      }

      .dip-free-earned {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #15803d;
      }

      /* ═══ RESPONSIVE ═══ */
      @media (max-width: 900px) {
        .price-delivery-wrapper {
          flex-direction: column;
          gap: 16px;
        }

        .delivery-info-panel {
          min-width: 100%;
          max-width: 100%;
        }

        .price-left-section {
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }
      }

      @media (max-width: 500px) {
        .dip-sameday-section {
          flex-direction: column;
          gap: 8px;
        }
      }
      /* ═══ MOBILE COLLAPSED MODE - Modern Clean ═══ */
        @media (max-width: 768px) {
          .delivery-info-panel.mobile-mode { padding: 0 !important; border-radius: 12px; overflow: hidden; background: #fff; border: 1px solid #e8e8e8; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
          .dip-mobile-header { display: flex; flex-direction: column; gap: 0; padding: 0; background: #fafafa; cursor: pointer; user-select: none; }
          .dip-mobile-header-top { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; }
          .dip-mobile-header-left { display: flex; align-items: center; gap: 10px; }
          .dip-mobile-header-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: #666; }
          .dip-mobile-header-icon svg { width: 20px; height: 20px; }
          .dip-mobile-header-title { font-size: 14px; font-weight: 600; color: #333; }
          .dip-mobile-header-arrow { font-size: 10px; color: #999; transition: transform 0.2s ease; }
          .dip-mobile-header-arrow svg { width: 16px; height: 16px; }
          .delivery-info-panel.mobile-mode.expanded .dip-mobile-header-arrow { transform: rotate(180deg); }
          .delivery-info-panel.mobile-mode.expanded .dip-mobile-header { border-bottom: 1px solid #eee; }
          
          /* Preview Info Row */
          .dip-mobile-preview { display: flex; flex-wrap: wrap; gap: 6px 12px; padding: 0 14px 12px 14px; }
          .dip-mobile-preview-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #555; }
          .dip-mobile-preview-item svg { width: 14px; height: 14px; color: #888; flex-shrink: 0; }
          .dip-mobile-preview-item.highlight { color: #16a34a; font-weight: 500; }
          .dip-mobile-preview-item.highlight svg { color: #16a34a; }
          .dip-mobile-preview-badge { font-size: 10px; background: #22c55e; color: white; padding: 1px 6px; border-radius: 4px; font-weight: 500; }
          
          /* Free Shipping Mini Bar */
          .dip-mobile-freeship { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: #f5f5f5; border-top: 1px solid #eee; }
          .dip-mobile-freeship svg { width: 14px; height: 14px; color: #888; flex-shrink: 0; }
          .dip-mobile-freeship-text { font-size: 11px; color: #666; flex: 1; }
          .dip-mobile-freeship-text strong { color: #333; font-weight: 600; }
          .dip-mobile-freeship-bar { width: 60px; height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden; }
          .dip-mobile-freeship-fill { height: 100%; background: #22c55e; border-radius: 2px; }
          .dip-mobile-freeship.earned { background: #f0fdf4; }
          .dip-mobile-freeship.earned svg { color: #16a34a; }
          .dip-mobile-freeship.earned .dip-mobile-freeship-text { color: #16a34a; }
          
          .dip-mobile-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
          .delivery-info-panel.mobile-mode.expanded .dip-mobile-content { max-height: 800px; }
          .dip-mobile-inner { padding: 14px; }
          
          /* Hide preview when expanded */
          .delivery-info-panel.mobile-mode.expanded .dip-mobile-preview { display: none; }
          .delivery-info-panel.mobile-mode.expanded .dip-mobile-freeship { display: none; }
        }
        @media (min-width: 769px) {
          .dip-mobile-header { display: none !important; }
          .dip-mobile-content { max-height: none !important; overflow: visible !important; }
        }

        #delivery-mini-strip-container {
        display: none !important;
      }

      /* ═══ ZIP INPUT TRIGGER & POPUP ═══ */
      .dip-zip-trigger {
        cursor: pointer;
        color: #7367f0 !important;
        text-decoration: underline;
      }
      .dip-zip-trigger:hover {
        color: #5a50d9 !important;
      }
      .dip-shipping-row {
        position: relative;
      }
      .dip-zip-popup {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        display: none;
      }
      .dip-zip-popup.active {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .dip-zip-popup input {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        width: 100px;
      }
      .dip-zip-popup button {
        padding: 8px 16px;
        background: #7367f0;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }
      .dip-zip-popup button:hover {
        background: #5a50d9;
      }

      /* ═══ ZIP LOCATION ROW ═══ */
      .dip-zip-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 0;
        border-top: 1px solid #f0f0f0;
        font-size: 0.85rem;
      }
      .dip-zip-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
      }
      .dip-zip-text {
        color: #666;
      }
      .dip-zip-text strong {
        color: #333;
      }

      /* ═══ INLINE ZIP INPUT ═══ */
      .dip-zip-inline-input {
        display: none;
        align-items: center;
        gap: 4px;
        margin-left: auto;
      }
      .dip-zip-inline-input.active {
        display: flex;
      }
      .dip-zip-inline-input input {
        width: 70px;
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
        text-align: center;
      }
      .dip-zip-inline-input input:focus {
        outline: none;
        border-color: #7367f0;
      }
      .dip-zip-inline-input button {
        padding: 4px 10px;
        background: #7367f0;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      .dip-zip-inline-input button:hover {
        background: #5a50d9;
      }

      .dip-zip-change {
        background: none;
        border: none;
        color: #7367f0;
        cursor: pointer;
        font-size: 0.85rem;
        text-decoration: underline;
        padding: 0;
        margin-left: auto;
      }
      .dip-zip-row.editing .dip-zip-text {
        display: none;
      }
      .dip-zip-row.editing .dip-zip-change {
        display: none;
      }
      .dip-zip-row.editing .dip-zip-inline-input {
        display: flex;
      }
      .dip-zip-change:hover {
        color: #5a50d9;
      }
    `;
    document.head.appendChild(styles);
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER PANEL
  // ═══════════════════════════════════════════════════════════════

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function formatTimeRemaining(time) {
    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m`;
    }
    return `${time.minutes} min`;
  }

  // Format delivery date from API (same as checkout)
  function formatDeliveryDatePanel(dateStr) {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch(e) {
      return null;
    }
  }

  // Get delivery text - prioritize API date over calculated days
  function getDeliveryTextPanel(rate, state) {
    // Priority 1: Use delivery_date (most accurate - same as checkout)
    if (rate.deliveryDate || rate.delivery_date) {
      const formatted = formatDeliveryDatePanel(rate.deliveryDate || rate.delivery_date);
      if (formatted) return formatted;
    }
    // Priority 2: Use delivery_range
    const range = rate.deliveryRange || rate.delivery_range;
    if (range && range.length >= 2) {
      const min = formatDeliveryDatePanel(range[0]);
      const max = formatDeliveryDatePanel(range[1]);
      if (min && max) {
        return min === max ? min : `${min} - ${max}`;
      }
    }
    // Priority 3: Use delivery_days
    const days = rate.deliveryDays || rate.delivery_days;
    if (days) {
      // Array format [min, max]
      if (Array.isArray(days)) {
        const min = days[0];
        const max = days[1] || min;
        if (min > 0 || max > 0) {
          const text = min === max ? `${min}` : `${min}-${max}`;
          return `${text} business days`;
        }
      }
      // String format
      const parsed = parseFloat(String(days).replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        return `${Math.floor(parsed)}-${Math.ceil(parsed)} business days`;
      }
    }
    // Fallback to zone-based
    return getZoneDaysTextPanel(state);
  }

  function formatDeliveryDays(daysValue, state) {
    if (!daysValue) return getZoneDaysTextPanel(state);

    // Array format from API [min, max]
    if (Array.isArray(daysValue)) {
      const min = daysValue[0];
      const max = daysValue[1] || min;
      if (min > 0 || max > 0) {
        return (min === max ? `${min}` : `${min}-${max}`) + ' business days';
      }
      return getZoneDaysTextPanel(state);
    }

    // String format
    let daysStr = String(daysValue);
    const parsed = parseFloat(daysStr.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      return getZoneDaysTextPanel(state);
    }

    if (daysStr.includes(',')) {
      daysStr = daysStr.replace(',', '-');
    }

    return daysStr + ' business days';
  }

  function getZoneDaysTextPanel(state) {
    const ZONES = {
      1: ['NJ', 'NY', 'PA', 'CT', 'MA', 'RI', 'NH', 'VT', 'ME', 'DE', 'MD', 'DC'],
      2: ['VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'OH', 'IN', 'MI', 'IL', 'WI', 'KY', 'TN'],
      3: ['AL', 'MS', 'LA', 'AR', 'MO', 'IA', 'MN', 'ND', 'SD', 'NE', 'KS', 'OK', 'TX'],
      4: ['MT', 'WY', 'CO', 'NM', 'ID', 'UT', 'AZ', 'NV', 'WA', 'OR', 'CA', 'AK', 'HI']
    };
    const ZONE_DAYS = { 1: 2, 2: 3, 3: 4, 4: 5 };

    let zone = 3; // default
    if (state) {
      for (const [z, states] of Object.entries(ZONES)) {
        if (states.includes(state)) {
          zone = parseInt(z);
          break;
        }
      }
    }
    const days = ZONE_DAYS[zone];
    return `${days}-${days + 1} business days`;
  }

  function calculateEstimatedDeliveryDate(daysValue, state) {
    // Parse days value ("1,1" -> 1.1)
    let days = 0;
    if (daysValue) {
      const daysStr = String(daysValue).replace(',', '.');
      days = parseFloat(daysStr);
    }

    // If no valid days or 0, use zone-based fallback
    if (isNaN(days) || days <= 0) {
      const ZONES = {
        1: ['NJ', 'NY', 'PA', 'CT', 'MA', 'RI', 'NH', 'VT', 'ME', 'DE', 'MD', 'DC'],
        2: ['VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'OH', 'IN', 'MI', 'IL', 'WI', 'KY', 'TN'],
        3: ['AL', 'MS', 'LA', 'AR', 'MO', 'IA', 'MN', 'ND', 'SD', 'NE', 'KS', 'OK', 'TX'],
        4: ['MT', 'WY', 'CO', 'NM', 'ID', 'UT', 'AZ', 'NV', 'WA', 'OR', 'CA', 'AK', 'HI']
      };
      const ZONE_DAYS = { 1: 2, 2: 3, 3: 4, 4: 5 };
      let zone = 3;
      if (state) {
        for (const [z, states] of Object.entries(ZONES)) {
          if (states.includes(state)) {
            zone = parseInt(z);
            break;
          }
        }
      }
      days = ZONE_DAYS[zone] || 3;
    }

    const now = getESTTime();
    const rule = getSameDayRule();
    const cutoffHour = rule.shipping.cutoffHour;
    const isPastCutoff = now.getHours() >= cutoffHour;

    // Start from today or tomorrow based on cutoff
    let startDate = new Date(now);
    if (isPastCutoff) {
      startDate.setDate(startDate.getDate() + 1);
    }

    // Skip weekends for start
    while (startDate.getDay() === 0 || startDate.getDay() === 6) {
      startDate.setDate(startDate.getDate() + 1);
    }

    // Add business days for delivery
    const minDays = Math.floor(days);
    const maxDays = Math.ceil(days);

    function addBizDays(fromDate, numDays) {
      const result = new Date(fromDate);
      let added = 0;
      while (added < numDays) {
        result.setDate(result.getDate() + 1);
        if (result.getDay() !== 0 && result.getDay() !== 6) added++;
      }
      return result;
    }

    const minDate = addBizDays(startDate, minDays);
    const maxDate = minDays === maxDays ? minDate : addBizDays(startDate, maxDays);

    return { minDate, maxDate, isPastCutoff };
  }

  function formatShortDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  async function createPanel() {
    const pickupStatus = checkSameDayEligibility('pickup');
    const shippingStatus = checkSameDayEligibility('shipping');
    const rates = getShippingRatesFromWidget();
    const cartTotal = await getCartTotal();

    const threshold = CONFIG.freeShippingThreshold;
    const remaining = Math.max(0, threshold - cartTotal);
    const progress = Math.min(100, (cartTotal / threshold) * 100);
    const hasFreeShipping = remaining <= 0;

    let bestRate = null;
    if (rates && rates.length > 0) {
      bestRate = rates[0];
    }

    const panel = document.createElement('div');
    panel.className = 'delivery-info-panel' + (CONFIG.mobileCollapsed ? ' mobile-mode' : '');
    panel.id = 'delivery-info-panel';

    let html = '';

    // ─── MOBILE HEADER ───
    html += '<div class="dip-mobile-header" data-action="toggle-mobile">';
    
    // Top row with title and arrow
    html += '<div class="dip-mobile-header-top">';
    html += '<div class="dip-mobile-header-left">';
    html += '<span class="dip-mobile-header-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>';
    html += '<span class="dip-mobile-header-title">Shipping & Pickup</span>';
    html += '</div>';
    html += '<span class="dip-mobile-header-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>';
    html += '</div>';
    
    // Preview info row (visible when collapsed)
    html += '<div class="dip-mobile-preview">';
    
    // Shipping status
    if (shippingStatus.eligible) {
      html += '<div class="dip-mobile-preview-item highlight">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
      html += '<span>Ships Today</span>';
      html += '</div>';
    } else {
      html += '<div class="dip-mobile-preview-item">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
      html += '<span>Ships ' + (shippingStatus.nextDayName || 'Tomorrow') + '</span>';
      html += '</div>';
    }
    
    // Pickup info
    if (pickupStatus.eligible) {
      html += '<div class="dip-mobile-preview-item">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
      html += '<span>Pickup</span><span class="dip-mobile-preview-badge">FREE</span>';
      html += '</div>';
    }
    
    // Countdown (if eligible)
    if (shippingStatus.eligible && shippingStatus.timeRemaining) {
      html += '<div class="dip-mobile-preview-item">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      html += '<span>' + formatTimeRemaining(shippingStatus.timeRemaining) + ' left</span>';
      html += '</div>';
    }
    
    html += '</div>';
    
    // Free shipping mini bar
    if (hasFreeShipping) {
      html += '<div class="dip-mobile-freeship earned">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      html += '<span class="dip-mobile-freeship-text">FREE shipping unlocked!</span>';
      html += '</div>';
    } else {
      html += '<div class="dip-mobile-freeship">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
      html += '<span class="dip-mobile-freeship-text"><strong>' + formatMoney(remaining) + '</strong> to free shipping</span>';
      html += '<div class="dip-mobile-freeship-bar"><div class="dip-mobile-freeship-fill" style="width: ' + progress + '%"></div></div>';
      html += '</div>';
    }
    
    html += '</div>'; // close mobile header
    html += '<div class="dip-mobile-content"><div class="dip-mobile-inner">';


    // ─── PICKUP ALERT ───
    html += '<div class="dip-pickup-alert">';
    html += '<span class="dip-pickup-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;color:#92400e"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>';
    html += '<div class="dip-pickup-content">';
    if (pickupStatus.eligible) {
      const urgentClass = pickupStatus.urgency === 'critical' ? 'dip-countdown-urgent' : '';
      html += `<div class="dip-pickup-title">Same-Day Pickup Available <span class="dip-pickup-badge">FREE</span></div>`;
      html += `<div class="dip-pickup-subtitle ${urgentClass}">Order within ${formatTimeRemaining(pickupStatus.timeRemaining)} • ${CONFIG.pickupLocation}</div>`;
    } else {
      html += `<div class="dip-pickup-title">Pickup Available ${pickupStatus.nextDayName || 'Tomorrow'}</div>`;
      html += `<div class="dip-pickup-subtitle">Cutoff ${pickupStatus.cutoffLabel} EST • ${CONFIG.pickupLocation}</div>`;
    }
    html += '</div>';
    html += `<a href="${CONFIG.pickupMapUrl}" target="_blank" class="dip-pickup-link" onclick="event.stopPropagation();">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      <span>Directions</span>
    </a>`;
    html += '</div>';

    // ─── SHIPPING ROW ───
    html += '<div class="dip-sameday-section">';
    html += `<div class="dip-sameday-item ${shippingStatus.eligible ? 'eligible' : ''}">`;
    if (shippingStatus.eligible) {
      html += '<span class="dip-sameday-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>';
    } else {
      html += '<span class="dip-sameday-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>';
    }
    html += '<div class="dip-sameday-info">';
    html += '<div class="dip-sameday-label">SHIPPING</div>';
    if (shippingStatus.eligible) {
      const urgentClass = shippingStatus.urgency === 'critical' ? 'dip-countdown-urgent' : '';
      html += `<div class="dip-sameday-status">Ships Today</div>`;
      html += `<div class="dip-sameday-time ${urgentClass}">Order in ${formatTimeRemaining(shippingStatus.timeRemaining)}</div>`;
    } else {
      html += `<div class="dip-sameday-status">Ships ${shippingStatus.nextDayName || 'Tomorrow'}</div>`;
      html += `<div class="dip-sameday-time">Cutoff ${shippingStatus.cutoffLabel} EST</div>`;
    }
    html += '</div></div>';
    html += '</div>';

    // ─── SHIPPING RATE ROW ───
    html += '<div class="dip-shipping-section">';
    html += '<div class="dip-shipping-main">';
    html += '<span class="dip-shipping-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:24px;height:24px;color:#555"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>';
    html += '<div class="dip-shipping-details">';
    if (bestRate) {
      const customerState = getCustomerState();
      const deliveryText = getDeliveryTextPanel(bestRate, customerState);
      html += `<span class="dip-shipping-name">${bestRate.name || 'UPS Ground'}</span>`;
      html += `<span class="dip-shipping-days">${deliveryText}</span>`;
    } else {
      html += '<span class="dip-shipping-name">Shipping</span>';
      html += '<span class="dip-shipping-days dip-zip-trigger" data-action="open-zip-input">Enter ZIP code</span>';
    }
    html += '</div></div>';

    html += '<div class="dip-shipping-right">';
    if (bestRate && bestRate.price) {
      const priceNum = parseFloat(bestRate.price);
      html += `<span class="dip-shipping-price">$${priceNum.toFixed(2)}</span>`;
    }
    if (rates && rates.length > 1) {
      html += `<button class="dip-view-rates-btn" data-action="toggle-rates">
        <span>View all</span>
        <span class="arrow">▼</span>
      </button>`;
    }
    html += '</div>';

    // ─── ZIP INPUT POPUP ───
    // Removed - using unified ZIP input from shipping tab widget

    html += '</div>'; // close shipping-section

    // ─── ZIP LOCATION ROW ───
    const zipCode = getCustomerZip();
    const stateCode = getCustomerState();
    if (zipCode) {
      html += `<div class="dip-zip-row">
        <span class="dip-zip-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:#666"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
        <span class="dip-zip-text">Delivering to <strong>${zipCode}</strong> (${stateCode || 'US'})</span>
        <button class="dip-zip-change" data-action="open-shipping-tab">Change</button>
      </div>`;
    } else {
      html += `<div class="dip-zip-row">
        <span class="dip-zip-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:#666"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
        <span class="dip-zip-text dip-zip-trigger" data-action="open-shipping-tab">Enter your ZIP code for rates</span>
      </div>`;
    }

    // ─── RATES DROPDOWN ───
    if (rates && rates.length > 0) {
      const customerState = getCustomerState();
      html += '<div class="dip-rates-dropdown" id="dip-rates-dropdown">';
      html += '<div class="dip-rates-list">';
      rates.forEach((rate, idx) => {
        const deliveryText = getDeliveryTextPanel(rate, customerState);
        const priceNum = parseFloat(rate.price);
        html += `
          <div class="dip-rate-item ${idx === 0 ? 'best' : ''}">
            <div class="dip-rate-info">
              <span class="dip-rate-name">
                ${rate.name}
                ${idx === 0 ? '<span class="dip-rate-badge">BEST VALUE</span>' : ''}
              </span>
              <span class="dip-rate-days">${deliveryText}</span>
            </div>
            <span class="dip-rate-price">$${priceNum.toFixed(2)}</span>
          </div>
        `;
      });
      html += '</div></div>';
    }

    // ─── FREE SHIPPING ───
    html += '<div class="dip-free-section">';
    if (hasFreeShipping) {
      html += '<div class="dip-free-earned"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> FREE shipping unlocked!</div>';
    } else {
      html += '<span class="dip-free-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;color:#888"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/><rect x="2" y="7" width="20" height="5" rx="1"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></span>';
      html += `<span class="dip-free-text"><span class="dip-free-amount">${formatMoney(remaining)}</span> to free shipping</span>`;
      html += `<div class="dip-free-progress"><div class="dip-free-progress-fill" style="width: ${progress}%"></div></div>`;
    }
    html += '</div>';


    // Close mobile wrapper
    html += '</div></div>';

    panel.innerHTML = html;

    // Event: Toggle rates dropdown
    const toggleBtn = panel.querySelector('[data-action="toggle-rates"]');
    const dropdown = panel.querySelector('#dip-rates-dropdown');

    if (toggleBtn && dropdown) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBtn.classList.toggle('open');
        dropdown.classList.toggle('open');
      });
    }


    // Event: Mobile header toggle
    const mobileHeader = panel.querySelector('[data-action="toggle-mobile"]');
    if (mobileHeader) {
      mobileHeader.addEventListener('click', (e) => {
        e.preventDefault();
        panel.classList.toggle('expanded');
      });
    }

    // Event: Open shipping tab (unified ZIP entry)
    const openShippingActions = panel.querySelectorAll('[data-action="open-shipping-tab"], .dip-zip-trigger');
    openShippingActions.forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Find and click the Shipping tab
        const shippingTab = document.querySelector('[data-tab="ship"], [data-tab="shipping"], .product-tab-btn[data-tab="ship"]');
        if (shippingTab) {
          shippingTab.click();
          // Scroll to tabs area
          const tabsSection = document.querySelector('.product-tabs-section, .pm-accordion-section');
          if (tabsSection) {
            tabsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          // Focus on ZIP input in the delivery widget
          setTimeout(() => {
            const widgetZipInput = document.querySelector('.dw-zip-input input, [data-zip-input]');
            if (widgetZipInput) widgetZipInput.focus();
          }, 300);
        }
      });
    });

    return panel;
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  async function restructurePriceBox() {
    const priceBox = document.querySelector('.product-price-box');
    if (!priceBox) return;
    if (priceBox.dataset.dipRestructured === 'v4') return;

    priceBox.dataset.dipRestructured = 'v4';

    const priceBadge = priceBox.querySelector('.price-badge');
    const priceRow = priceBox.querySelector('.price-row');
    const totalRow = priceBox.querySelector('.total-price-row');
    
    // Preserve social proof if it exists inside price-box
    const socialProof = priceBox.querySelector('.social-proof-container');

    const wrapper = document.createElement('div');
    wrapper.className = 'price-delivery-wrapper';

    const leftSection = document.createElement('div');
    leftSection.className = 'price-left-section';

    if (priceBadge) leftSection.appendChild(priceBadge.cloneNode(true));
    if (priceRow) leftSection.appendChild(priceRow.cloneNode(true));
    if (totalRow) leftSection.appendChild(totalRow.cloneNode(true));

    const panel = await createPanel();

    wrapper.appendChild(leftSection);
    wrapper.appendChild(panel);

    priceBox.innerHTML = '';
    priceBox.appendChild(wrapper);
    
    // Re-add social proof after delivery panel if it existed
    if (socialProof) {
      priceBox.appendChild(socialProof);
    }
  }

  function refreshPanel() {
    const priceBox = document.querySelector('.product-price-box');
    if (priceBox) {
      priceBox.dataset.dipRestructured = '';
      restructurePriceBox();
    }
  }

  async function init() {
    injectStyles();
    await new Promise(resolve => setTimeout(resolve, 200));
    await restructurePriceBox();

    setInterval(() => {
      const panel = document.getElementById('delivery-info-panel');
      if (panel) refreshPanel();
    }, 60000);

    document.addEventListener('cart:updated', refreshPanel);
    document.addEventListener('delivery:rates-updated', refreshPanel);

    // Listen for ZIP changes from widget or other sources
    document.addEventListener('deliveryLocationChanged', async (e) => {
      console.log('[Panel] Location changed, refreshing...', e.detail);
      // Small delay to let localStorage update
      await new Promise(resolve => setTimeout(resolve, 100));
      await refreshPanel();
    });

    getCartTotal();
  }

  window.DeliveryInfoPanel = {
    refresh: refreshPanel,
    getCartTotal: getCartTotal,
    checkPickup: () => checkSameDayEligibility('pickup'),
    checkShipping: () => checkSameDayEligibility('shipping')
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
