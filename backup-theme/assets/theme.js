// Event listeners after DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Sticky navbar scroll effect
  const navbar = document.querySelector('.cp-navbar');
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
  
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
