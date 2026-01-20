/**
 * Delivery Badge UI Component
 * Version: 2.0.0 - Fixed GeoIP Fallback & localStorage Safety
 * 
 * Bu dosya teslimat tarihini gösteren badge UI'ını yönetir.
 * DÜZELTMELER:
 * - Province fallback düzeltildi (customerLocation null durumu)
 * - GeoIP çağrısı cache'lendi (gereksiz çağrılar engellendi)
 * - localStorage sandbox hatası düzeltildi
 * - Country formatı standardize edildi
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    cutoffHour: 14, // 2 PM ET
    timezone: 'America/New_York',
    warehouseState: 'NJ',
    geoIPCacheDuration: 30 * 60 * 1000, // 30 dakika
    debug: false
  };

  // ============================================
  // SAFE LOCALSTORAGE
  // ============================================
  function safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Sandbox/iframe hatası - sessizce geç
    }
  }

  function safeRemoveItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Sandbox/iframe hatası - sessizce geç
    }
  }

  // ============================================
  // GEOIP CACHE
  // ============================================
  const GEOIP_CACHE_KEY = 'deliveryGeoIP';
  
  function getCachedGeoIP() {
    const cached = safeGetItem(GEOIP_CACHE_KEY);
    if (!cached) return null;
    
    try {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CONFIG.geoIPCacheDuration) {
        return data.location;
      }
    } catch (e) {
      // Invalid cache
    }
    return null;
  }

  function setCachedGeoIP(location) {
    safeSetItem(GEOIP_CACHE_KEY, JSON.stringify({
      location,
      timestamp: Date.now()
    }));
  }

  // ============================================
  // ZIP TO STATE MAPPING
  // ============================================
  function getStateFromZip(zip) {
    // Use window function if available (from shopify-live-shipping.js)
    if (window.getStateFromZip) {
      return window.getStateFromZip(zip);
    }
    
    // Fallback: Basic ZIP prefix to state
    const prefix = String(zip || '').substring(0, 3);
    
    // Common prefixes
    const COMMON_PREFIXES = {
      '006': 'PR', '007': 'PR', '008': 'PR', '009': 'PR',
      '070': 'NJ', '071': 'NJ', '072': 'NJ', '073': 'NJ', '074': 'NJ',
      '075': 'NJ', '076': 'NJ', '077': 'NJ', '078': 'NJ', '079': 'NJ',
      '080': 'NJ', '081': 'NJ', '082': 'NJ', '083': 'NJ', '084': 'NJ',
      '085': 'NJ', '086': 'NJ', '087': 'NJ', '088': 'NJ', '089': 'NJ',
      '010': 'MA', '011': 'MA', '012': 'MA', '013': 'MA', '014': 'MA',
      '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY',
      '110': 'NY', '111': 'NY', '112': 'NY', '113': 'NY', '114': 'NY',
      '115': 'NY', '116': 'NY', '117': 'NY', '118': 'NY', '119': 'NY',
      '120': 'NY', '121': 'NY', '122': 'NY', '123': 'NY', '124': 'NY',
      '150': 'PA', '151': 'PA', '152': 'PA', '153': 'PA', '154': 'PA',
      '190': 'PA', '191': 'PA', '192': 'PA', '193': 'PA', '194': 'PA',
      '200': 'DC', '201': 'VA', '202': 'DC', '203': 'DC', '204': 'DC',
      '900': 'CA', '901': 'CA', '902': 'CA', '903': 'CA', '904': 'CA',
      '905': 'CA', '906': 'CA', '907': 'CA', '908': 'CA', '910': 'CA',
      '920': 'CA', '921': 'CA', '922': 'CA', '923': 'CA', '924': 'CA',
      '950': 'CA', '951': 'CA', '952': 'CA', '953': 'CA', '954': 'CA',
      '945': 'CA', '946': 'CA', '947': 'CA', '948': 'CA', '949': 'CA',
      '750': 'TX', '751': 'TX', '752': 'TX', '753': 'TX', '754': 'TX',
      '760': 'TX', '761': 'TX', '762': 'TX', '763': 'TX', '764': 'TX',
      '770': 'TX', '772': 'TX', '773': 'TX', '774': 'TX', '775': 'TX',
      '780': 'TX', '781': 'TX', '782': 'TX', '783': 'TX', '784': 'TX',
      '600': 'IL', '601': 'IL', '602': 'IL', '603': 'IL', '604': 'IL',
      '320': 'FL', '321': 'FL', '322': 'FL', '323': 'FL', '324': 'FL',
      '325': 'FL', '326': 'FL', '327': 'FL', '328': 'FL', '329': 'FL',
      '330': 'FL', '331': 'FL', '332': 'FL', '333': 'FL', '334': 'FL'
    };
    
    return COMMON_PREFIXES[prefix] || CONFIG.warehouseState;
  }

  // ============================================
  // DELIVERY ZONE CALCULATION
  // ============================================
  const ZONE_CONFIG = {
    // Warehouse: New Jersey
    zone1: ['NJ', 'NY', 'PA', 'CT', 'MA', 'RI', 'NH', 'VT', 'ME', 'DE', 'MD', 'DC'], // 2-3 days
    zone2: ['VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'OH', 'IN', 'MI', 'IL', 'WI', 'KY', 'TN', 'AL', 'MS'], // 3-4 days
    zone3: ['MN', 'IA', 'MO', 'AR', 'LA', 'ND', 'SD', 'NE', 'KS', 'OK', 'TX'], // 4-5 days
    zone4: ['MT', 'WY', 'CO', 'NM', 'ID', 'UT', 'AZ', 'NV', 'WA', 'OR', 'CA', 'AK', 'HI'] // 5-7 days
  };

  function getZone(state) {
    if (ZONE_CONFIG.zone1.includes(state)) return 1;
    if (ZONE_CONFIG.zone2.includes(state)) return 2;
    if (ZONE_CONFIG.zone3.includes(state)) return 3;
    if (ZONE_CONFIG.zone4.includes(state)) return 4;
    return 3; // Default to middle zone
  }

  function getBaseDaysForZone(zone) {
    switch (zone) {
      case 1: return 2;
      case 2: return 3;
      case 3: return 4;
      case 4: return 5;
      default: return 4;
    }
  }

  // ============================================
  // DATE CALCULATIONS
  // ============================================
  function getETHour() {
    try {
      const options = { timeZone: CONFIG.timezone, hour: 'numeric', hour12: false };
      return parseInt(new Date().toLocaleString('en-US', options));
    } catch (e) {
      return new Date().getHours();
    }
  }

  function isPastCutoff() {
    return getETHour() >= CONFIG.cutoffHour;
  }

  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function addBusinessDays(startDate, days) {
    const result = new Date(startDate);
    let added = 0;
    
    // If past cutoff, start from tomorrow
    if (isPastCutoff()) {
      result.setDate(result.getDate() + 1);
    }
    
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (!isWeekend(result)) {
        added++;
      }
    }
    
    return result;
  }

  function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  function formatFullDate(date) {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  // ============================================
  // CUSTOMER LOCATION
  // ============================================
  let customerLocation = null;

  async function detectLocation() {
    // 1. Check cache first
    const cached = getCachedGeoIP();
    if (cached) {
      customerLocation = cached;
      return cached;
    }

    // 2. Try Shopify customer data
    if (window.Shopify && window.Shopify.customer) {
      const customer = window.Shopify.customer;
      if (customer.default_address) {
        const addr = customer.default_address;
        const location = {
          zip: addr.zip,
          state: addr.province_code || addr.province,
          country: addr.country_code || 'US',
          source: 'shopify_customer'
        };
        customerLocation = location;
        setCachedGeoIP(location);
        return location;
      }
    }

    // 3. Check stored ZIP
    const storedZip = safeGetItem('customerZip');
    if (storedZip) {
      const location = {
        zip: storedZip,
        state: getStateFromZip(storedZip),
        country: 'US',
        source: 'stored_zip'
      };
      customerLocation = location;
      setCachedGeoIP(location);
      return location;
    }

    // 4. GeoIP fallback (with caching to prevent multiple calls)
    try {
      const response = await fetch('https://ipapi.co/json/', { timeout: 3000 });
      if (response.ok) {
        const data = await response.json();
        if (data.country_code === 'US' && data.postal) {
          const location = {
            zip: data.postal,
            state: data.region_code || getStateFromZip(data.postal),
            country: 'US',
            source: 'geoip'
          };
          customerLocation = location;
          setCachedGeoIP(location);
          return location;
        }
      }
    } catch (e) {
      // GeoIP failed, use default
    }

    // 5. Default to warehouse state
    const defaultLocation = {
      zip: null,
      state: CONFIG.warehouseState,
      country: 'US',
      source: 'default'
    };
    customerLocation = defaultLocation;
    return defaultLocation;
  }

  function setCustomerZip(zip) {
    if (!zip) return;
    
    const location = {
      zip: zip,
      state: getStateFromZip(zip),
      country: 'US',
      source: 'user_input'
    };
    
    customerLocation = location;
    safeSetItem('customerZip', zip);
    setCachedGeoIP(location);
    
    // Trigger re-render
    document.dispatchEvent(new CustomEvent('deliveryLocationChanged', { detail: location }));
  }

  // ============================================
  // DELIVERY ESTIMATE
  // ============================================
  function calculateDeliveryEstimate(options = {}) {
    // KRITIK FIX: customerLocation null ise default state kullan
    const state = options.state || (customerLocation ? customerLocation.state : null) || CONFIG.warehouseState;
    const zone = getZone(state);
    const baseDays = getBaseDaysForZone(zone);
    
    // Add processing time (1 day)
    const totalDays = baseDays + 1;
    
    const minDate = addBusinessDays(new Date(), totalDays);
    const maxDate = addBusinessDays(new Date(), totalDays + 1);
    
    return {
      zone,
      baseDays,
      totalDays,
      minDate,
      maxDate,
      minDateFormatted: formatDate(minDate),
      maxDateFormatted: formatDate(maxDate),
      fullDateFormatted: formatFullDate(minDate),
      rangeText: `${formatDate(minDate)} - ${formatDate(maxDate)}`,
      isPastCutoff: isPastCutoff(),
      cutoffHour: CONFIG.cutoffHour,
      state,
      zip: customerLocation ? customerLocation.zip : null,
      source: customerLocation ? customerLocation.source : 'default'
    };
  }

  // ============================================
  // BADGE RENDERING - WITH LIVE SHIPPING RATES
  // ============================================
  async function renderDeliveryBadge(container, options = {}) {
    if (!container) return;
    
    // Show loading state first
    container.innerHTML = `
      <div class="delivery-badge delivery-badge--loading">
        <div style="display: flex; align-items: center; gap: 0.5rem; color: #7367f0; padding: 0.5rem;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>Calculating shipping rates...</span>
        </div>
      </div>
    `;
    
    const estimate = calculateDeliveryEstimate(options);
    
    // Try to get live shipping rates
    let shippingRates = [];
    const zip = customerLocation ? customerLocation.zip : null;
    
    if (zip && window.ShopifyLiveShipping) {
      try {
        const client = new window.ShopifyLiveShipping({ debug: CONFIG.debug });
        const state = customerLocation ? customerLocation.state : CONFIG.warehouseState;
        const result = await client.getShippingRates({
          zip: zip,
          province: state,
          country: 'United States'
        });
        
        if (result.success && result.rates && result.rates.length > 0) {
          shippingRates = result.rates;
        }
      } catch (e) {
        console.log('[DeliveryBadge] Live rates failed:', e);
      }
    }
    
    // Build HTML with rates
    let ratesHtml = '';
    if (shippingRates.length > 0) {
      ratesHtml = `
        <div class="delivery-badge__rates">
          ${shippingRates.slice(0, 3).map((rate, idx) => {
            const price = normalizePrice(rate.price);
            const priceText = price === 0 ? '<span class="free-tag">FREE</span>' : '$' + price.toFixed(2);
            const isLowest = idx === 0;
            return `
              <div class="delivery-rate ${isLowest ? 'delivery-rate--best' : ''}">
                <span class="rate-name">${rate.name}</span>
                <span class="rate-price">${priceText}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
    
    // ZIP input for manual entry
    const zipInputHtml = !zip ? `
      <div class="delivery-badge__zip-input">
        <input type="text" placeholder="Enter ZIP" maxlength="5" class="zip-field" />
        <button type="button" class="zip-btn">Go</button>
      </div>
    ` : `
      <div class="delivery-badge__location">
        <span>📍 ${zip}</span>
        <button type="button" class="change-zip-btn">Change</button>
      </div>
    `;
    
    const html = `
      <div class="delivery-badge" data-zone="${estimate.zone}">
        <div class="delivery-badge__header">
          <div class="delivery-badge__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div class="delivery-badge__title">
            <div class="delivery-badge__label">Estimated Delivery</div>
            <div class="delivery-badge__date">${estimate.rangeText}</div>
          </div>
        </div>
        
        ${ratesHtml}
        
        ${zipInputHtml}
        
        <div class="delivery-badge__note">
          ${estimate.isPastCutoff ? 
            '⏰ Order by 2 PM ET for same-day processing' : 
            '✓ Order now for same-day processing'
          }
        </div>
      </div>
      
      <style>
        .delivery-badge { padding: 1rem; background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%); border-radius: 12px; border: 1px solid #e8e6f1; }
        .delivery-badge__header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1rem; }
        .delivery-badge__icon { color: #7367f0; flex-shrink: 0; }
        .delivery-badge__label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
        .delivery-badge__date { font-size: 1.125rem; font-weight: 700; color: #2d3748; }
        .delivery-badge__rates { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; padding: 0.75rem; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; }
        .delivery-rate { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
        .delivery-rate:last-child { border-bottom: none; }
        .delivery-rate--best { background: linear-gradient(90deg, #f0fdf4 0%, transparent 100%); margin: -0.5rem; padding: 0.5rem; border-radius: 6px; }
        .delivery-rate--best .rate-name::before { content: '✓ '; color: #22c55e; }
        .rate-name { font-size: 0.875rem; color: #4a5568; }
        .rate-price { font-weight: 600; color: #2d3748; }
        .free-tag { background: #22c55e; color: #fff; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
        .delivery-badge__zip-input { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
        .zip-field { flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.875rem; }
        .zip-btn { padding: 0.5rem 1rem; background: #7367f0; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .zip-btn:hover { background: #5a4fd1; }
        .delivery-badge__location { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #f8fafc; border-radius: 6px; }
        .change-zip-btn { background: none; border: none; color: #7367f0; font-size: 0.75rem; cursor: pointer; text-decoration: underline; }
        .delivery-badge__note { font-size: 0.75rem; color: #666; text-align: center; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      </style>
    `;
    
    container.innerHTML = html;
    
    // Bind ZIP input events
    const zipField = container.querySelector('.zip-field');
    const zipBtn = container.querySelector('.zip-btn');
    const changeBtn = container.querySelector('.change-zip-btn');
    
    if (zipField && zipBtn) {
      zipBtn.addEventListener('click', () => {
        const newZip = zipField.value.trim();
        if (/^\d{5}$/.test(newZip)) {
          setCustomerZip(newZip);
          renderDeliveryBadge(container, options);
        }
      });
      zipField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') zipBtn.click();
      });
    }
    
    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        safeRemoveItem('customerZip');
        safeRemoveItem(GEOIP_CACHE_KEY);
        customerLocation = null;
        renderDeliveryBadge(container, options);
      });
    }
    
    return estimate;
  }
  
  // Price normalization helper
  function normalizePrice(price) {
    if (price === null || price === undefined || price === '') return 0;
    const strPrice = String(price);
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 0;
    if (strPrice.includes('.')) return numPrice;
    if (numPrice >= 100) return numPrice / 100;
    return numPrice / 100;
  }

  function renderCompactBadge(container, options = {}) {
    if (!container) return;
    
    const estimate = calculateDeliveryEstimate(options);
    
    container.innerHTML = `
      <span class="delivery-compact">
        📦 Get it by <strong>${estimate.minDateFormatted}</strong>
      </span>
    `;
    
    return estimate;
  }

  function renderInlineBadge(container, options = {}) {
    if (!container) return;
    
    const estimate = calculateDeliveryEstimate(options);
    
    container.innerHTML = `
      <span class="delivery-inline">
        Arrives ${estimate.rangeText}
      </span>
    `;
    
    return estimate;
  }

  // ============================================
  // ZIP INPUT COMPONENT
  // ============================================
  function renderZipInput(container, options = {}) {
    if (!container) return;
    
    // KRITIK FIX: customerLocation null kontrolü
    const currentZip = (customerLocation ? customerLocation.zip : null) || '';
    
    const html = `
      <div class="delivery-zip-input">
        <label class="delivery-zip-input__label">
          Enter your ZIP code for delivery estimate:
        </label>
        <div class="delivery-zip-input__row">
          <input 
            type="text" 
            class="delivery-zip-input__field" 
            placeholder="Enter ZIP" 
            maxlength="5" 
            pattern="[0-9]{5}"
            inputmode="numeric"
            value="${currentZip}"
          />
          <button type="button" class="delivery-zip-input__btn">
            Update
          </button>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    // Bind events
    const input = container.querySelector('.delivery-zip-input__field');
    const btn = container.querySelector('.delivery-zip-input__btn');
    
    if (input && btn) {
      btn.addEventListener('click', () => {
        const zip = input.value.trim();
        if (zip.length === 5 && /^\d{5}$/.test(zip)) {
          setCustomerZip(zip);
          if (options.onUpdate) {
            options.onUpdate(zip);
          }
        }
      });
      
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          btn.click();
        }
      });
    }
  }

  // ============================================
  // AUTO-INITIALIZATION
  // ============================================
  async function initDeliveryBadges() {
    // Detect location first
    await detectLocation();
    
    // Find all badge containers
    const badgeContainers = document.querySelectorAll('[data-delivery-badge]');
    const compactContainers = document.querySelectorAll('[data-delivery-compact]');
    const inlineContainers = document.querySelectorAll('[data-delivery-inline]');
    const zipInputContainers = document.querySelectorAll('[data-delivery-zip-input]');
    
    // Render badges (async)
    for (const container of badgeContainers) {
      await renderDeliveryBadge(container);
    }
    
    compactContainers.forEach(container => {
      renderCompactBadge(container);
    });
    
    inlineContainers.forEach(container => {
      renderInlineBadge(container);
    });
    
    zipInputContainers.forEach(container => {
      renderZipInput(container, {
        onUpdate: async () => {
          // Re-render all badges on ZIP change
          for (const c of badgeContainers) {
            await renderDeliveryBadge(c);
          }
          compactContainers.forEach(c => renderCompactBadge(c));
          inlineContainers.forEach(c => renderInlineBadge(c));
        }
      });
    });
    
    // Listen for location changes
    document.addEventListener('deliveryLocationChanged', async () => {
      for (const c of badgeContainers) {
        await renderDeliveryBadge(c);
      }
      compactContainers.forEach(c => renderCompactBadge(c));
      inlineContainers.forEach(c => renderInlineBadge(c));
    });
  }

  // ============================================
  // EXPOSE TO WINDOW
  // ============================================
  window.DeliveryBadge = {
    init: initDeliveryBadges,
    detectLocation,
    setCustomerZip,
    calculateEstimate: calculateDeliveryEstimate,
    renderBadge: renderDeliveryBadge,
    renderCompact: renderCompactBadge,
    renderInline: renderInlineBadge,
    renderZipInput,
    getLocation: () => customerLocation,
    getStateFromZip,
    getZone,
    config: CONFIG
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeliveryBadges);
  } else {
    // Small delay to let other scripts load
    setTimeout(initDeliveryBadges, 100);
  }

  console.log('[DeliveryBadge] v2.0.0 loaded - GeoIP caching & province fallback fixed');
})();
