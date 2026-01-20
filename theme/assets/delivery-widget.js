/**
 * Delivery Widget - Premium Marketing-Focused UI
 * Version: 3.0.0
 * 
 * Özellikler:
 * - Pazarlama odaklı, şık tasarım
 * - ZIP girişi ile shipping hesaplama
 * - Dropdown shipping seçenekleri
 * - $100+ free shipping bildirimi
 * - Canlı tarih hesaplama
 * - GeoIP ile otomatik lokasyon
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    cutoffHour: 14, // 2 PM ET - Bugün gönderim için son saat
    timezone: 'America/New_York',
    warehouseState: 'NJ',
    warehouseCity: 'Newark',
    freeShippingThreshold: 10000, // $100 in cents (güncellenecek)
    geoIPCacheDuration: 30 * 60 * 1000,
    debug: false
  };

  // ============================================
  // SAFE LOCALSTORAGE
  // ============================================
  function safeGetItem(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function safeRemoveItem(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  // ============================================
  // ZIP TO STATE MAPPING
  // ============================================
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

  function getStateFromZip(zip) {
    if (!zip) return CONFIG.warehouseState;
    const z = String(zip).replace(/\D/g, '');
    return ZIP_TO_STATE[z.substring(0, 2)] || ZIP_TO_STATE[z.charAt(0)] || CONFIG.warehouseState;
  }

  // ============================================
  // ZONE & DELIVERY CALCULATION
  // ============================================
  const ZONES = {
    1: ['NJ', 'NY', 'PA', 'CT', 'MA', 'RI', 'NH', 'VT', 'ME', 'DE', 'MD', 'DC'],
    2: ['VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'OH', 'IN', 'MI', 'IL', 'WI', 'KY', 'TN'],
    3: ['AL', 'MS', 'LA', 'AR', 'MO', 'IA', 'MN', 'ND', 'SD', 'NE', 'KS', 'OK', 'TX'],
    4: ['MT', 'WY', 'CO', 'NM', 'ID', 'UT', 'AZ', 'NV', 'WA', 'OR', 'CA', 'AK', 'HI']
  };

  const ZONE_DAYS = { 1: 2, 2: 3, 3: 4, 4: 5 };

  function getZone(state) {
    for (const [zone, states] of Object.entries(ZONES)) {
      if (states.includes(state)) return parseInt(zone);
    }
    return 3;
  }
  
  function getZoneDaysText(state) {
    const zone = getZone(state);
    const days = ZONE_DAYS[zone] || 3;
    return `${days}-${days + 1}`;
  }
  
  function formatDeliveryDays(daysValue, state) {
    // If daysValue is array [min, max]
    if (Array.isArray(daysValue)) {
      const min = daysValue[0];
      const max = daysValue[1] || min;
      if (min > 0 || max > 0) {
        return min === max ? `${min}` : `${min}-${max}`;
      }
    }
    // If daysValue is string like "3,4"
    if (daysValue && typeof daysValue === 'string') {
      const daysStr = daysValue.replace(',', '.');
      const parsed = parseFloat(daysStr);
      if (!isNaN(parsed) && parsed > 0) {
        const min = Math.floor(parsed);
        const max = Math.ceil(parsed);
        return min === max ? `${min}` : `${min}-${max}`;
      }
    }
    // Fallback to zone-based calculation
    return getZoneDaysText(state);
  }
  
  function formatDeliveryDate(dateStr) {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch(e) {
      return null;
    }
  }
  
  function getDeliveryText(rate, state) {
    // Priority 1: Use delivery_date (most accurate - same as checkout)
    if (rate.deliveryDate) {
      const formatted = formatDeliveryDate(rate.deliveryDate);
      if (formatted) return formatted;
    }
    // Priority 2: Use delivery_range
    if (rate.deliveryRange && rate.deliveryRange.length >= 2) {
      const min = formatDeliveryDate(rate.deliveryRange[0]);
      const max = formatDeliveryDate(rate.deliveryRange[1]);
      if (min && max) {
        return min === max ? min : `${min} - ${max}`;
      }
    }
    // Priority 3: Use delivery_days
    const days = formatDeliveryDays(rate.deliveryDays, state);
    return `${days} business days`;
  }

  function getETHour() {
    try {
      return parseInt(new Date().toLocaleString('en-US', { 
        timeZone: CONFIG.timezone, hour: 'numeric', hour12: false 
      }));
    } catch (e) { return new Date().getHours(); }
  }

  function isPastCutoff() {
    return getETHour() >= CONFIG.cutoffHour;
  }

  function addBusinessDays(date, days) {
    const result = new Date(date);
    let added = 0;
    if (isPastCutoff()) result.setDate(result.getDate() + 1);
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) added++;
    }
    return result;
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatFullDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // ============================================
  // CUSTOMER LOCATION
  // ============================================
  let customerLocation = null;
  const GEOIP_CACHE_KEY = 'deliveryGeoIP';

  function getCachedLocation() {
    const cached = safeGetItem(GEOIP_CACHE_KEY);
    if (!cached) return null;
    try {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CONFIG.geoIPCacheDuration) {
        return data.location;
      }
    } catch (e) {}
    return null;
  }

  function setCachedLocation(location) {
    safeSetItem(GEOIP_CACHE_KEY, JSON.stringify({
      location, timestamp: Date.now()
    }));
  }

  async function detectLocation() {
    // 1. Cache kontrolü
    const cached = getCachedLocation();
    if (cached) {
      customerLocation = cached;
      return cached;
    }

    // 2. Kayıtlı ZIP
    const storedZip = safeGetItem('customerZip');
    if (storedZip) {
      const loc = { zip: storedZip, state: getStateFromZip(storedZip), source: 'stored' };
      customerLocation = loc;
      setCachedLocation(loc);
      return loc;
    }

    // 3. Shopify customer data
    const customerData = document.getElementById('delivery-customer-location');
    if (customerData) {
      try {
        const data = JSON.parse(customerData.textContent);
        if (data.hasAddress && data.zip) {
          const loc = { zip: data.zip, state: data.state, source: 'shopify' };
          customerLocation = loc;
          setCachedLocation(loc);
          return loc;
        }
      } catch (e) {}
    }

    // 4. GeoIP
    try {
      const resp = await fetch('https://ipapi.co/json/', { timeout: 3000 });
      if (resp.ok) {
        const data = await resp.json();
        if (data.country_code === 'US' && data.postal) {
          const loc = { 
            zip: data.postal, 
            state: data.region_code || getStateFromZip(data.postal),
            city: data.city,
            source: 'geoip'
          };
          customerLocation = loc;
          setCachedLocation(loc);
          return loc;
        }
      }
    } catch (e) {}

    // 5. Default
    customerLocation = { zip: null, state: CONFIG.warehouseState, source: 'default' };
    return customerLocation;
  }

  function setCustomerZip(zip) {
    if (!zip || !/^\d{5}$/.test(zip)) return false;
    const loc = { zip, state: getStateFromZip(zip), source: 'user' };
    customerLocation = loc;
    safeSetItem('customerZip', zip);
    setCachedLocation(loc);
    document.dispatchEvent(new CustomEvent('deliveryLocationChanged', { detail: loc }));
    return true;
  }

  // ============================================
  // PRICE HELPERS
  // ============================================
  function normalizePrice(price) {
    if (!price) return 0;
    const num = parseFloat(price);
    if (isNaN(num)) return 0;
    if (String(price).includes('.')) return num;
    return num >= 100 ? num / 100 : num;
  }

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  // ============================================
  // GET PRODUCT DATA
  // ============================================
  function getProductData() {
    // Tüm product data elementlerini bul
    const elements = document.querySelectorAll('[id^="delivery-product-data-"]');
    if (elements.length > 0) {
      try {
        return JSON.parse(elements[0].textContent);
      } catch (e) {}
    }
    return null;
  }

  // ============================================
  // SHIPPING RATES FROM SHOPIFY
  // ============================================
  async function fetchShippingRates(zip, state) {
    if (!zip) return [];
    
    try {
      const params = new URLSearchParams({
        'shipping_address[zip]': zip,
        'shipping_address[country]': 'United States',
        'shipping_address[province]': state || getStateFromZip(zip)
      });

      // Prepare first
      await fetch(`/cart/prepare_shipping_rates.json?${params}`, { method: 'POST' });
      
      // Wait a bit
      await new Promise(r => setTimeout(r, 800));
      
      // Fetch rates
      const resp = await fetch(`/cart/shipping_rates.json?${params}`);
      if (!resp.ok) return [];
      
      const data = await resp.json();
      if (!data.shipping_rates) return [];
      
      console.log('[DeliveryWidget] Raw API rates:', JSON.stringify(data.shipping_rates, null, 2));
      
      const rates = data.shipping_rates.map(rate => ({
        name: rate.name,
        price: normalizePrice(rate.price),
        code: rate.code,
        deliveryDays: rate.delivery_days,
        deliveryDate: rate.delivery_date,
        deliveryRange: rate.delivery_range
      })).sort((a, b) => a.price - b.price);
      
      // Cache rates to localStorage for panel sync
      try {
        localStorage.setItem('delivery_shipping_rates', JSON.stringify({
          rates: rates,
          zip: zip,
          state: state,
          timestamp: Date.now()
        }));
        // Dispatch event for panel to refresh
        document.dispatchEvent(new CustomEvent('delivery:rates-updated', { detail: { rates, zip, state } }));
      } catch(e) {}
      
      return rates;
    } catch (e) {
      console.log('[DeliveryWidget] Rates fetch error:', e);
      return [];
    }
  }

  // ============================================
  // WIDGET STYLES
  // ============================================
  const WIDGET_STYLES = `
    .dw-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #fefefe 0%, #f8f9ff 100%);
      border: 1px solid #e8e6f1;
      border-radius: 16px;
      overflow: hidden;
      margin: 1rem 0;
    }
    
    .dw-header {
      background: linear-gradient(135deg, #7367f0 0%, #9e95f5 100%);
      color: white;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .dw-header-icon {
      width: 40px;
      height: 40px;
      background: rgba(255,255,255,0.2);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .dw-header-text h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }
    
    .dw-header-text span {
      font-size: 0.8rem;
      opacity: 0.9;
    }
    
    .dw-body {
      padding: 1.25rem;
    }
    
    .dw-delivery-date {
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border: 1px solid #a5d6a7;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
      text-align: center;
    }
    
    .dw-delivery-date .label {
      font-size: 0.75rem;
      color: #2e7d32;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }
    
    .dw-delivery-date .date {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1b5e20;
    }
    
    .dw-delivery-date .subtext {
      font-size: 0.75rem;
      color: #388e3c;
      margin-top: 0.25rem;
    }
    
    .dw-free-shipping {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border: 1px solid #ffcc80;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .dw-free-shipping.qualified {
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border-color: #81c784;
    }
    
    .dw-free-shipping .icon {
      font-size: 1.5rem;
    }
    
    .dw-free-shipping .text {
      flex: 1;
      font-size: 0.875rem;
      color: #5d4037;
    }
    
    .dw-free-shipping.qualified .text {
      color: #2e7d32;
      font-weight: 600;
    }
    
    .dw-free-shipping .badge {
      background: #ff6f00;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .dw-free-shipping.qualified .badge {
      background: #2e7d32;
    }
    
    .dw-zip-section {
      margin-bottom: 1rem;
    }
    
    .dw-zip-current {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    
    .dw-zip-current .location {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #333;
    }
    
    .dw-zip-current .change-btn {
      background: none;
      border: none;
      color: #7367f0;
      font-size: 0.75rem;
      cursor: pointer;
      text-decoration: underline;
    }
    
    .dw-zip-input {
      display: flex;
      gap: 0.5rem;
    }
    
    .dw-zip-input input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    
    .dw-zip-input input:focus {
      outline: none;
      border-color: #7367f0;
    }
    
    .dw-zip-input button {
      padding: 0.75rem 1.5rem;
      background: #7367f0;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .dw-zip-input button:hover {
      background: #5a4fd1;
    }
    
    .dw-rates-section {
      margin-top: 1rem;
    }
    
    .dw-rates-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      cursor: pointer;
    }
    
    .dw-rates-header h5 {
      margin: 0;
      font-size: 0.875rem;
      color: #333;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .dw-rates-header .toggle {
      font-size: 0.75rem;
      color: #7367f0;
    }
    
    .dw-rates-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .dw-rate-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      background: white;
      border: 2px solid #e8e8e8;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .dw-rate-item:hover {
      border-color: #7367f0;
      background: #fafaff;
    }
    
    .dw-rate-item.selected {
      border-color: #7367f0;
      background: linear-gradient(135deg, #f0f0ff 0%, #fafaff 100%);
    }
    
    .dw-rate-item.best {
      border-color: #4caf50;
      background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
    }
    
    .dw-rate-info {
      display: flex;
      flex-direction: column;
    }
    
    .dw-rate-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: #333;
    }
    
    .dw-rate-delivery {
      font-size: 0.75rem;
      color: #666;
    }
    
    .dw-rate-price {
      font-weight: 700;
      font-size: 1rem;
      color: #333;
    }
    
    .dw-rate-price.free {
      color: #2e7d32;
    }
    
    .dw-rate-badge {
      background: #4caf50;
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 600;
      margin-left: 0.5rem;
    }
    
    .dw-footer {
      padding: 0.75rem 1.25rem;
      background: #f8f9fa;
      border-top: 1px solid #e8e6f1;
      font-size: 0.75rem;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .dw-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: #7367f0;
    }
    
    .dw-spin {
      animation: dw-spin 1s linear infinite;
    }
    
    @keyframes dw-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .dw-urgency {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      border: 1px solid #ef9a9a;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      text-align: center;
    }
    
    .dw-urgency .timer {
      font-size: 1.125rem;
      font-weight: 700;
      color: #c62828;
    }
    
    .dw-urgency .text {
      font-size: 0.75rem;
      color: #b71c1c;
    }
  `;

  // ============================================
  // RENDER WIDGET
  // ============================================
  async function renderWidget(container, options = {}) {
    if (!container) return;

    // Inject styles once
    if (!document.getElementById('dw-styles')) {
      const style = document.createElement('style');
      style.id = 'dw-styles';
      style.textContent = WIDGET_STYLES;
      document.head.appendChild(style);
    }

    // Show loading
    container.innerHTML = `
      <div class="dw-widget">
        <div class="dw-loading">
          <svg class="dw-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" opacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
          <span>Calculating shipping options...</span>
        </div>
      </div>
    `;

    // Detect location
    await detectLocation();

    // Get product data
    const productData = getProductData();
    const freeThreshold = productData?.freeShippingThreshold || CONFIG.freeShippingThreshold;
    const productPrice = productData?.price || 0;
    const qualifiesForFree = productPrice >= freeThreshold;

    // Calculate delivery
    const state = customerLocation?.state || CONFIG.warehouseState;
    const zip = customerLocation?.zip;
    const zone = getZone(state);
    const baseDays = ZONE_DAYS[zone];
    const minDate = addBusinessDays(new Date(), baseDays);
    const maxDate = addBusinessDays(new Date(), baseDays + 1);

    // Fetch live rates if ZIP available
    let shippingRates = [];
    if (zip) {
      shippingRates = await fetchShippingRates(zip, state);
    }

    // Calculate time until cutoff
    const now = new Date();
    const etHour = getETHour();
    const hoursUntilCutoff = CONFIG.cutoffHour - etHour;
    const showUrgency = hoursUntilCutoff > 0 && hoursUntilCutoff <= 3;

    // Build HTML
    const html = `
      <div class="dw-widget">
        <div class="dw-header">
          <div class="dw-header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div class="dw-header-text">
            <h4>🚀 Fast Shipping Available</h4>
            <span>Ships from ${CONFIG.warehouseCity}, ${CONFIG.warehouseState}</span>
          </div>
        </div>
        
        <div class="dw-body">
          ${showUrgency ? `
            <div class="dw-urgency">
              <div class="timer">⏰ Order within ${hoursUntilCutoff} hour${hoursUntilCutoff > 1 ? 's' : ''}</div>
              <div class="text">to get same-day processing!</div>
            </div>
          ` : ''}
          
          <div class="dw-delivery-date">
            <div class="label">📦 Estimated Delivery</div>
            <div class="date">${formatDate(minDate)} - ${formatDate(maxDate)}</div>
            <div class="subtext">
              ${isPastCutoff() ? 
                'Order now, ships tomorrow' : 
                '✓ Order now for same-day processing'
              }
            </div>
          </div>
          
          <div class="dw-free-shipping ${qualifiesForFree ? 'qualified' : ''}">
            <span class="icon">${qualifiesForFree ? '✅' : '🎁'}</span>
            <span class="text">
              ${qualifiesForFree ? 
                'You qualify for FREE shipping!' : 
                `FREE shipping on orders $${(freeThreshold / 100).toFixed(0)}+`
              }
            </span>
            <span class="badge">${qualifiesForFree ? 'UNLOCKED' : 'AVAILABLE'}</span>
          </div>
          
          <div class="dw-zip-section">
            ${zip ? `
              <div class="dw-zip-current">
                <span class="location">
                  📍 Delivering to <strong>${zip}</strong> (${state})
                </span>
                <button class="change-btn" data-action="change-zip">Change</button>
              </div>
            ` : `
              <div class="dw-zip-input">
                <input type="text" placeholder="Enter ZIP code" maxlength="5" pattern="[0-9]*" inputmode="numeric" data-zip-input />
                <button data-action="submit-zip">Calculate</button>
              </div>
            `}
          </div>
          
          ${shippingRates.length > 0 ? `
            <div class="dw-rates-section">
              <div class="dw-rates-header" data-action="toggle-rates">
                <h5>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"/>
                    <circle cx="18" cy="6" r="4"/>
                  </svg>
                  Shipping Options
                </h5>
                <span class="toggle">▼</span>
              </div>
              <div class="dw-rates-list">
                ${shippingRates.slice(0, 4).map((rate, idx) => {
                  const deliveryText = getDeliveryText(rate, state);
                  return `
                  <div class="dw-rate-item ${idx === 0 ? 'best' : ''}" data-rate="${rate.code}">
                    <div class="dw-rate-info">
                      <span class="dw-rate-name">
                        ${rate.name}
                        ${idx === 0 ? '<span class="dw-rate-badge">BEST VALUE</span>' : ''}
                      </span>
                      <span class="dw-rate-delivery">${deliveryText}</span>
                    </div>
                    <span class="dw-rate-price ${rate.price === 0 ? 'free' : ''}">
                      ${rate.price === 0 ? 'FREE' : '$' + rate.price.toFixed(2)}
                    </span>
                  </div>
                `}).join('')}
              </div>
            </div>
          ` : (zip ? '' : `
            <p style="font-size: 0.8rem; color: #666; text-align: center; margin: 0;">
              Enter your ZIP code to see available shipping options and exact rates
            </p>
          `)}
        </div>
        
        <div class="dw-footer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Secure checkout • 30-day returns • Quality guaranteed</span>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Bind events
    const changeBtn = container.querySelector('[data-action="change-zip"]');
    const submitBtn = container.querySelector('[data-action="submit-zip"]');
    const zipInput = container.querySelector('[data-zip-input]');

    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        safeRemoveItem('customerZip');
        safeRemoveItem(GEOIP_CACHE_KEY);
        customerLocation = null;
        renderWidget(container, options);
      });
    }

    if (submitBtn && zipInput) {
      const handleSubmit = () => {
        const newZip = zipInput.value.trim();
        if (setCustomerZip(newZip)) {
          renderWidget(container, options);
        } else {
          zipInput.style.borderColor = '#f44336';
          setTimeout(() => zipInput.style.borderColor = '#e0e0e0', 2000);
        }
      };
      
      submitBtn.addEventListener('click', handleSubmit);
      zipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
      });
    }
  }

  // ============================================
  // AUTO-INIT
  // ============================================
  async function initWidgets() {
    await detectLocation();
    
    const containers = document.querySelectorAll('[data-delivery-badge], [data-delivery-widget]');
    for (const container of containers) {
      await renderWidget(container);
    }

    document.addEventListener('deliveryLocationChanged', async () => {
      const containers = document.querySelectorAll('[data-delivery-badge], [data-delivery-widget]');
      for (const container of containers) {
        await renderWidget(container);
      }
    });
  }

  // ============================================
  // EXPOSE API
  // ============================================
  window.DeliveryWidget = {
    init: initWidgets,
    render: renderWidget,
    detectLocation,
    setZip: setCustomerZip,
    getLocation: () => customerLocation,
    fetchRates: fetchShippingRates
  };

  // Also expose as DeliveryBadge for backwards compatibility
  window.DeliveryBadge = window.DeliveryWidget;

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
  } else {
    setTimeout(initWidgets, 100);
  }

  console.log('[DeliveryWidget] v3.0.0 loaded - Marketing-focused UI');
})();
