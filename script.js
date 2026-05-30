document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const phoneNumberInput = document.getElementById('phoneNumber');
  const phoneError = document.getElementById('phoneError');
  const mainContent = document.getElementById('mainContent');
  const btnLetsSee = document.getElementById('btnLetsSee');
  const slideshowWrapper = document.querySelector('.slideshow-wrapper');
  
  // Countdown elements
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  
  // Hint button elements
  const btnHint = document.getElementById('btnHint');
  const hintBox = document.getElementById('hintBox');

  // --- Form Formatting ---
  // Simple automatic phone formatting for Indian numbers (e.g. 98765-43210)
  phoneNumberInput.addEventListener('input', (e) => {
    let cleaned = e.target.value.replace(/\D/g, '').substring(0, 10);
    let x = cleaned.match(/(\d{0,5})(\d{0,5})/);
    e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2];
  });

  // --- Step 1: Login Authentication ---
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phoneVal = phoneNumberInput.value.trim();
    
    // Simple validation (must contain at least 10 digits)
    const digitCount = phoneVal.replace(/\D/g, '').length;
    
    if (digitCount < 10) {
      // Show error styling & trigger shake
      loginForm.classList.add('shake-animation');
      loginForm.parentElement.classList.add('invalid');
      
      // Remove shake class after animation completes to allow re-triggering
      setTimeout(() => {
        loginForm.classList.remove('shake-animation');
      }, 400);
    } else {
      // Clear error and hide modal
      loginForm.parentElement.classList.remove('invalid');
      loginModal.classList.add('hidden');
      
      // Show main content container
      mainContent.classList.remove('hidden');
    }
  });

  // --- Step 2: Slide transition on "Let's See" ---
  btnLetsSee.addEventListener('click', () => {
    slideshowWrapper.classList.add('slide-shift-left');
    // Start the countdown timer ticks
    startCountdown();
  });

  // --- Step 3: Countdown Timer Logic ---
  const targetDate = new Date('2026-06-13T00:00:00');
  let intervalId = null;

  function startCountdown() {
    if (intervalId) return; // Prevent multiple intervals

    function updateTimer() {
      const now = new Date();
      const timeDifference = targetDate - now;

      if (timeDifference <= 0) {
        clearInterval(intervalId);
        daysEl.textContent = '00';
        hoursEl.textContent = '00';
        minutesEl.textContent = '00';
        secondsEl.textContent = '00';
        return;
      }

      const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

      // Pad numbers to 2 digits
      const dStr = String(days).padStart(2, '0');
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      // Update text helper with quick bounce transition if value changes
      updateValueWithAnimation(daysEl, dStr);
      updateValueWithAnimation(hoursEl, hStr);
      updateValueWithAnimation(minutesEl, mStr);
      updateValueWithAnimation(secondsEl, sStr);
    }

    // Run immediately then tick
    updateTimer();
    intervalId = setInterval(updateTimer, 1000);
  }

  function updateValueWithAnimation(element, newValue) {
    if (element.textContent !== newValue) {
      element.textContent = newValue;
      element.classList.add('update-pop');
      setTimeout(() => {
        element.classList.remove('update-pop');
      }, 200);
    }
  }

  // --- Step 4: Runaway Hint Button Logic ---
  let evasionCount = 0;
  let isReturning = false;

  // Offsets for shifting button position
  const shiftOffsets = [
    { x: -110, y: -30 },
    { x: 120, y: 35 },
    { x: -90, y: 40 },
    { x: 100, y: -45 }
  ];

  function handleEvasion(e) {
    // If already stable or returning, act normally
    if (evasionCount >= 4 || isReturning) return;

    // Prevent clicking/tapping during evasion
    e.preventDefault();

    // Get next coordinate
    const offset = shiftOffsets[evasionCount];
    btnHint.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    
    evasionCount++;

    // If it reached 4 shifts, schedule returning to the center (original position)
    if (evasionCount === 4) {
      isReturning = true;
      setTimeout(() => {
        btnHint.style.transform = 'translate(0px, 0px)';
        btnHint.classList.add('stable-clickable');
        isReturning = false;
      }, 800); // 800ms delay to let the user observe the 4th position before coming home
    }
  }

  // Listen to mouseover/mouseenter and click events to make evasion highly responsive
  btnHint.addEventListener('mouseenter', handleEvasion);
  btnHint.addEventListener('click', (e) => {
    if (evasionCount < 4) {
      handleEvasion(e);
    } else if (evasionCount === 4 && !isReturning) {
      // Toggle hint box expansion
      hintBox.classList.toggle('expanded');
    }
  });

  // Support mobile touchstart to escape touch immediately
  btnHint.addEventListener('touchstart', (e) => {
    if (evasionCount < 4) {
      handleEvasion(e);
    }
  });
});
