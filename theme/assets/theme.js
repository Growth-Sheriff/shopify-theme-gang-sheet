// Event listeners after DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Sticky navbar scroll effect
  const navbar = document.querySelector('.cp-navbar');
  if (navbar) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
  
  // Color picker
  document.querySelectorAll('.cp-color-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.cp-color-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      if (window.changeTshirtColor) window.changeTshirtColor(this.dataset.color);
    });
  });

  // Logo upload
  const uploadTrigger = document.getElementById('uploadTrigger');
  const logoInput = document.getElementById('logoInput');
  
  if (uploadTrigger && logoInput) {
    uploadTrigger.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        if (window.addLogoToTshirt) window.addLogoToTshirt(url);
      }
    });
  }

  // 3D Controls
  const rotateLeftBtn = document.getElementById('rotateLeftBtn');
  const rotateRightBtn = document.getElementById('rotateRightBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const canvas = document.getElementById('hero3DCanvas');
  
  if (rotateLeftBtn) rotateLeftBtn.addEventListener('click', () => window.rotateTshirt && window.rotateTshirt(-1));
  if (rotateRightBtn) rotateRightBtn.addEventListener('click', () => window.rotateTshirt && window.rotateTshirt(1));
  if (resetViewBtn) resetViewBtn.addEventListener('click', () => window.resetView && window.resetView());
  if (downloadBtn) downloadBtn.addEventListener('click', () => window.downloadDesign && window.downloadDesign());
  if (canvas) canvas.addEventListener('mousedown', () => window.stopAutoRotate && window.stopAutoRotate());
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Navbar scroll effect
window.addEventListener('scroll', function() {
  const navbar = document.querySelector('.cp-navbar');
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.style.boxShadow = '0 0.25rem 1rem rgba(165, 163, 174, 0.45)';
    } else {
      navbar.style.boxShadow = '0 0.125rem 0.25rem rgba(165, 163, 174, 0.3)';
    }
  }
});

// =====================================================
// SHIMMER BUTTON (SB) - UNIQUE ANIMATED ADD TO CART
// Prefix: sb- to avoid conflicts
// =====================================================
(function() {
  'use strict';
  
  function initShimmerButtons() {
    document.querySelectorAll(".sb-btn:not(.sb-initialized)").forEach(function(button) {
      button.classList.add('sb-initialized');
      
      // SHIMMER EFFECT DISABLED - Commented out to remove light animation
      // Add shimmer div if not exists
      // if (!button.querySelector('.sb-shimmer')) {
      //   var shimmer = document.createElement("div");
      //   shimmer.className = "sb-shimmer";
      //   button.appendChild(shimmer);
      // }
      
      // Wrap text content in .sb-text span for animation (if not already wrapped)
      var childNodes = Array.prototype.slice.call(button.childNodes);
      childNodes.forEach(function(node) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          var textSpan = document.createElement("span");
          textSpan.className = "sb-text";
          textSpan.textContent = node.textContent;
          node.parentNode.replaceChild(textSpan, node);
        }
      });
      
      // Wrap existing spans that don't have sb- prefix
      var spans = button.querySelectorAll('span:not([class*="sb-"])');
      spans.forEach(function(span) {
        if (!span.classList.contains('sb-text') && !span.classList.contains('sb-shimmer')) {
          span.classList.add('sb-text');
        }
      });
    });
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShimmerButtons);
  } else {
    initShimmerButtons();
  }
  
  // Re-init on dynamic content (for AJAX loaded content)
  if (typeof MutationObserver !== 'undefined') {
    var sbObserver = new MutationObserver(function(mutations) {
      var shouldInit = false;
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          shouldInit = true;
        }
      });
      if (shouldInit) {
        setTimeout(initShimmerButtons, 100);
      }
    });
    
    // Start observing when DOM is ready
    if (document.body) {
      sbObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        sbObserver.observe(document.body, { childList: true, subtree: true });
      });
    }
  }
  
  // Expose globally if needed
  window.initShimmerButtons = initShimmerButtons;
})();
