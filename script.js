import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js'
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js'
import {
  getAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js'
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js'
import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA53LCtUehP0nXqtZhzfwbIRMP11DfgPto",
  authDomain: "countdown-48417.firebaseapp.com",
  projectId: "countdown-48417",
  storageBucket: "countdown-48417.firebasestorage.app",
  messagingSenderId: "254964571000",
  appId: "1:254964571000:web:ec7f3f2954f68d3125068d",
  measurementId: "G-JJQGRSVSQ8"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Whitelist is managed dynamically in Firestore under the "whitelist" collection.


document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const loginEmailInput = document.getElementById('loginEmail');
  const emailError = document.getElementById('emailError');
  const mainContent = document.getElementById('mainContent');
  const btnLetsSee = document.getElementById('btnLetsSee');
  const btnGoToAvailability = document.getElementById('btnGoToAvailability');
  const slideshowWrapper = document.querySelector('.slideshow-wrapper');

  // Section wrappers inside login form
  const emailEntrySection = document.getElementById('emailEntrySection');
  const emailSentSection = document.getElementById('emailSentSection');

  // RSVP Form elements
  const availabilityForm = document.getElementById('availabilityForm');
  const userEmail = document.getElementById('userEmail');
  const userEmailError = document.getElementById('emailError'); // Error on RSVP page
  const choiceError = document.getElementById('choiceError');
  const rsvpSuccess = document.getElementById('rsvpSuccess');

  // Countdown elements
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  // Hint button elements
  const btnHint = document.getElementById('btnHint');
  const hintBox = document.getElementById('hintBox');

  // --- Step 1: Check Auth Session & Link Redirection on Load ---
  
  // Listen to current session state
  onAuthStateChanged(auth, (user) => {
    // --- DEVELOPER TESTING BYPASS ---
    // Uncomment the two lines below to bypass login and test locally on http://localhost:8000
    // loginModal.classList.add('hidden');
    // mainContent.classList.remove('hidden');

    if (user) {
      const emailLower = user.email.toLowerCase();
      const whitelistDocRef = doc(db, 'whitelist', emailLower);
      getDoc(whitelistDocRef)
        .then((docSnap) => {
          if (docSnap.exists() && docSnap.data().allowed !== false) {
            // User is logged in and whitelisted! Auto-enter
            loginModal.classList.add('hidden');
            mainContent.classList.remove('hidden');
            
            // Prefill the email field in the availability form
            if (userEmail) {
              userEmail.value = user.email;
            }
          } else {
            // Logged in but not whitelisted, sign out and show login
            signOut(auth).then(() => {
              loginModal.classList.remove('hidden');
              mainContent.classList.add('hidden');
              alert('Access Denied: Your email is not whitelisted.');
            });
          }
        })
        .catch((error) => {
          console.error("Whitelist check failed on load:", error);
          signOut(auth).then(() => {
            loginModal.classList.remove('hidden');
            mainContent.classList.add('hidden');
          });
        });
    } else {
      // Not logged in: only show login screen if not currently verifying a magic link redirect
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        loginModal.classList.remove('hidden');
        mainContent.classList.add('hidden');
      }
    }
  });

  // Helper function to complete magic link authentication
  function completeEmailLinkSignIn(email) {
    signInWithEmailLink(auth, email, window.location.href)
      .then((result) => {
        // Clear saved email
        window.localStorage.removeItem('emailForSignIn');
        
        // Verify Whitelist from Firestore
        const emailLower = result.user.email.toLowerCase();
        const whitelistDocRef = doc(db, 'whitelist', emailLower);
        getDoc(whitelistDocRef)
          .then((docSnap) => {
            if (docSnap.exists() && docSnap.data().allowed !== false) {
              // Authorized user logs in successfully
              loginModal.classList.add('hidden');
              mainContent.classList.remove('hidden');
            } else {
              signOut(auth).then(() => {
                alert("Access Denied: This email address is not authorized to access this website.");
                window.location.href = window.location.origin + window.location.pathname; // Clean url parameters
              });
            }
          })
          .catch((error) => {
            console.error("Whitelist check failed during validation:", error);
            signOut(auth).then(() => {
              alert("Error verifying your authorization. Please try again.");
              window.location.href = window.location.origin + window.location.pathname;
            });
          });
      })
      .catch((error) => {
        console.error("Magic link sign-in failed:", error);
        alert("Sign-in link expired or invalid. Please request a new link.");
        window.location.href = window.location.origin + window.location.pathname; // Clean url
      });
  }

  // Handle Firebase Sign-in Link redirect
  if (isSignInWithEmailLink(auth, window.location.href)) {
    // Get the email from localStorage (saved when they clicked Send Link)
    let email = window.localStorage.getItem('emailForSignIn');

    if (email) {
      completeEmailLinkSignIn(email);
    } else {
      // Clean UI to request email inline instead of browser prompt popup
      document.querySelector('.modal-header h2').textContent = "Confirm Email";
      document.querySelector('.modal-header p').textContent = "Please confirm your email address to complete sign-in.";
      document.querySelector('#loginBtn span').textContent = "Confirm & Sign In";
      
      // Tag the form to process submit as a confirmation
      loginForm.dataset.mode = "confirm";
    }
  }

  // --- Step 2: Trigger Magic Link email dispatch ---
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailVal = loginEmailInput.value.trim();

    // Validate email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailVal)) {
      loginForm.classList.add('shake-animation');
      loginEmailInput.parentElement.parentElement.classList.add('invalid');
      setTimeout(() => {
        loginForm.classList.remove('shake-animation');
      }, 400);
      return;
    }

    loginEmailInput.parentElement.parentElement.classList.remove('invalid');

    // If we are in confirmation mode, complete sign in
    if (loginForm.dataset.mode === "confirm") {
      completeEmailLinkSignIn(emailVal);
      return;
    }

    // Firebase Action Code Settings (defines redirect parameters)
    const actionCodeSettings = {
      // Redirect URL back to the website URL (works for localhost and GitHub pages automatically)
      url: window.location.href,
      handleCodeInApp: true
    };

    // Toggle loading state on the button
    const submitBtn = document.getElementById('loginBtn');
    if (submitBtn) {
      submitBtn.classList.add('btn-loading');
      submitBtn.disabled = true;
    }

    // Verify Whitelist before sending the magic link
    const emailLower = emailVal.toLowerCase();
    const whitelistDocRef = doc(db, 'whitelist', emailLower);
    getDoc(whitelistDocRef)
      .then((docSnap) => {
        if (docSnap.exists() && docSnap.data().allowed !== false) {
          // Whitelisted! Proceed to send email link
          sendSignInLinkToEmail(auth, emailVal, actionCodeSettings)
            .then(() => {
              // Save the email locally to complete sign-in when they redirect back
              window.localStorage.setItem('emailForSignIn', emailVal);

              // Hide entry form, show confirmation state
              emailEntrySection.classList.add('hidden');
              emailSentSection.classList.remove('hidden');
            })
            .catch((error) => {
              console.error("Failed to send sign-in link:", error);
              document.getElementById('emailError').textContent = "Failed to send email. Try again later.";
              loginEmailInput.parentElement.parentElement.classList.add('invalid');
              loginForm.classList.add('shake-animation');
              setTimeout(() => {
                loginForm.classList.remove('shake-animation');
              }, 400);
            })
            .finally(() => {
              if (submitBtn) {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
              }
            });
        } else {
          // Not whitelisted! Reject instantly
          document.getElementById('emailError').textContent = "Access Denied: This email is not authorized.";
          loginEmailInput.parentElement.parentElement.classList.add('invalid');
          loginForm.classList.add('shake-animation');
          setTimeout(() => {
            loginForm.classList.remove('shake-animation');
          }, 400);
          if (submitBtn) {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
          }
        }
      })
      .catch((err) => {
        console.error("Error reading whitelist doc:", err);
        document.getElementById('emailError').textContent = "Error verifying email. Try again.";
        loginEmailInput.parentElement.parentElement.classList.add('invalid');
        loginForm.classList.add('shake-animation');
        setTimeout(() => {
          loginForm.classList.remove('shake-animation');
        }, 400);
        if (submitBtn) {
          submitBtn.classList.remove('btn-loading');
          submitBtn.disabled = false;
        }
      });
  });

  // --- Step 3: Slide 1 -> Slide 2 (Greeting -> Countdown) ---
  btnLetsSee.addEventListener('click', () => {
    slideshowWrapper.classList.remove('show-slide-1');
    slideshowWrapper.classList.add('show-slide-2');
    startCountdown();
  });

  // --- Step 4: Slide 2 -> Slide 3 (Countdown -> RSVP) ---
  btnGoToAvailability.addEventListener('click', () => {
    slideshowWrapper.classList.remove('show-slide-2');
    slideshowWrapper.classList.add('show-slide-3');
  });

  // Playful Option Selection: Redirect "No" clicks to "Yes" & Trigger Confetti Celebration
  const attendYes = document.getElementById('attendYes');
  const attendNo = document.getElementById('attendNo');

  if (attendYes && attendNo) {
    const triggerConfetti = () => {
      const colors = ['#e55b80', '#e99a7b', '#6c5ce7', '#ffbe0b', '#4895ef'];
      
      // 1. Symmetrical base bursts from corners (increased spread, velocity, and drift to reach the center)
      // Bottom-Left (shoots up and right)
      confetti({
        particleCount: 50,
        angle: 45,
        spread: 80,
        startVelocity: 55,
        gravity: 0.9,
        drift: 1.8,
        origin: { x: 0, y: 1 },
        colors: colors
      });

      // Bottom-Right (shoots up and left)
      confetti({
        particleCount: 50,
        angle: 135,
        spread: 80,
        startVelocity: 55,
        gravity: 0.9,
        drift: -1.8, // drifts leftwards towards the center
        origin: { x: 1, y: 1 },
        colors: colors
      });

      // Top-Left (shoots down and right)
      confetti({
        particleCount: 50,
        angle: 315,
        spread: 80,
        startVelocity: 55,
        gravity: 0.9,
        drift: 1.8,
        origin: { x: 0, y: 0 },
        colors: colors
      });

      // Top-Right (shoots down and left)
      confetti({
        particleCount: 50,
        angle: 225,
        spread: 80,
        startVelocity: 55,
        gravity: 0.9,
        drift: -1.8, // drifts leftwards towards the center
        origin: { x: 1, y: 0 },
        colors: colors
      });

      // 2. 1.2-second continuous shower along BOTH left and right sides, meeting in the middle
      const duration = 1200;
      const end = Date.now() + duration;

      (function frame() {
        // Left side shower (shoots and drifts rightward)
        confetti({
          particleCount: 1,
          angle: Math.random() * 40 - 20, // Shoots mostly rightward
          spread: 50,
          startVelocity: Math.random() * 15 + 30,
          gravity: 0.85,
          drift: 2.2,
          origin: { x: Math.random() * 0.15, y: Math.random() },
          colors: colors
        });

        // Right side shower (shoots and drifts leftward)
        confetti({
          particleCount: 1,
          angle: 180 + (Math.random() * 40 - 20), // Shoots mostly leftward
          spread: 50,
          startVelocity: Math.random() * 15 + 30,
          gravity: 0.85,
          drift: -2.2,
          origin: { x: 1 - (Math.random() * 0.15), y: Math.random() },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    };

    // Confetti on YES select
    attendYes.addEventListener('change', () => {
      if (attendYes.checked) {
        triggerConfetti();
      }
    });

    // Also trigger confetti if clicking YES card while it is already active
    const yesCard = attendYes.closest('.choice-card');
    if (yesCard) {
      yesCard.addEventListener('click', () => {
        if (attendYes.checked) {
          triggerConfetti();
        }
      });
    }

    attendNo.addEventListener('change', () => {
      if (attendNo.checked) {
        // Quick visual delay so the user sees the click before it pops back to Yes
        setTimeout(() => {
          attendYes.checked = true;
          // Dispatch change event to trigger styling and confetti celebration
          attendYes.dispatchEvent(new Event('change'));
          
          // Animate the Yes card to draw attention to it
          const yesCardContent = attendYes.closest('.choice-card').querySelector('.choice-content');
          if (yesCardContent) {
            yesCardContent.classList.add('pop-animation');
            setTimeout(() => {
              yesCardContent.classList.remove('pop-animation');
            }, 500);
          }
        }, 180);
      }
    });
  }

  // --- Step 5: RSVP Availability Form Validation & Firestore Save ---
  availabilityForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const emailVal = userEmail.value.trim();
    const attendanceVal = availabilityForm.querySelector('input[name="attendance"]:checked');

    let isValid = true;

    // RSVP Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(emailVal)) {
      userEmail.parentElement.parentElement.classList.add('invalid');
      isValid = false;
    } else {
      userEmail.parentElement.parentElement.classList.remove('invalid');
    }

    // Attendance choice validation
    if (!attendanceVal) {
      choiceError.parentElement.classList.add('invalid');
      isValid = false;
    } else {
      choiceError.parentElement.classList.remove('invalid');
    }

    if (isValid) {
      const btnSubmitRSVP = document.getElementById('btnSubmitRSVP');
      if (btnSubmitRSVP) {
        btnSubmitRSVP.classList.add('btn-loading');
        btnSubmitRSVP.disabled = true;
      }

      const user = auth.currentUser;
      const userEmailStr = user ? user.email : "anonymous";

      const rsvpData = {
        email: emailVal,
        attending: attendanceVal.value,
        submittedAt: new Date().toISOString(),
        signedInUserEmail: userEmailStr
      };

      // --- EmailJS Custom Email Dispatch ---
      // TODO: Replace with your actual Service ID, Template ID, and Public Key from your EmailJS Account
      const emailjsServiceId = "service_93t6wzg";
      const emailjsTemplateId = "template_3pio0t1";
      const emailjsPublicKey = "uYBSVef1oHYZmGyIa";

      fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: emailjsServiceId,
          template_id: emailjsTemplateId,
          user_id: emailjsPublicKey,
          template_params: {
            to_email: emailVal, // Sends to the inputted email address
            attending: attendanceVal.value === 'yes' ? 'Yes, count me in! 🎉' : 'No, definately count me in. 😁',
            submitted_at: rsvpData.submittedAt
          }
        })
      })
        .then(response => {
          console.log("EmailJS response status:", response.status);
        })
        .catch(err => {
          console.error("EmailJS dispatch failed:", err);
        });

      const showSuccessScreen = () => {
        document.getElementById('summaryEmail').textContent = emailVal;
        document.getElementById('summaryAttending').textContent = attendanceVal.value === 'yes' ? 'Yes, count me in! 🎉' : 'No, definitely count me in. 😁';
        const formContainer = document.getElementById('rsvpFormContainer');
        if (formContainer) {
          formContainer.classList.add('hidden');
        } else {
          availabilityForm.classList.add('hidden');
        }
        rsvpSuccess.classList.remove('hidden');
      };

      // Save directly to Firestore under collection 'rsvps' with key as the authenticated user email
      const safeKey = userEmailStr.replace(/[^a-zA-Z0-9]/g, '_');
      const rsvpDocRef = doc(db, "rsvps", safeKey);
      setDoc(rsvpDocRef, rsvpData)
        .then(() => {
          showSuccessScreen();
        })
        .catch((error) => {
          console.error("Firestore database write failed:", error);
          // Graceful fallback to screen confirmation to ensure seamless testing
          showSuccessScreen();
        });
    }
  });

  // --- Step 6: Countdown Timer Logic ---
  const targetDate = new Date('2026-06-13T00:00:00+05:30');
  let intervalId = null;

  function startCountdown() {
    if (intervalId) return;

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

      const dStr = String(days).padStart(2, '0');
      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      updateValueWithAnimation(daysEl, dStr);
      updateValueWithAnimation(hoursEl, hStr);
      updateValueWithAnimation(minutesEl, mStr);
      updateValueWithAnimation(secondsEl, sStr);
    }

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

  // --- Step 7: Runaway Hint Button Logic ---
  let evasionCount = 0;
  let isReturning = false;

  const shiftOffsets = [
    { x: -110, y: -30 },
    { x: 120, y: 35 },
    { x: -90, y: 40 },
    { x: 100, y: -45 }
  ];

  function handleEvasion(e) {
    if (evasionCount >= 4 || isReturning) return;
    e.preventDefault();

    const offset = shiftOffsets[evasionCount];
    btnHint.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    evasionCount++;

    if (evasionCount === 4) {
      isReturning = true;
      setTimeout(() => {
        btnHint.style.transform = 'translate(0px, 0px)';
        btnHint.classList.add('stable-clickable');
        isReturning = false;
      }, 800);
    }
  }

  btnHint.addEventListener('mouseenter', handleEvasion);
  btnHint.addEventListener('click', (e) => {
    if (evasionCount < 4) {
      handleEvasion(e);
    } else if (evasionCount === 4 && !isReturning) {
      hintBox.classList.toggle('expanded');
      
      if (hintBox.classList.contains('expanded')) {
        btnGoToAvailability.classList.remove('btn-hidden');
      }
    }
  });

  btnHint.addEventListener('touchstart', (e) => {
    if (evasionCount < 4) {
      handleEvasion(e);
    }
  });
});
