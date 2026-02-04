// State
let currentUser = Core.getData('currentUser', null);
// Global Data Arrays (for Admin Sync)
let appUsers = Core.getData('app_users');
let appBookings = Core.getData('app_bookings');

// Load user-specific data
let cars = currentUser ? Core.getData(`cars_${currentUser.id}`) : [];

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Reload global users list first
    appUsers = Core.getData('app_users');
    Core.applySavedTheme();
    checkUserRegistration();

    // Background Sync és Nap és idő alapú Session Monitor
    setInterval(() => {
        validateSession();
        checkToastMessage(); // Poll for notifications

        // Sync Bookings & UI
        const freshBookings = Core.getData('app_bookings');
        if (JSON.stringify(freshBookings) !== JSON.stringify(appBookings)) {
            appBookings = freshBookings;
            initDashboard(); // Re-render everything
        }

        // Sync Users (Points/VIP updates from Admin)
        const freshUsers = Core.getData('app_users');
        if (JSON.stringify(freshUsers) !== JSON.stringify(appUsers)) {
            // console.log("User adatok frissültek admin oldalról...");
            appUsers = freshUsers;
            // Update current user reference
            if (currentUser) {
                const updatedMe = appUsers.find(u => u.id === currentUser.id);
                if (updatedMe) currentUser = updatedMe;
            }
            initDashboard();
        }

        // Nap és idő alapú frissítés: jogosultság ellenőrzés
        ensureSubscriptionEntitlements(currentUser);
        updateInfoHub();
    }, 5000);

    checkToastMessage(); // Initial check
    updateInfoHub(); // Initial info hub update
    Core.setupLiveClock('current-date');
    Core.updateSystemHeartbeat(); // Új: Időfrissítés belépéskor
    setupGiftPurchaseForm();
    setupGiftRedeemForm();

    // Merged from duplicate listener
    updateToggleUI();
    initReviewSystem();
    updateShineDisplay();
    updateSubscriptionUI();
});

// Eltávolítva: updateSystemHeartbeat és setupDate (Core.js-be költözött)


// --- Toast Notification Logic ---
let lastSeenToast = null;
let toastTimer = null;

function checkToastMessage() {
    try {
        // Read V4 List system
        const raw = localStorage.getItem('app_announcements_v4');
        const list = raw ? JSON.parse(raw) : [];
        const activeItem = list.find(item => item.isActive);
        const text = activeItem ? activeItem.text : null;

        const toast = document.getElementById('notification-toast');
        const msgEl = document.getElementById('toast-message');

        if (text && toast && msgEl) {
            // Found ACTIVE message
            if (text !== lastSeenToast) {
                // New/Changed Message
                lastSeenToast = text;
                msgEl.textContent = text;

                // Show
                toast.classList.remove('toast-hidden');
                toast.classList.add('toast-visible');

                // Clear previous timer
                if (toastTimer) clearTimeout(toastTimer);

                // Auto-hide
                toastTimer = setTimeout(() => {
                    hideToast();
                }, 15000);
            }
        } else {
            // No active message
            if (!text && toast && lastSeenToast !== null) {
                hideToast();
                lastSeenToast = null;
            }
        }
    } catch (e) { console.error("Toast error", e); }
}

function hideToast() {
    const toast = document.getElementById('notification-toast');
    if (toast) {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hidden');
        if (toastTimer) clearTimeout(toastTimer);
    }
}

// --- Information Hub (News Wall) Logic ---
function updateInfoHub() {
    try {
        const raw = localStorage.getItem('app_announcements_v4');
        const list = raw ? JSON.parse(raw) : [];
        const activeItem = list.find(item => item.isActive);
        const wallEl = document.getElementById('info-wall-message');

        if (wallEl) {
            if (activeItem) {
                wallEl.innerHTML = `<strong>Új hirdetmény:</strong><br>${activeItem.text}`;
            } else {
                wallEl.innerHTML = `Jelenleg nincs új hír. Böngészd a szolgáltatásainkat! ✨`;
            }
        }
    } catch (e) { console.error("InfoHub error", e); }
}



function validateSession() {
    if (!currentUser) return;

    // Refresh User List
    const freshUsers = JSON.parse(localStorage.getItem('app_users')) || [];
    const userStillExists = freshUsers.find(u => u.id === currentUser.id);

    if (!userStillExists) {
        // Kijelentkezési folyamat
        // alert("A felhasználói fiókod törlésre került."); // Optional: too intrusive?
        // Better: Silent reset or Modal overlay

        // Reset Local State
        currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('myCars'); // Legacy cleanup

        // Force Reload / Show Registration
        location.reload();
    }
}

function checkUserRegistration() {
    if (!currentUser) {
        // Double check: maybe local storage has it but variable is null?
        const storedUser = JSON.parse(localStorage.getItem('currentUser'));
        if (storedUser) {
            // Validate this stored user against fresh appUsers
            const freshUser = appUsers.find(u => u.id === storedUser.id);
            if (freshUser) {
                currentUser = freshUser; // Adat szinkronizáció: Legfrissebb pontok/szint lekérése
                initDashboard();
                return;
            } else {
                // Stale user in LS (deleted from admin)
                localStorage.removeItem('currentUser');
            }
        }

        // No valid user found, show registration (Login mode default)
        const form = document.getElementById('registration-form');
        const modeInput = document.getElementById('auth-mode-input');
        if (form) form.setAttribute('data-mode', 'login');
        if (modeInput) modeInput.value = 'login';
        updateAuthUI();
        Core.openModal('registration-modal');

        // Hide standard modals if any open (safety)
        Core.closeModal('garage-modal');
        Core.closeModal('service-modal');
        Core.closeModal('booking-modal');
    } else {
        // User exists in var, verify against list
        if (appUsers.find(u => u.id === currentUser.id)) {
            initDashboard();
        } else {
            // Invalid
            currentUser = null;
            localStorage.removeItem('currentUser');
            location.reload();
        }
    }
}

function initDashboard() {
    ensureSubscriptionEntitlements(currentUser);
    updateUserInfo();
    updateGarageCount();
    renderCarList();
    checkForActiveBooking();
}

function updateUserInfo() {
    if (currentUser) {
        // Sync with global list for points
        const freshUser = appUsers.find(u => u.id === currentUser.id);
        if (freshUser) currentUser = freshUser;

        const h1 = document.querySelector('.user-info h1');
        h1.innerHTML = `Szia, ${currentUser.name}! <span class="logout-btn" onclick="logout()" title="Kijelentkezés" style="cursor:pointer; opacity:0.6; margin-left:10px; font-size:0.8em;">✕</span>`;
        document.querySelector('.avatar img').src = currentUser.avatar;

        // Shine pontok fejléc frissítése
        renderShineBadge();
    }
}

function renderShineBadge() {
    const header = document.querySelector('.header');
    if (!header) return;

    // Remove old badge if exists
    const oldBadge = document.getElementById('shine-header-badge');
    if (oldBadge) oldBadge.remove();

    const points = currentUser.activePoints || 0;
    const level = currentUser.level || 'Bronze';
    let levelColor = '#cd7f32';
    if (level === 'Silver') levelColor = '#c0c0c0';
    if (level === 'Gold') levelColor = '#ffd700';
    if (level === 'Diamond') levelColor = '#b9f2ff';

    const progress = (points / 5) * 100;
    const isFreeWashReady = points >= 5;

    const badgeHTML = `
        <div id="shine-header-badge" style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 12px; border-left: 4px solid ${levelColor}; display: flex; align-items: center; gap: 12px;">
            <div style="text-align:center;">
                <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 2px;">${level} SzinT</div>
                <div style="font-size: 1.1rem; font-weight: bold; color: ${levelColor};">🏆 ${currentUser.points || 0}</div>
            </div>
            <div style="flex-grow: 1;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                    <span>Ajándék mosás haladás:</span>
                    <span style="font-weight: bold; color: ${isFreeWashReady ? '#4cc9f0' : '#fff'};">${points}/5 pont</span>
                </div>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${Math.min(progress, 100)}%; height: 100%; background: ${isFreeWashReady ? 'linear-gradient(90deg, #4cc9f0, #4361ee)' : levelColor}; transition: width 0.5s ease;"></div>
                </div>
                ${isFreeWashReady ? '<div style="font-size: 0.65rem; color: #4cc9f0; margin-top: 4px; font-weight: bold; animation: pulse 2s infinite;">KÖVETKEZŐ MOSÁSOD INGYENES! 🎁</div>' : ''}
            </div>
        </div>
    `;

    // Insert after user-info
    const userInfo = document.querySelector('.user-info');
    if (userInfo) userInfo.insertAdjacentHTML('afterend', badgeHTML);
}

function logout() {
    if (confirm("Biztosan ki szeretnél lépni?")) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        location.reload();
    }
}


// Registration / Login Logic
window.toggleAuthMode = function () {
    const form = document.getElementById('registration-form');
    const modeInput = document.getElementById('auth-mode-input');
    if (!form || !modeInput) return;

    // Toggle mode
    const currentMode = modeInput.value || 'login';
    const newMode = (currentMode === 'login') ? 'register' : 'login';

    modeInput.value = newMode;
    form.setAttribute('data-mode', newMode);

    console.log("Auth Mode changed to:", newMode);
    updateAuthUI();
};

function updateAuthUI() {
    const modal = document.getElementById('registration-modal');
    const title = document.getElementById('reg-title');
    const subtitle = document.getElementById('reg-subtitle');
    const btn = document.getElementById('btn-auth-submit');
    const msg = document.getElementById('msg-auth-switch');
    const avatarContainer = document.getElementById('reg-avatar-container');

    const modeInput = document.getElementById('auth-mode-input');
    const authMode = modeInput ? modeInput.value : 'login';

    if (authMode === 'login') {
        if (modal) {
            modal.classList.add('auth-mode-login');
            modal.classList.remove('auth-mode-register');
        }
        title.innerText = "Üdv újra! 👋";
        subtitle.innerText = "Jelentkezz be a folytatáshoz.";
        btn.innerHTML = "Bejelentkezés 🚀";
        msg.innerHTML = "Nincs még fiókod? <span style='color:#ffd700; font-weight:bold;'>Regisztráció</span>";
        if (avatarContainer) avatarContainer.style.display = 'none';
    } else {
        if (modal) {
            modal.classList.add('auth-mode-register');
            modal.classList.remove('auth-mode-login');
        }
        title.innerText = "Regisztráció ✨";
        subtitle.innerText = "Készítsd el a profilodat!";
        btn.innerHTML = "Fiók Létrehozása 💾";
        msg.innerHTML = "Van már fiókod? <span style='color:#ffd700; font-weight:bold;'>Bejelentkezés</span>";
        if (avatarContainer) avatarContainer.style.display = 'block';
    }
}

document.getElementById('registration-form').addEventListener('submit', (e) => {
    e.preventDefault();

    // REFRESH USERS to ensure we have the latest data
    appUsers = Core.getData('app_users');

    const usernameInput = document.getElementById('reg-username');
    const passwordInput = document.getElementById('reg-password');
    const modeInput = document.getElementById('auth-mode-input');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    let authMode = modeInput ? modeInput.value : 'login';

    if (username.length < 3) {
        alert("A névnek legalább 3 karakternek kell lennie!");
        return;
    }
    if (password.length < 4) {
        alert("A jelszónak legalább 4 karakternek kell lennie!");
        return;
    }

    // Identify user
    let existingUser = appUsers.find(u => u.name.toLowerCase() === username.toLowerCase());

    // --- BULLETPROOF SAFEGUARD ---
    // Check the modal class directly (added in updateAuthUI)
    const modal = document.getElementById('registration-modal');
    if (modal) {
        if (modal.classList.contains('auth-mode-register')) {
            authMode = 'register';
        } else if (modal.classList.contains('auth-mode-login')) {
            authMode = 'login';
        }
    }

    // Secondary fallback: check button text
    const submitBtn = document.getElementById('btn-auth-submit');
    const btnText = submitBtn ? submitBtn.innerText.toUpperCase() : "";

    if (btnText.includes("LÉTREHOZÁSA") || btnText.includes("REGISZTRÁCIÓ")) {
        authMode = 'register';
    }

    console.log(`SUBMIT: mode=${authMode}, user=${username}, exists=${!!existingUser}`);

    if (authMode === 'login') {
        // --- LOGIN FLOW ---
        if (existingUser) {
            // Check Password
            if (existingUser.password === password) {
                // Success
                currentUser = existingUser;
                completeAuth(authMode);
            } else {
                // Wrong Password
                alert("Hibás jelszó! Kérlek próbáld újra.");
            }
        } else {
            // Fail - User doesn't exist
            alert("Nem található ilyen felhasználó! Ellenőrizd a nevet, vagy regisztrálj.");
        }
    } else {
        // --- REGISTRATION FLOW ---
        if (existingUser) {
            // Fail - already exists
            alert("Ez a név már foglalt! Kérlek válassz másikat vagy jelentkezz be.");
        } else {
            // Success - Create New
            currentUser = {
                id: 'user_' + Date.now(),
                name: username,
                password: password, // Save the password
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                joined: new Date().toISOString().split('T')[0],
                status: 'Aktív',
                points: 0,
                activePoints: 0,
                level: 'Bronze'
            };
            appUsers.push(currentUser);
            Core.saveData('app_users', appUsers);

            // alert("Sikeres regisztráció! Üdvözlünk.");
            completeAuth(authMode);
        }
    }
});

function completeAuth(mode) {
    // Save Session
    Core.saveData('currentUser', currentUser);

    // Load User Cars
    cars = Core.getData(`cars_${currentUser.id}`);

    // Feedback
    if (mode === 'register') {
        alert(`Szia ${currentUser.name}! Sikeres regisztráció! 🚗✨`);
    } else {
        // console.log("Login success");
    }

    // Reset mode for next time
    const modeInput = document.getElementById('auth-mode-input');
    const form = document.getElementById('registration-form');
    if (modeInput) modeInput.value = 'login';
    if (form) form.setAttribute('data-mode', 'login');

    // Close Modal & Init
    Core.closeModal('registration-modal');
    initDashboard();
}

// Modal Logic
function openModal(id) {
    Core.openModal(id);
    if (id === 'booking-modal') initBookingSystem();
    if (id === 'info-modal') renderInfoServices();
}

function renderInfoServices() {
    const list = document.getElementById('info-services-list');
    if (!list) return;

    // Fetch latest services
    const services = JSON.parse(localStorage.getItem('app_services')) || [];

    if (services.length === 0) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = '<h4 style="color:#4cc9f0; margin-bottom:15px; text-align:center;">Minden csomagunk prémium:</h4>';

    // Sort by price ascending
    services.sort((a, b) => a.price - b.price);

    services.forEach((srv, index) => {
        const item = document.createElement('div');
        item.className = 'info-service-card animate-list-item';
        item.style.animationDelay = `${index * 0.1}s`;
        item.style.marginBottom = '10px';

        item.innerHTML = `
            <div style="text-align: left;">
                <div style="font-weight: bold; color: #fff; font-size: 1rem;">${srv.name}</div>
                <div style="font-size: 0.8rem; opacity: 0.7;">⏱ ${srv.duration} perc</div>
            </div>
            <div style="font-weight: bold; color: #4ade80; font-size: 1.1rem;">
                ${Core.formatCurrency(srv.price)}
            </div>
        `;
        list.appendChild(item);
    });
}

function closeModal(id) {
    Core.closeModal(id);
    if (id === 'booking-modal') {
        selectedCarForBooking = null;
    }
}

// --- Theme Management ---
function setAppTheme(themeName) {
    localStorage.setItem('app_theme', themeName);
    Core.applySavedTheme();
    closeModal('theme-modal');
}

function openGarageModal() { openModal('garage-modal'); }
function openServiceModal() { openModal('service-modal'); }
function openBookingModal() {
    if (!selectedCarForBooking) {
        alert("A foglalás kizárólag a Garázsból indítható. Válassz egy autót!");
        openGarageModal();
        return;
    }
    openModal('booking-modal');
}

// --- Booking Wizard Logic ---

// Constants
const MAX_CARS_PER_DAY = 10;
// Dynamic Settings
function getOpeningHours() {
    return {
        start: parseInt(localStorage.getItem('settings_openingStart')) || 8,
        end: parseInt(localStorage.getItem('settings_openingEnd')) || 17
    };
}
function getOpenDays() {
    const raw = localStorage.getItem('settings_openDays');
    return raw ? JSON.parse(raw) : [1, 2, 3, 4, 5]; // Default Mon-Fri
}

const SLOT_DURATION_MINS = 30;
const BOOKING_DAYS_WINDOW = 28;
let selectedCarForBooking = null;
const CANCELLATION_WINDOW_MIN = 120;
const ENTITLEMENT_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getCancellationDeadline(booking) {
    const createdAt = booking?.created ? new Date(booking.created) : new Date();
    return createdAt.getTime() + CANCELLATION_WINDOW_MIN * 60000;
}

function getCancellationRemainingMs(booking) {
    return getCancellationDeadline(booking) - Date.now();
}

function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function logCancellationEvent({ booking, withinWindow, capacityReleased }) {
    const logs = Core.getData('admin_cancel_logs');
    const vipLevel = (booking?.vipLevel || currentUser?.level || 'Bronze').toString();
    logs.push({
        id: `cancel_${Date.now()}`,
        bookingId: booking?.id || null,
        userId: booking?.userId || currentUser?.id || null,
        userName: booking?.userName || currentUser?.name || 'Ismeretlen',
        carPlate: booking?.carPlate || null,
        bookingDate: booking?.date || null,
        bookingTime: booking?.time || null,
        cancelledAt: new Date().toISOString(),
        withinWindow,
        vipLevel,
        capacityReleased
    });
    Core.saveData('admin_cancel_logs', logs);
}

function getSubscriptionSettings() {
    return {
        maxEntitlements: parseInt(localStorage.getItem('settings_subscriptionMaxEntitlements')) || 4,
        lateCancelReturn: localStorage.getItem('settings_subscriptionLateCancelReturn') === 'true'
    };
}

function logSubscriptionEvent({ type, user, targetUser, amount, note }) {
    const logs = Core.getData('subscription_entitlement_logs');
    logs.push({
        id: `ent_${Date.now()}`,
        type,
        userId: user?.id || null,
        userName: user?.name || 'Ismeretlen',
        targetUserId: targetUser?.id || null,
        targetUserName: targetUser?.name || '-',
        amount,
        note: note || '',
        createdAt: new Date().toISOString()
    });
    Core.saveData('subscription_entitlement_logs', logs);
}

function ensureSubscriptionEntitlements(user) {
    if (!user || !user.subscription || !user.subscription.active) return;

    const settings = getSubscriptionSettings();
    const subscription = user.subscription;
    const maxEntitlements = settings.maxEntitlements;

    if (subscription.entitlements === undefined) subscription.entitlements = 0;
    if (!subscription.lastEntitlementAt) {
        subscription.lastEntitlementAt = subscription.startDate || new Date().toISOString();
    }
    subscription.maxEntitlements = maxEntitlements;

    const lastAccrual = new Date(subscription.lastEntitlementAt).getTime();
    const now = Date.now();
    const weeksPassed = Math.floor((now - lastAccrual) / ENTITLEMENT_WEEK_MS);

    if (weeksPassed > 0) {
        const newEntitlements = Math.min(maxEntitlements, subscription.entitlements + weeksPassed);
        const added = newEntitlements - subscription.entitlements;
        subscription.entitlements = newEntitlements;
        subscription.lastEntitlementAt = new Date(lastAccrual + weeksPassed * ENTITLEMENT_WEEK_MS).toISOString();
        if (added > 0) {
            logSubscriptionEvent({
                type: 'Jóváírás',
                user,
                amount: added,
                note: `Heti jogosultság jóváírás (${weeksPassed} hét)`
            });
        }
        Core.saveData('app_users', appUsers);
    }
}
function getVipTier() {
    const level = (currentUser && currentUser.level ? currentUser.level : 'Bronze').toLowerCase();
    if (level === 'gold') return 'gold';
    if (level === 'diamond' || level === 'platina') return 'platina';
    return 'alap';
}

function parseVipSlotList(raw) {
    if (!raw) return [];
    return raw
        .split(',')
        .map(item => item.trim())
        .filter(item => /^\d{2}:\d{2}$/.test(item));
}

function getVipSlotSettings() {
    return {
        goldAdvanceDays: parseInt(localStorage.getItem('settings_vipGoldAdvanceDays')) || 0,
        prioritySlots: parseVipSlotList(localStorage.getItem('settings_vipPrioritySlots')),
        homeSlots: parseVipSlotList(localStorage.getItem('settings_vipHomeSlots'))
    };
}

// State
let selectedDate = null;
let selectedTime = null;
let selectedService = null; // Base Service
let selectedExtras = []; // New
let currentStep = 1;
// We read bookings from global array now
let countdownInterval = null;
let activeBooking = null;
let appServices = []; // New

function initBookingSystem() {
    // Reset state
    selectedDate = null;
    selectedTime = null;
    selectedService = null;
    selectedExtras = [];
    currentStep = 1;

    // Load Services
    appServices = JSON.parse(localStorage.getItem('app_services')) || [];
    // Default if empty (fallback)
    if (appServices.length === 0) {
        appServices = [{ id: 'srv_default', name: 'Belső Takarítás', duration: 30, price: 5000 }];
    }

    renderCalendar();
    renderServicesWizard(); // Pre-render Step 2
    updateStepUI();
}

// function getTodayDateString removed (replaced by Core.getISODate)
// function formatDate removed (replaced by Core.getISODate)

// Navigation
function updateStepUI() {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active'));

    // Show current step
    document.getElementById(`step-${currentStep}`).classList.add('active');

    // Update dots (fill up to current step)
    for (let i = 1; i <= currentStep; i++) {
        document.getElementById(`step-dot-${i}`).classList.add('active');
    }

    // Button states
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');

    if (currentStep === 1) {
        btnBack.style.visibility = 'hidden';
    } else {
        btnBack.style.visibility = 'visible';
    }

    if (currentStep === 4) { // Finish step is now 4
        btnNext.classList.add('hidden');
        btnFinish.classList.remove('hidden');

        // Fill confirmation data
        const { price: totalPrice } = calculateTotals();
        const serviceNames = [selectedService.name, ...selectedExtras.map(e => e.name)].join(' + ');
        document.getElementById('conf-service').innerText = serviceNames;
        document.getElementById('conf-date').innerText = selectedDate;
        document.getElementById('conf-time').innerText = selectedTime;
        document.getElementById('conf-price').innerText = Core.formatCurrency(totalPrice);


        const carDisplay = document.getElementById('booking-car-display');
        const carHidden = document.getElementById('booking-car-id');
        if (selectedCarForBooking) {
            if (carDisplay) carDisplay.innerText = selectedCarForBooking.label;
            if (carHidden) carHidden.value = selectedCarForBooking.id;
        } else {
            if (carDisplay) carDisplay.innerText = 'Nincs kiválasztott autó';
            if (carHidden) carHidden.value = '';
        }

        // Initialize Payment Options
        renderPaymentOptions();

    } else {
        btnNext.classList.remove('hidden');
        btnFinish.classList.add('hidden');
    }
}

function nextStep() {
    if (currentStep === 1) {
        if (!selectedDate) {
            alert("Kérlek válassz napot!");
            return;
        }
        renderServicesWizard(); // Go to step 2 (Services)
    } else if (currentStep === 2) { // Service Step
        if (!selectedService) {
            alert("Kérlek válassz szolgáltatást!");
            return;
        }
        renderSlots(selectedDate); // Go to step 3 (Slots) - Now uses selectedService info
    } else if (currentStep === 3) { // Slot Step
        if (!selectedTime) {
            alert("Kérlek válassz időpontot!");
            return;
        }
    }

    if (currentStep < 4) {
        currentStep++;
        updateStepUI();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepUI();
    }
}

// Service Wizard
// Service Wizard
function renderServicesWizard() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    // Pre-calculate totals for the footer
    const { price: totalPrice, duration: totalDuration } = calculateTotals();

    // Preparation for VIP logic
    let vipHtml = '';
    if (currentUser && currentUser.subscription && currentUser.subscription.active) {
        ensureSubscriptionEntitlements(currentUser);
        const entitlements = currentUser.subscription.entitlements || 0;
        const maxEntitlements = currentUser.subscription.maxEntitlements ?? getSubscriptionSettings().maxEntitlements;
        const isValues = entitlements > 0;

        const isSelected = selectedService && selectedService.id === 'vip_wash';
        const statusMsg = isValues ? `(Elérhető: ${entitlements}/${maxEntitlements})` : "(Nincs elérhető jogosultság)";

        vipHtml = `
            <div class="service-select-card ${isValues ? '' : 'disabled'}" 
                 onclick="${isValues ? "selectBaseService({ id: 'vip_wash', name: '👑 VIP Weekly Shine', duration: 30, price: 0, type: 'base' })" : ""}"
                 style="padding: 15px; border-radius: 12px; border: 1px solid ${isValues ? '#ffd700' : 'rgba(255,255,255,0.1)'}; 
                        cursor: ${isValues ? 'pointer' : 'not-allowed'}; transition: all 0.2s; position: relative;
                        background: ${isSelected ? 'rgba(255, 215, 0, 0.2)' : (isValues ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255,255,255,0.05)')};
                        margin-bottom: 20px; opacity: ${isValues ? '1' : '0.5'};
                        ${isSelected ? 'border-color: #ffd700; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:bold; font-size:1.1em; color:#ffd700;">👑 VIP Weekly Shine</div>
                    <div style="font-weight:bold; color:#00ff00;">${Core.formatCurrency(0)}</div>
                </div>
                <div style="font-size:0.85rem; opacity:0.8; margin-top:5px;">
                    Prémium belső takarítás + Dupla pontok (Alapcsomag)
                </div>
                <div style="font-size:0.8rem; color:${isValues ? '#00ff00' : '#ff4d4d'}; margin-top:5px;">
                    ${statusMsg}
                </div>
            </div>`;
    }

    const baseServices = appServices.filter(s => s.type !== 'extra');
    const extraServices = appServices.filter(s => s.type === 'extra');

    let baseHtml = '';
    if (baseServices.length > 0) {
        baseHtml = `<h4 style="margin: 10px 0; color: #4cc9f0;">Válassz alapcsomagot:</h4>`;
        baseServices.forEach(srv => {
            const isSelected = selectedService && selectedService.id === srv.id;
            baseHtml += `
                <div class="service-select-card" onclick="selectBaseService(${JSON.stringify(srv).replace(/"/g, '&quot;')})"
                     style="background: ${isSelected ? 'rgba(76, 201, 240, 0.2)' : 'rgba(255,255,255,0.05)'};
                            padding: 15px; border-radius: 12px; border: 1px solid ${isSelected ? '#4cc9f0' : 'rgba(255,255,255,0.1)'};
                            cursor: pointer; transition: all 0.2s; margin-bottom: 10px;">
                    <div style="font-weight:bold; font-size:1.1em; color:#4cc9f0; margin-bottom:5px;">${srv.name}</div>
                    <div style="display:flex; justify-content:space-between; opacity:0.8;">
                        <span>⏱ ${srv.duration} perc</span>
                        <span>💰 ${Core.formatCurrency(srv.price)}</span>
                    </div>
                </div>`;
        });
    }

    let extraHtml = '';
    if (extraServices.length > 0) {
        extraHtml = `<h4 style="margin: 20px 0 10px 0; color: #ffd700;">Extrák (Választható +):</h4>`;
        extraServices.forEach(srv => {
            const isSelected = selectedExtras.some(ex => ex.id === srv.id);
            extraHtml += `
                <div class="service-select-card" onclick="toggleExtraService(${JSON.stringify(srv).replace(/"/g, '&quot;')})"
                     style="background: ${isSelected ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255,255,255,0.05)'};
                            padding: 12px; border-radius: 12px; border: 1px solid ${isSelected ? '#ffd700' : 'rgba(255,255,255,0.1)'};
                            cursor: pointer; transition: all 0.2s; margin-bottom: 8px;
                            display: flex; justify-content: space-between; align-items: center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:20px; height:20px; border-radius:4px; border:2px solid ${isSelected ? '#ffd700' : 'rgba(255,255,255,0.3)'}; background:${isSelected ? '#ffd700' : 'transparent'}; display:flex; align-items:center; justify-content:center;">
                            ${isSelected ? '<span style="color:#000; font-weight:bold; font-size:14px;">✓</span>' : ''}
                        </div>
                        <div>
                            <div style="font-weight:bold; color:#fff;">${srv.name}</div>
                            <div style="font-size:0.8rem; opacity:0.7;">${srv.duration > 0 ? `+${srv.duration} perc` : 'Nem ad plusz időt'}</div>
                        </div>
                    </div>
                    <div style="font-weight:bold; color:#ffd700;">+${Core.formatCurrency(srv.price)}</div>
                </div>`;
        });
    }

    let footerHtml = '';
    if (selectedService) {
        footerHtml = `
            <div style="margin-top: 25px; padding: 15px; border-radius: 12px; background: rgba(0,0,0,0.3); border-top: 2px solid #4ade80;
                        display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size:0.8rem; opacity:0.7;">Összesen:</div>
                    <div style="font-weight:bold; font-size:1.2rem; color:#4ade80;">💰 ${Core.formatCurrency(totalPrice)}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.8rem; opacity:0.7;">Várható idő:</div>
                    <div style="font-weight:bold; color:#fff;">⏱ ${totalDuration} perc</div>
                </div>
            </div>`;
    }

    grid.innerHTML = vipHtml + baseHtml + extraHtml + footerHtml;
}

// Global toggle functions to avoid inline logic complexity
window.selectBaseService = function (srv) {
    selectedService = srv;
    renderServicesWizard();
};

window.toggleExtraService = function (srv) {
    const index = selectedExtras.findIndex(ex => ex.id === srv.id);
    if (index !== -1) {
        selectedExtras.splice(index, 1);
    } else {
        selectedExtras.push(srv);
    }
    renderServicesWizard();
};

// Calendar
function renderCalendar() {
    // Reload bookings to ensure freshness
    appBookings = JSON.parse(localStorage.getItem('app_bookings')) || [];

    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    const today = new Date();
    const openDays = getOpenDays();
    let html = '';
    const vipTier = getVipTier();
    const { goldAdvanceDays } = getVipSlotSettings();
    const daysWindow = vipTier === 'gold' ? BOOKING_DAYS_WINDOW + goldAdvanceDays : BOOKING_DAYS_WINDOW;

    for (let i = 0; i < daysWindow; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = Core.getISODate(date);
        const isClosedDay = !openDays.includes(date.getDay());

        const dayBookings = appBookings.filter(b => b.date === dateStr && b.status === 'active');
        const isFull = dayBookings.length >= MAX_CARS_PER_DAY;
        const availableCount = MAX_CARS_PER_DAY - dayBookings.length;

        let className = `calendar-day ${isFull ? 'full' : ''}`;
        if (isClosedDay) className += ' disabled-day';
        if (selectedDate === dateStr) className += ' selected';

        const style = isClosedDay ? 'opacity: 0.3; cursor: not-allowed; pointer-events: none; background: rgba(0,0,0,0.2);' : '';
        const pointerAction = (isClosedDay || isFull) ? "" : `onclick="selectDate('${dateStr}', ${isFull})"`;

        html += `
            <div class="${className}" style="${style}" ${pointerAction}>
                <span class="day-name">${date.toLocaleDateString('hu-HU', { weekday: 'short' })}</span>
                <span class="day-number">${date.getDate()}</span>
                <span class="day-status">
                    ${isClosedDay ? 'ZÁRVA' : (isFull ? 'Megtelt' : `${availableCount} szabad`)}
                </span>
            </div>
        `;
    }
    calendarGrid.innerHTML = html;
}

function selectDate(dateStr, isFull) {
    if (isFull) {
        alert("Ez a nap megtelt.");
        return;
    }
    selectedDate = dateStr;
    renderSlots(dateStr); // Call renderSlots directly instead of just rerendering calendar
    renderCalendar(); // Re-render calendar to update selection
}

// Helper to convert "HH:MM" to minutes from midnight
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Helper to get totals
function calculateTotals() {
    let price = selectedService ? selectedService.price : 0;
    let duration = selectedService ? selectedService.duration : 30;
    selectedExtras.forEach(ex => {
        price += ex.price;
        duration += ex.duration;
    });
    return { price, duration };
}

// Slots
function renderSlots(dateStr) {
    // Reload bookings and settings
    appBookings = JSON.parse(localStorage.getItem('app_bookings')) || [];
    const pufferMin = parseInt(localStorage.getItem('settings_pufferMin')) || 15;
    const leadTimeMin = parseInt(localStorage.getItem('settings_leadTimeMin')) || 60; // Nap és idő alapú Lead Time
    const vipTier = getVipTier();
    const { prioritySlots, homeSlots } = getVipSlotSettings();

    // Dynamic Service Duration
    const { duration: serviceMin } = calculateTotals();

    document.getElementById('selected-date-display').innerText = dateStr;
    const slotsGrid = document.getElementById('slots-grid');
    slotsGrid.innerHTML = '';

    // Update hint text with service info
    if (selectedService) {
        const extraText = selectedExtras.length > 0 ? ` + ${selectedExtras.length} extra` : '';
        document.getElementById('selected-service-display').innerText = `${selectedService.name}${extraText} (${serviceMin} perc)`;
    }

    // Filter bookings for this day
    const dayBookings = appBookings.filter(b => b.date === dateStr && b.status === 'active');

    // Dynamic Loading
    const { start, end } = getOpeningHours();

    let slotTimeIter = new Date();
    slotTimeIter.setHours(start, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(end, 0, 0, 0);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;

    // Intelligens időköz számítás
    // Find earliest possible start time based on Lead Time
    let earliestBookableTime = new Date(now.getTime() + (leadTimeMin * 60000));

    // Granularity: Check every 15 minutes instead of 30?
    // If we want "flexible" start times (e.g. 9:15), we need 15 min steps.
    const SLOT_STEP_MINS = 15;

    while (slotTimeIter < endTime) {
        const timeStr = slotTimeIter.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
        const candidateStart = timeToMinutes(timeStr);
        const candidateEnd = candidateStart + serviceMin + pufferMin;

        // IMPORTANT: Also check if candidateEnd > CLOSING_HOUR
        const closingMin = end * 60;
        if (candidateEnd > closingMin) {
            // Cannot finish before closing
            // Break loop or continue? usually break as time increases
            slotTimeIter.setMinutes(slotTimeIter.getMinutes() + SLOT_STEP_MINS);
            continue;
        }

        // Collision Detection
        let isBlocked = false;

        for (const booking of dayBookings) {
            const bookingStart = timeToMinutes(booking.time);
            // Get DURATION of that existing booking! 
            // Assume existing booking has .duration property? Or fallback to 30?
            const bDuration = booking.duration || 30;
            const bookingEnd = bookingStart + bDuration + pufferMin;

            // Overlap logic: (StartA < EndB) && (EndA > StartB)
            if (candidateStart < bookingEnd && candidateEnd > bookingStart) {
                isBlocked = true;
                break;
            }
        }

        // Past & Lead Time Check
        let isPast = false;
        let isTooSoon = false;

        if (isToday) {
            // Check specific time of slot
            const slotDateObj = new Date();
            slotDateObj.setHours(slotTimeIter.getHours(), slotTimeIter.getMinutes(), 0, 0);

            // 1. Absolute Past (e.g. 8:00 when it's 10:00)
            if (slotDateObj < now) {
                isPast = true;
            }
            // 2. Lead Time Constraint (e.g. 10:15 when it's 10:00 and lead is 60m)
            else if (slotDateObj < earliestBookableTime) {
                isTooSoon = true;
            }
        }

        const slotBtn = document.createElement('div');

        const isPriority = prioritySlots.includes(timeStr);
        const isHomeSlot = homeSlots.includes(timeStr);

        if ((isPriority || isHomeSlot) && vipTier !== 'platina') {
            slotTimeIter.setMinutes(slotTimeIter.getMinutes() + SLOT_STEP_MINS);
            continue;
        }

        if (isBlocked || isPast || isTooSoon) {
            slotBtn.className = 'time-slot booked';
            if (isPast) slotBtn.title = "Ez az időpont már elmúlt";
            else if (isTooSoon) slotBtn.title = `Túl korai! Reagálási idő: ${leadTimeMin} perc`;
            else if (isBlocked) slotBtn.title = "Ütközés másik időponttal (Munka + Puffer)";
        } else {
            slotBtn.className = 'time-slot';
            slotBtn.onclick = () => selectTime(timeStr, slotBtn);
        }

        const badge = isPriority ? ' • VIP' : (isHomeSlot ? ' • Házhoz' : '');
        slotBtn.innerText = `${timeStr}${badge}`;

        if (selectedTime === timeStr) {
            slotBtn.classList.add('selected');
        }

        slotsGrid.appendChild(slotBtn);
        slotTimeIter.setMinutes(slotTimeIter.getMinutes() + SLOT_STEP_MINS);
    }
}

function selectTime(timeStr, btnElement) {
    selectedTime = timeStr;
    const allSlots = document.querySelectorAll('.time-slot');
    allSlots.forEach(slot => slot.classList.remove('selected'));
    btnElement.classList.add('selected');
    updateFinalConfirmationPrice();
}

function renderPaymentOptions() {
    const optReward = document.getElementById('opt-reward');
    const optSub = document.getElementById('opt-sub');
    const optGift = document.getElementById('opt-gift');
    const points = currentUser.activePoints || 0;
    const hasSub = currentUser.subscription && currentUser.subscription.active;
    if (hasSub) {
        ensureSubscriptionEntitlements(currentUser);
    }
    const entitlements = hasSub ? (currentUser.subscription.entitlements || 0) : 0;
    const giftEntitlements = currentUser.giftEntitlements || 0;

    if (optReward) {
        if (points >= 5) {
            optReward.disabled = false;
            optReward.innerText = `5 Shine Pont beváltása (Jelenleg: ${points})`;
        } else {
            optReward.disabled = true;
            optReward.innerText = `5 Shine Pont beváltása (Még ${5 - points} kell)`;
        }
    }

    if (optSub) {
        if (hasSub) {
            if (entitlements > 0) {
                optSub.disabled = false;
                optSub.innerText = `Előfizetéses HFZ (${entitlements} elérhető)`;
            } else {
                optSub.disabled = true;
                optSub.innerText = "Előfizetéses HFZ (Nincs jogosultság)";
            }
        } else {
            optSub.disabled = true;
            optSub.innerText = "Heti ingyen mosás (Nincs előfizetés)";
        }
    }

    if (optGift) {
        if (giftEntitlements > 0) {
            optGift.disabled = false;
            optGift.innerText = `Ajándék HFZ (${giftEntitlements} elérhető)`;
        } else {
            optGift.disabled = true;
            optGift.innerText = "Ajándék HFZ (Nincs jogosultság)";
        }
    }
}

function updateFinalConfirmationPrice() {
    if (!selectedService) return;
    const method = document.getElementById('payment-method-choice')?.value || 'normal';
    const display = document.getElementById('conf-price');
    const { price: totalPrice } = calculateTotals();

    if (method === 'normal') {
        display.innerText = `${Core.formatCurrency(totalPrice)} (+1 pont)`;
    } else if (method === 'reward') {
        display.innerText = `${Core.formatCurrency(0)} (5 pont beszámítva)`;
    } else if (method === 'gift') {
        display.innerText = `${Core.formatCurrency(0)} (Ajándék HFZ)`;
    } else {
        display.innerText = `${Core.formatCurrency(0)} (Előfizetői mosás)`;
    }
}

function isDateInCurrentWeek(date) {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    // Calculate difference to get to Monday (if today is Sun/0, we need -6 days, otherwise -day+1)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);

    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return date >= startOfWeek;
}

function confirmBooking() {
    if (!selectedDate || !selectedTime || !selectedService) return;

    const method = document.getElementById('payment-method-choice')?.value || 'normal';

    if (!selectedCarForBooking) {
        alert("Nincs kiválasztott autó. Kérlek indítsd a foglalást a Garázsból.");
        return;
    }
    const selectedCarValue = selectedCarForBooking.id;
    const selectedCarText = selectedCarForBooking.label;

    // Check for existing active booking for this car
    const existingBooking = appBookings.find(b =>
        b.carPlate === selectedCarValue &&
        b.status === 'active'
    );

    if (existingBooking) {
        alert(`Erre az autóra (${selectedCarValue}) már van egy aktív foglalásod!\n\nDátum: ${existingBooking.date} ${existingBooking.time}\n\nHa újat szeretnél, előbb mondd le a meglévőt a Garázsban.`);
        return;
    }

    // Final Collision Check (Security)
    // Even though UI blocks it, we check again before saving to prevent race conditions
    const pufferMin = parseInt(localStorage.getItem('settings_pufferMin')) || 15;
    const { price: totalPrice, duration: totalDuration } = calculateTotals();

    const newStart = timeToMinutes(selectedTime);
    const newEnd = newStart + totalDuration + pufferMin;

    // Check against all active bookings for that day
    const dayBookings = appBookings.filter(b => b.date === selectedDate && b.status === 'active');

    for (const booking of dayBookings) {
        const bStart = timeToMinutes(booking.time);
        const bDuration = booking.duration || 30;
        const bEnd = bStart + bDuration + pufferMin;

        if (newStart < bEnd && newEnd > bStart) {
            alert("Hiba! Ez az időpont időközben foglalt lett (ütközés másik munkával). Kérlek válassz másikat.");
            // Refresh slots to show new state
            renderSlots(selectedDate);
            return;
        }
    }

    const bookingId = 'book_' + Date.now();

    // Get Address Info
    const city = document.getElementById('booking-city').value;
    const street = document.getElementById('booking-street').value;
    const houseNum = document.getElementById('booking-housenumber').value;

    if (!city || !street || !houseNum) {
        alert("Kérlek add meg a címet is, hogy tudjam hová kell mennem!");
        return;
    }

    // AI Shine Points Redemption or VIP Service Check
    const activePoints = currentUser.activePoints || 0;

    // Check if VIP Service was selected directly OR Subscription Payment Method Used
    const isVipWash = (selectedService.id === 'vip_wash');
    const isSubscriptionPayment = (method === 'subscription'); // NEW: Explicit check
    const isGiftPayment = (method === 'gift');

    // Legacy Payment Method Check (if used)
    let isRewardUsed = (method === 'reward');

    let finalPrice = totalPrice;

    if (isVipWash || isSubscriptionPayment) {
        if (!currentUser.subscription || !currentUser.subscription.active) {
            alert("Nincs aktív előfizetésed a jogosultság felhasználásához.");
            return;
        }
        ensureSubscriptionEntitlements(currentUser);
        if ((currentUser.subscription.entitlements || 0) <= 0) {
            alert("Nincs elérhető előfizetéses jogosultság.");
            return;
        }
        finalPrice = 0;
    } else if (isGiftPayment) {
        if ((currentUser.giftEntitlements || 0) <= 0) {
            alert("Nincs elérhető ajándék jogosultság.");
            return;
        }
        finalPrice = 0;
    } else if (isRewardUsed) {
        finalPrice = 0;
    }

    const { price: _, duration: bookingDuration } = calculateTotals();
    const serviceList = [selectedService.name, ...selectedExtras.map(e => e.name)];

    // Create detailed booking object
    const newBooking = {
        id: bookingId,
        userId: currentUser.id,
        userName: currentUser.name,
        vipLevel: currentUser.level || 'Bronze',
        carPlate: selectedCarValue,
        carDetails: selectedCarText, // Snapshot of car info

        // Address Details
        address: {
            city,
            street,
            houseNum
        },

        // Service Details
        service: serviceList.join(' + '),
        services: serviceList, // Array for programmatic access
        duration: bookingDuration,
        price: finalPrice,
        rewardUsed: isRewardUsed,
        isSubscription: (isVipWash || isSubscriptionPayment), // Flag for easier tracking
        entitlementUsed: (isVipWash || isSubscriptionPayment),
        giftEntitlementUsed: isGiftPayment,

        date: selectedDate,
        time: selectedTime,
        status: 'active',
        paymentMethod: method,
        created: new Date().toISOString()
    };

    // Add to bookings
    appBookings.push(newBooking);
    Core.saveData('app_bookings', appBookings);

    // Update User Points / Quota
    const userIndex = appUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex > -1) {
        if (isVipWash || isSubscriptionPayment) {
            const subscription = appUsers[userIndex].subscription || {};
            const entitlements = subscription.entitlements || 0;
            if (entitlements <= 0) {
                alert("Nincs elérhető előfizetéses jogosultság.");
                return;
            }
            subscription.entitlements = Math.max(0, entitlements - 1);
            appUsers[userIndex].subscription = subscription;
            logSubscriptionEvent({
                type: 'Felhasználás',
                user: appUsers[userIndex],
                amount: 1,
                note: `Foglalás: ${selectedDate} ${selectedTime}`
            });
        } else if (isGiftPayment) {
            const currentGifts = appUsers[userIndex].giftEntitlements || 0;
            if (currentGifts <= 0) {
                alert("Nincs elérhető ajándék jogosultság.");
                return;
            }
            appUsers[userIndex].giftEntitlements = Math.max(0, currentGifts - 1);
            logGiftEvent({
                type: 'Felhasználás',
                code: '-',
                user: appUsers[userIndex],
                amount: 1,
                note: `Foglalás: ${selectedDate} ${selectedTime}`
            });
        } else if (isRewardUsed) {
            // Points Redemption Logic
            appUsers[userIndex].activePoints = Math.max(0, (appUsers[userIndex].activePoints || 0) - 5);
            // Points for this visit will be awarded by Admin upon completion
        } else {
            // Normal Paid Service Logic
            // Points are now awarded by Admin upon completion.
        }

        Core.saveData('app_users', appUsers);
        currentUser = appUsers[userIndex];
        Core.saveData('currentUser', currentUser);
    }

    // Save to global storage
    // appBookings.push(newBooking); // REMOVED DUPLICATE PUSH
    // localStorage.setItem('app_bookings', JSON.stringify(appBookings)); // Redundant, handled by Core.saveData above

    alert(`Sikeres foglalás!\n\n${selectedDate} - ${selectedTime}\n${selectedService.name} (${selectedService.duration} p)\n${selectedCarText}`);
    closeModal('booking-modal');
    selectedCarForBooking = null;

    // Refresh Dashboard
    checkForActiveBooking();
    renderCarList(); // Update car list to show active status
    renderCalendar();
    if (selectedDate) renderSlots(selectedDate);
}

// Review Logic
let currentReviewBookingId = null;
let currentRating = 0;

function initReviewSystem() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = parseInt(star.getAttribute('data-value'));
            updateStars(currentRating);
        });
    });
}

function updateStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-value'));
        if (val <= rating) {
            star.style.color = '#ffc107'; // Gold
        } else {
            star.style.color = '#555'; // Grey
        }
    });
}

function openReviewModal(bookingId) {
    currentReviewBookingId = bookingId;
    currentRating = 0;
    updateStars(0);
    document.getElementById('review-comment').value = '';
    openModal('review-modal');
}

function submitReview() {
    if (currentRating === 0) {
        alert("Kérlek válassz legalább 1 csillagot!");
        return;
    }

    // Find booking
    const bookingIndex = appBookings.findIndex(b => b.id === currentReviewBookingId);
    if (bookingIndex > -1) {
        const review = {
            rating: currentRating,
            comment: document.getElementById('review-comment').value,
            timestamp: new Date().toISOString()
        };

        appBookings[bookingIndex].review = review;
        // Keep status as completed, just ensure review is saved

        localStorage.setItem('app_bookings', JSON.stringify(appBookings));

        alert("Köszönjük az értékelést! ⭐");
        closeModal('review-modal');
        renderCarList(); // Refresh UI to hide button
    }
}


// --- NEW Point Transfer & Subscription Logic ---

function updateShineDisplay() {
    const el = document.getElementById('hub-points'); // Updated to hub-points if modal is open
    if (el && currentUser) el.innerText = currentUser.activePoints || 0;

    // Also update header badge if exists
    renderShineBadge();

    updateProfileTile();
}

function updateProfileTile() {
    const tilePoints = document.getElementById('tile-points-display');
    if (tilePoints && currentUser) {
        tilePoints.innerText = (currentUser.activePoints || 0) + ' pt';
    }
}

function updateSubscriptionUI() {
    const statusEl = document.getElementById('sub-status');
    const infoEl = document.getElementById('sub-active-info');
    const offerEl = document.getElementById('sub-offer-details'); // NEW
    const nextWashEl = document.getElementById('sub-next-wash');
    const giftEntitlementEl = document.getElementById('gift-entitlement-count');
    const buyBtn = document.getElementById('btn-buy-sub');
    const tileSubStatus = document.getElementById('sub-status-tile'); // NEW Tile Status

    if (!currentUser) return;

    const giftEntitlements = currentUser.giftEntitlements || 0;
    if (giftEntitlementEl) {
        giftEntitlementEl.innerText = `Ajándék jogosultság: ${giftEntitlements} db`;
        giftEntitlementEl.style.color = giftEntitlements > 0 ? '#4cc9f0' : '#aaaaaa';
    }

    // 1. Check for Active Subscription
    if (currentUser.subscription && currentUser.subscription.active) {
        ensureSubscriptionEntitlements(currentUser);
        if (statusEl) {
            statusEl.innerText = 'AKTÍV 👑';
            statusEl.style.color = '#4cc9f0';
        }
        if (infoEl) infoEl.style.display = 'block';
        if (offerEl) offerEl.style.display = 'none'; // Hide offer details if active
        if (buyBtn) buyBtn.style.display = 'none';

        const entitlements = currentUser.subscription.entitlements || 0;
        const maxEntitlements = currentUser.subscription.maxEntitlements ?? getSubscriptionSettings().maxEntitlements;

        if (nextWashEl) {
            nextWashEl.innerText = `Elérhető jogosultság: ${entitlements}/${maxEntitlements}`;
            nextWashEl.style.color = entitlements > 0 ? '#00ff00' : '#ff4d4d';
        }

        if (tileSubStatus) {
            tileSubStatus.innerText = `Aktív (${entitlements}/${maxEntitlements})`;
            tileSubStatus.style.color = entitlements > 0 ? '#00ff00' : '#ffd700';
        }
        return;
    }

    // 2. Check for Pending Request
    const vipRequests = Core.getData('vip_requests') || [];
    const pendingReq = vipRequests.find(r => r.userId === currentUser.id && r.status === 'pending');

    if (pendingReq) {
        if (statusEl) {
            statusEl.innerText = 'FÜGGŐBEN... ⌛';
            statusEl.style.color = '#ffd700';
        }
        if (infoEl) infoEl.style.display = 'none';
        if (offerEl) offerEl.style.display = 'block';
        if (buyBtn) {
            buyBtn.innerText = 'Jelentkezés leadva (Várakozás)';
            buyBtn.disabled = true;
            buyBtn.style.opacity = '0.6';
            buyBtn.style.display = 'block';
        }
        if (tileSubStatus) {
            tileSubStatus.innerText = 'Függőben';
            tileSubStatus.style.color = '#ffd700';
        }
    } else {
        // 3. Not active, no pending request
        if (statusEl) {
            statusEl.innerText = 'Nem aktív';
            statusEl.style.color = '';
        }
        if (infoEl) infoEl.style.display = 'none';
        if (offerEl) offerEl.style.display = 'block';
        if (buyBtn) {
            buyBtn.innerText = 'Előfizetés Most 🚀';
            buyBtn.disabled = false;
            buyBtn.style.opacity = '1';
            buyBtn.style.display = 'block';
        }
        if (tileSubStatus) {
            tileSubStatus.innerText = 'Free';
            tileSubStatus.style.color = '#ffffff';
        }
    }
}

function transferShinePoints() {
    const targetVal = document.getElementById('transfer-target-id').value.trim();
    const amount = parseInt(document.getElementById('transfer-amount').value);

    if (!targetVal || isNaN(amount) || amount <= 0) {
        alert("Kérlek adj meg egy érvényes célpontot és pontszámot!");
        return;
    }

    if ((currentUser.activePoints || 0) < amount) {
        alert("Nincs ennyi Shine Pontod!");
        return;
    }

    // Find Target User
    const targetUserIndex = appUsers.findIndex(u => u.id === targetVal || u.name.toLowerCase() === targetVal.toLowerCase());

    if (targetUserIndex === -1) {
        alert("Nem találom a megadott felhasználót!");
        return;
    }

    const targetUser = appUsers[targetUserIndex];
    if (targetUser.id === currentUser.id) {
        alert("Magadnak nem küldhetsz pontot!");
        return;
    }

    if (confirm(`Biztosan átadsz ${amount} Shine Pontot neki: ${targetUser.name}?`)) {
        // Update Sender
        const senderIndex = appUsers.findIndex(u => u.id === currentUser.id);
        appUsers[senderIndex].activePoints -= amount;

        // Update Receiver
        appUsers[targetUserIndex].activePoints = (appUsers[targetUserIndex].activePoints || 0) + amount;

        // Save
        Core.saveData('app_users', appUsers);
        currentUser = appUsers[senderIndex];
        Core.saveData('currentUser', currentUser);

        alert("Sikeres pontátadás! 🎁✨");
        updateShineDisplay();
        document.getElementById('transfer-target-id').value = '';
        document.getElementById('transfer-amount').value = '';
    }
}

function transferSubscriptionEntitlements() {
    const targetVal = document.getElementById('entitlement-transfer-target').value.trim();
    const amount = parseInt(document.getElementById('entitlement-transfer-amount').value);

    if (!currentUser || !currentUser.subscription || !currentUser.subscription.active) {
        alert("Nincs aktív előfizetésed a jogosultság átadásához.");
        return;
    }

    if (!targetVal || isNaN(amount) || amount <= 0) {
        alert("Kérlek adj meg érvényes célpontot és darabszámot!");
        return;
    }

    ensureSubscriptionEntitlements(currentUser);
    const senderEntitlements = currentUser.subscription.entitlements || 0;

    if (senderEntitlements < amount) {
        alert("Nincs ennyi jogosultságod!");
        return;
    }

    const targetUserIndex = appUsers.findIndex(u => u.id === targetVal || u.name.toLowerCase() === targetVal.toLowerCase());
    if (targetUserIndex === -1) {
        alert("Nem találom a megadott felhasználót!");
        return;
    }

    const targetUser = appUsers[targetUserIndex];
    if (targetUser.id === currentUser.id) {
        alert("Magadnak nem adhatsz át jogosultságot!");
        return;
    }

    if (confirm(`Biztosan átadsz ${amount} jogosultságot neki: ${targetUser.name}?`)) {
        const senderIndex = appUsers.findIndex(u => u.id === currentUser.id);
        const settings = getSubscriptionSettings();
        const maxEntitlements = settings.maxEntitlements;

        appUsers[senderIndex].subscription.entitlements = Math.max(0, senderEntitlements - amount);

        if (!appUsers[targetUserIndex].subscription) {
            appUsers[targetUserIndex].subscription = {
                active: false
            };
        }
        const targetEntitlements = appUsers[targetUserIndex].subscription.entitlements || 0;
        appUsers[targetUserIndex].subscription.entitlements = Math.min(maxEntitlements, targetEntitlements + amount);

        Core.saveData('app_users', appUsers);
        currentUser = appUsers[senderIndex];
        Core.saveData('currentUser', currentUser);

        logSubscriptionEvent({
            type: 'Átadás',
            user: appUsers[senderIndex],
            targetUser,
            amount,
            note: 'Jogosultság átadás'
        });

        alert("Sikeres jogosultság átadás! 👑");
        updateSubscriptionUI();
        document.getElementById('entitlement-transfer-target').value = '';
        document.getElementById('entitlement-transfer-amount').value = '';
    }
}

function buySubscription() {
    if (!currentUser) return;

    if (confirm("Szeretnél jelentkezni a Weekly Shine VIP tagságra (9.900 Ft / hó)?\n\nElőnyök: heti 1 ingyen belső takarítás + dupla pontok!\n\nA jelentkezést az adminisztrátor bírálja el.")) {
        const vipRequests = Core.getData('vip_requests') || [];

        // Prevent duplicate requests
        if (vipRequests.some(r => r.userId === currentUser.id && r.status === 'pending')) {
            alert("Már van egy függőben lévő jelentkezésed!");
            return;
        }

        const newRequest = {
            id: 'vip_' + Date.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            date: new Date().toISOString(),
            status: 'pending'
        };

        vipRequests.push(newRequest);
        Core.saveData('vip_requests', vipRequests);

        alert("Jelentkezésedet rögzítettük! Értesítünk, amint jóváhagyásra került. ✨");
        updateSubscriptionUI();
        closeModal('subscription-modal');
    }
}

// ... map ...

// Garage Logic ...
// (We will update renderCarList separately to show the button)

function checkForActiveBooking() {
    if (!currentUser) return;

    // Find active booking for this user
    // Active means: active, on_way, arrived, or started
    // FRISSÍTÉS: Ajándékok kiszűrése a visszaszámlálásból
    const myBookings = appBookings.filter(b =>
        b.userId === currentUser.id &&
        ['active', 'on_way', 'arrived', 'started'].includes(b.status) &&
        !b.isGift
    );

    // AI UPDATE: Handle Gifts separately
    renderGiftStatus();

    // Find the next upcoming one
    const now = new Date().getTime();
    const upcoming = myBookings.find(b => {
        const target = new Date(`${b.date}T${b.time}`).getTime();
        return target > now;
    });

    if (upcoming) {
        activeBooking = upcoming;
        activeBooking.targetTs = new Date(`${upcoming.date}T${upcoming.time}`).getTime();
        startCountdown();
    } else {
        activeBooking = null;
        // Reset UI if no active booking
        const countdownContainer = document.getElementById('active-countdown');
        if (countdownContainer) countdownContainer.remove();

        const tile = document.querySelector('.tile-accent .tile-content');
        const tileBg = document.querySelector('.tile-accent .tile-bg-icon');
        if (tile) tile.style.display = 'block';
        if (tileBg) tileBg.style.opacity = '0.15';
    }
}

function startCountdown() {
    if (activeBooking) {
        // Find appointment tile content
        const tile = document.querySelector('.tile-accent .tile-content');
        const tileBg = document.querySelector('.tile-accent .tile-bg-icon');

        // Hide standard content
        if (tile) tile.style.display = 'none';
        if (tileBg) tileBg.style.opacity = '0.05'; // Dim background

        // Create or get countdown container
        let countdownContainer = document.getElementById('active-countdown');
        if (!countdownContainer) {
            countdownContainer = document.createElement('div');
            countdownContainer.id = 'active-countdown';
            countdownContainer.className = 'countdown-container';
            const parent = document.querySelector('.tile-accent');
            if (parent) parent.appendChild(countdownContainer);
        }

        // Update loop
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = activeBooking.targetTs - now;

            if (distance < 0) {
                clearInterval(countdownInterval);
                if (countdownContainer) countdownContainer.innerHTML = '<div class="countdown-timer">ITT AZ IDŐ!</div>';

                // Mark as completed/expired? For now just visual.
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // Format: 01:23:45
            const format = (num) => num.toString().padStart(2, '0');

            let displayStr = `${format(hours + (days * 24))}:${format(minutes)}:${format(seconds)}`;

            let statusLabel = "Érkezésig";
            if (activeBooking.status === 'on_way') statusLabel = "Úton vagyok";
            if (activeBooking.status === 'arrived') statusLabel = "Megérkeztem";
            if (activeBooking.status === 'started') statusLabel = "Dolgozom";

            if (countdownContainer) {
                countdownContainer.innerHTML = `
                    <div class="countdown-label">${statusLabel}</div>
                    <div class="countdown-timer">${displayStr}</div>
                    <div class="countdown-label">${activeBooking.carPlate}</div>
                `;
            }
        }, 1000);
    }
}

// Garage Logic
let garageTimerInterval = null;
let garageView = localStorage.getItem('garage_view') || 'classic'; // 'classic' or 'holographic'

window.toggleGarageView = function () {
    garageView = (garageView === 'classic') ? 'holographic' : 'classic';
    localStorage.setItem('garage_view', garageView);
    updateToggleUI();
    renderCarList();
}

function updateToggleUI() {
    const btnText = document.getElementById('toggle-text');
    const btnIcon = document.getElementById('toggle-icon');
    const toggle = document.getElementById('garage-view-toggle');

    if (garageView === 'holographic') {
        if (btnText) btnText.innerText = 'Holografikus nézet';
        if (btnIcon) btnIcon.innerText = '✨';
        if (toggle) {
            toggle.style.borderColor = '#4cc9f0';
            toggle.style.background = 'rgba(76, 201, 240, 0.2)';
            toggle.style.color = '#4cc9f0';
        }
    } else {
        if (btnText) btnText.innerText = 'Classic nézet';
        if (btnIcon) btnIcon.innerText = '🧊';
        if (toggle) {
            toggle.style.borderColor = 'rgba(255,255,255,0.2)';
            toggle.style.background = 'rgba(255,255,255,0.1)';
            toggle.style.color = 'white';
        }
    }
}

function updateGarageCount() {
    const count = cars.filter(car => car.active !== false).length;
    document.getElementById('garage-count').innerText = `${count} autó`;
}

function renderCarList() {
    const list = document.getElementById('car-list');
    list.innerHTML = '';

    // Clear previous interval to prevent duplicates
    if (garageTimerInterval) clearInterval(garageTimerInterval);

    const visibleCars = cars.filter(car => car.active !== false);

    if (visibleCars.length === 0) {
        list.innerHTML = '<p class="empty-state">Még nincs autód a garázsban.</p>';
        return;
    }

    visibleCars.forEach((car, index) => {
        const item = document.createElement('div');
        item.className = `car-card ${garageView === 'holographic' ? 'holographic-card' : ''}`;

        // Add glitch overlay for holographic
        if (garageView === 'holographic') {
            const glitch = document.createElement('div');
            glitch.className = 'holographic-glitch';
            item.appendChild(glitch);
        }

        if (garageView === 'holographic') {
            list.classList.add('garage-holographic');
        } else {
            list.classList.remove('garage-holographic');
        }
        // Staggered animation
        item.style.animationDelay = `${index * 100}ms`;

        // Check if THIS car is active (Independent check)
        const carId = car.plate || `${car.brand} ${car.model}`;
        const vipLevel = (car.vipLevel || currentUser?.level || 'Bronze').toString();
        const vipLabel = vipLevel.toLowerCase() === 'gold'
            ? 'Gold'
            : (vipLevel.toLowerCase() === 'diamond' || vipLevel.toLowerCase() === 'platina')
                ? 'Platina'
                : 'Alap';

        // Find SPECIFIC booking for this car
        // Should show for ANY status except completed/cancelled
        const activeBooking = appBookings.find(b =>
            b.carPlate === carId &&
            ['active', 'on_way', 'arrived', 'started'].includes(b.status)
        );
        const isActive = !!activeBooking;
        const nextBooking = appBookings
            .filter(b =>
                b.carPlate === carId &&
                ['active', 'on_way', 'arrived', 'started'].includes(b.status)
            )
            .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
        const nextBookingLabel = nextBooking ? `${nextBooking.date} ${nextBooking.time}` : 'Nincs';

        const remainingMs = isActive ? getCancellationRemainingMs(activeBooking) : 0;
        const canCancel = isActive && remainingMs > 0;
        const remainingRatio = remainingMs / (CANCELLATION_WINDOW_MIN * 60000);
        const countdownColor = remainingRatio > 0.5 ? '#00ff00' : (remainingRatio > 0.2 ? '#ffc107' : '#ff4d4d');

        // Status Text & Style
        let statusBadge = '';
        if (isActive) {
            let statusText = 'Várakozó';
            let color = '#4cc9f0';
            if (activeBooking.status === 'on_way') { statusText = 'Úton 🚗'; color = '#ffc107'; }
            if (activeBooking.status === 'arrived') { statusText = 'Megérkezett 📍'; color = '#107c10'; }
            if (activeBooking.status === 'started') { statusText = 'Dolgozik 🧼'; color = '#00ff00'; }

            statusBadge = `<span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.75em; color: ${color}; border: 1px solid ${color};">${statusText}</span>`;
        }

        // Check for UNREVIEWED completed booking
        const unreviewedBooking = appBookings.find(b =>
            b.carPlate === carId &&
            b.status === 'completed' &&
            !b.review &&
            !b.review_skipped
        );

        // Timer Placeholder ID
        const timerId = `timer-${index}`;

        item.innerHTML = `
            <div class="car-bg-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-2.7 4.1c-.2.3-.3.7-.3 1v5c0 .6.4 1 1 1h2m2 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                </svg>
            </div>
            
            <div class="car-card-header">
                <div class="car-info">
                    <h4>${car.brand} ${car.model}</h4>
                    <div style="display:flex; align-items:center; gap:10px; flex-wrap: wrap;">
                        <span class="car-plate">${car.plate || 'NO-PLATE'}</span>
                        <span style="background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.75em; color: #ffd700; border: 1px solid #ffd700;">VIP: ${vipLabel}</span>
                        ${statusBadge}
                        ${isActive ? `<span id="${timerId}" class="plate-timer" data-target="${activeBooking.date}T${activeBooking.time}" style="color:#e81123; font-weight:bold; font-family:monospace; font-size:1.1em; margin-left: auto;">Számítás...</span>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="car-details-grid">
                <div class="detail-item">
                    <span class="detail-label">Autó azonosító</span>
                    <span class="detail-value">${carId}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Következő foglalás</span>
                    <span class="detail-value">${nextBookingLabel}</span>
                </div>
                
                ${isActive ?
                `<div class="detail-item active-countdown-card" style="border-bottom: 1px solid rgba(76, 201, 240, 0.1); padding-bottom: 8px; margin-bottom: 8px;">
                    <span class="detail-label">Foglalás:</span>
                    <span class="detail-value" style="color: #4cc9f0;">${activeBooking.date}, ${activeBooking.time}</span>
                 </div>
                 <div class="detail-item">
                    <span class="detail-label">Lemondásig:</span>
                    <span class="detail-value cancel-timer" data-deadline="${getCancellationDeadline(activeBooking)}" data-car-id="${carId}"
                        style="color: ${canCancel ? countdownColor : '#ff4d4d'};">
                        ${canCancel ? formatCountdown(remainingMs) : 'Lezárva'}
                    </span>
                 </div>
                 <div class="detail-item">
                    <span class="detail-label">Szolgáltatás:</span>
                    <span class="detail-value" style="font-size: 0.85rem; color: #fff;">${activeBooking.service}</span>
                 </div>
                 <div class="detail-item">
                    <span class="detail-label">Fizetés:</span>
                    <span class="detail-value" style="font-size: 0.85rem; color: #4ade80;">
                        ${activeBooking.paymentMethod === 'reward' ? '🎁 5 pont beváltva' :
                    activeBooking.paymentMethod === 'subscription' ? '👑 VIP (Ingyenes)' :
                        `💰 ${Core.formatCurrency(activeBooking.price)} (Helyszínen)`}
                    </span>
                 </div>`
                :
                `<div class="detail-item">
                    <span class="detail-label">Utolsó takarítás</span>
                    <span class="detail-value">-</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Állapot</span>
                    <span class="detail-value" style="color: #4cc9f0">Tiszta</span>
                </div>`
            }
            </div>

            <div class="car-actions">
                ${isActive ?
                (canCancel ?
                `<div class="cancel-action" data-car-id="${carId}">
                    <button class="btn-delete" style="background: rgba(232, 17, 35, 0.2); width: 100%; justify-content: center;" onclick="cancelBooking('${carId}')">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        Lemondás
                    </button>
                </div>`
                : `<div class="cancel-action" data-car-id="${carId}" style="width:100%; text-align:center; font-size:0.85rem; color:#ff4d4d; padding:10px 0;">
                    Lemondás lezárva
                </div>`)
                : unreviewedBooking ?
                    `<div style="display:flex; gap:5px; width:100%;">
                        <button class="btn-primary" style="flex:1; background: rgba(255, 193, 7, 0.2); border-color: #ffc107; color: #ffc107; justify-content: center;" onclick="openReviewModal('${unreviewedBooking.id}')">
                            <span style="font-size:1.2em; margin-right:5px;">⭐</span> Értékelés Írása
                        </button>
                        <button class="btn-delete" style="width:40px; padding:0; justify-content:center; background: rgba(232, 17, 35, 0.1);" onclick="skipReview('${unreviewedBooking.id}')" title="Nem értékelem">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>`
                    :
                    `<button class="btn-card-action" onclick="startBookingFromGarage('${carId}')">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Foglalás indítása
                    </button>`
            }
            </div>
        `;
        list.appendChild(item);
    });

    // Start Timer Update Loop
    updateGarageTimers();
}

function startBookingFromGarage(carId) {
    const car = cars.find(item => (item.plate || `${item.brand} ${item.model}`) === carId);
    if (!car) {
        alert("Nem található autó a foglaláshoz.");
        return;
    }
    const label = `${car.brand} ${car.model}${car.plate ? ` (${car.plate})` : ''}`;
    selectedCarForBooking = {
        id: carId,
        label
    };
    openBookingModal();
}

function updateGarageTimers() {
    // Immediate run
    runTimerLogic();
    // Loop
    garageTimerInterval = setInterval(runTimerLogic, 1000);
}

function runTimerLogic() {
    const timerElements = document.querySelectorAll('.plate-timer');
    const cancelTimers = document.querySelectorAll('.cancel-timer');
    const now = new Date().getTime();

    timerElements.forEach(el => {
        const targetStr = el.getAttribute('data-target'); // "2024-02-01T10:00"
        if (!targetStr) return;

        const targetTime = new Date(targetStr).getTime();
        const distance = targetTime - now;

        if (distance < 0) {
            el.innerText = "ITT AZ IDŐ!";
            el.style.color = "#00ff00";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const format = (num) => num.toString().padStart(2, '0');

        // Show Days if > 0
        let displayStr = `${format(hours)}:${format(minutes)}:${format(seconds)}`;
        if (days > 0) {
            displayStr = `${days} nap ${displayStr}`;
        }

        el.innerText = displayStr;
    });

    cancelTimers.forEach(el => {
        const deadlineStr = el.getAttribute('data-deadline');
        const carId = el.getAttribute('data-car-id');
        if (!deadlineStr || !carId) return;

        const deadline = parseInt(deadlineStr, 10);
        const remaining = deadline - now;
        if (remaining <= 0) {
            el.innerText = 'Lezárva';
            el.style.color = '#ff4d4d';
            const container = document.querySelector(`.cancel-action[data-car-id="${carId}"]`);
            if (container && container.querySelector('button')) {
                container.innerHTML = 'Lemondás lezárva';
                container.style.color = '#ff4d4d';
                container.style.textAlign = 'center';
                container.style.fontSize = '0.85rem';
                container.style.padding = '10px 0';
            }
            return;
        }

        const ratio = remaining / (CANCELLATION_WINDOW_MIN * 60000);
        const color = ratio > 0.5 ? '#00ff00' : (ratio > 0.2 ? '#ffc107' : '#ff4d4d');
        el.style.color = color;
        el.innerText = formatCountdown(remaining);
    });
}

function cancelBooking(carId) {
    if (confirm("Biztosan lemondod ezt a foglalást?")) {
        let bookingsChanged = false;
        let cancellationAllowed = false;
        let targetBooking = null;
        appBookings.forEach(booking => {
            if (booking.userId === currentUser.id &&
                booking.carPlate === carId &&
                booking.status === 'active') {
                targetBooking = booking;
                const remainingMs = getCancellationRemainingMs(booking);
                if (remainingMs > 0) {
                    booking.status = 'cancelled';
                    booking.cancelledAt = new Date().toISOString();
                    bookingsChanged = true;
                    cancellationAllowed = true;
                }
            }
        });

        if (bookingsChanged) {
            Core.saveData('app_bookings', appBookings);
            if (targetBooking && targetBooking.entitlementUsed) {
                const userIndex = appUsers.findIndex(u => u.id === targetBooking.userId);
                if (userIndex > -1 && appUsers[userIndex].subscription) {
                    const settings = getSubscriptionSettings();
                    const maxEntitlements = settings.maxEntitlements;
                    const currentEntitlements = appUsers[userIndex].subscription.entitlements || 0;
                    const nextValue = Math.min(maxEntitlements, currentEntitlements + 1);
                    appUsers[userIndex].subscription.entitlements = nextValue;
                    Core.saveData('app_users', appUsers);
                    if (currentUser && appUsers[userIndex].id === currentUser.id) {
                        currentUser = appUsers[userIndex];
                        Core.saveData('currentUser', currentUser);
                    }
                    logSubscriptionEvent({
                        type: 'Visszaadás',
                        user: appUsers[userIndex],
                        amount: 1,
                        note: 'Lemondás határidőn belül'
                    });
                }
            }
            if (targetBooking && targetBooking.giftEntitlementUsed) {
                const userIndex = appUsers.findIndex(u => u.id === targetBooking.userId);
                if (userIndex > -1) {
                    const currentGifts = appUsers[userIndex].giftEntitlements || 0;
                    appUsers[userIndex].giftEntitlements = currentGifts + 1;
                    Core.saveData('app_users', appUsers);
                    if (currentUser && appUsers[userIndex].id === currentUser.id) {
                        currentUser = appUsers[userIndex];
                        Core.saveData('currentUser', currentUser);
                    }
                    logGiftEvent({
                        type: 'Visszaadás',
                        code: '-',
                        user: appUsers[userIndex],
                        amount: 1,
                        note: 'Lemondás határidőn belül'
                    });
                }
            }
            logCancellationEvent({
                booking: targetBooking,
                withinWindow: true,
                capacityReleased: true
            });
            alert("A foglalás sikeresen lemondva.");
            checkForActiveBooking();
            renderCarList(); // Refresh list to show "Cancel" gone and "Settings" back
            renderCalendar();
            if (selectedDate) renderSlots(selectedDate);
        } else {
            if (targetBooking) {
                if (targetBooking.entitlementUsed) {
                    const settings = getSubscriptionSettings();
                    if (settings.lateCancelReturn) {
                        const userIndex = appUsers.findIndex(u => u.id === targetBooking.userId);
                        if (userIndex > -1 && appUsers[userIndex].subscription) {
                            const maxEntitlements = settings.maxEntitlements;
                            const currentEntitlements = appUsers[userIndex].subscription.entitlements || 0;
                            const nextValue = Math.min(maxEntitlements, currentEntitlements + 1);
                            appUsers[userIndex].subscription.entitlements = nextValue;
                            Core.saveData('app_users', appUsers);
                            if (currentUser && appUsers[userIndex].id === currentUser.id) {
                                currentUser = appUsers[userIndex];
                                Core.saveData('currentUser', currentUser);
                            }
                            logSubscriptionEvent({
                                type: 'Visszaadás',
                                user: appUsers[userIndex],
                                amount: 1,
                                note: 'Lemondás határidőn túl (admin engedélyezve)'
                            });
                        }
                    }
                }
                logCancellationEvent({
                    booking: targetBooking,
                    withinWindow: false,
                    capacityReleased: false
                });
                alert("A lemondási határidő lejárt, a foglalás nem mondható le.");
            } else {
                alert("Nem található aktív foglalás ehhez az autóhoz.");
            }
        }
    }
}


// Form Handlers
function showAddCarForm() {
    document.getElementById('add-car-form').classList.remove('hidden');
    const btn = document.getElementById('btn-add-new-car');
    if (btn) btn.classList.add('hidden'); // Hide "Add new" button
}

function hideAddCarForm() {
    document.getElementById('add-car-form').classList.add('hidden');
    const btn = document.getElementById('btn-add-new-car');
    if (btn) btn.classList.remove('hidden');
}

document.getElementById('add-car-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const brand = document.getElementById('car-brand').value;
    const model = document.getElementById('car-model').value;
    const plate = document.getElementById('car-plate').value;

    cars.push({ brand, model, plate, active: true });
    saveCars();

    // Reset
    e.target.reset();
    hideAddCarForm();
    renderCarList();
    updateGarageCount();
});

function removeCar(index) {
    if (confirm("Biztosan törlöd ezt az autót?")) {
        const carToRemove = cars[index];
        const carId = carToRemove.plate || `${carToRemove.brand} ${carToRemove.model}`;

        // Cancel active bookings for this car
        let bookingsChanged = false;
        appBookings.forEach(booking => {
            if (booking.userId === currentUser.id &&
                booking.carPlate === carId &&
                booking.status === 'active') {

                booking.status = 'cancelled';
                bookingsChanged = true;
            }
        });

        if (bookingsChanged) {
            localStorage.setItem('app_bookings', JSON.stringify(appBookings));
            // Also remove from bookingData for calendar availability
            // Note: This is trickier because bookingData structure is date -> [times].
            // We'd need to find the date/time. 
            // For now, let's trust appBookings is the source of truth for "active" status.
            // But we should probably clean up bookingData too to free up the slot.

            // Simple clean up of bookingData (slots)
            // Iterate all dates in bookingData
            Object.keys(bookingData).forEach(date => {
                const times = bookingData[date];
                // This is hard because bookingData doesn't know WHICH car/user booked that time slot.
                // It only stores ["10:00", "11:00"].
                // The refactoring plan mentioned moving towards reliance on appBookings.
                // For now, we'll accept that the slot might look "taken" in the calendar even if cancelled, 
                // UNLESS we check appBookings against bookingData on render.
            });

            // To properly free the slot, we should rebuild bookingData from appBookings on init/load.
            // But for this specific bug (countdown not disappearing), setting status='cancelled' and re-checking activeBooking is enough.
        }

        cars.splice(index, 1);
        saveCars();
        renderCarList();
        updateGarageCount();
        checkForActiveBooking(); // This will clear the countdown if it was for this car
    }
}

function saveCars() {
    localStorage.setItem(`cars_${currentUser.id}`, JSON.stringify(cars));
    updateGarageCount(); // Ensure count updates immediately
}

function skipReview(bookingId) {
    const booking = appBookings.find(b => b.id === bookingId);
    if (booking) {
        booking.review_skipped = true;
        localStorage.setItem('app_bookings', JSON.stringify(appBookings));
        renderCarList(); // Immediate refresh
        showToast("Értékelés mellőzve.");
    }
}

// --- MISSING FUNCTIONS RESTORED ---

function openProfileHub() {
    Core.openModal('profile-hub-modal');
    if (currentUser) {
        const avatarEl = document.getElementById('hub-avatar');
        const usernameEl = document.getElementById('hub-username');
        const pointsEl = document.getElementById('hub-points');
        const levelEl = document.getElementById('hub-level');

        if (avatarEl) avatarEl.src = currentUser.avatar;
        if (usernameEl) usernameEl.innerText = currentUser.name;
        if (pointsEl) pointsEl.innerText = currentUser.activePoints || 0;
        if (levelEl) levelEl.innerText = currentUser.level || 'Bronze';

        updateSubscriptionUI();
    }
}

const GIFT_FIXED_PRICE = 9900;

function generateGiftCode(existingCodes) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
        code = 'HFZ-' + Array.from({ length: 6 }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
    } while (existingCodes.some(item => item.code === code));
    return code;
}

function logGiftEvent({ type, code, user, amount, note }) {
    const logs = Core.getData('gift_redemption_logs');
    logs.push({
        id: `giftlog_${Date.now()}`,
        type,
        code,
        userId: user?.id || null,
        userName: user?.name || 'Ismeretlen',
        amount,
        note: note || '',
        createdAt: new Date().toISOString()
    });
    Core.saveData('gift_redemption_logs', logs);
}

function setupGiftPurchaseForm() {
    const form = document.getElementById('gift-purchase-form');
    if (!form) return;

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Ajándékkód vásárlásához be kell jelentkezned.");
            return;
        }

        const recipient = document.getElementById('gift-purchase-recipient').value.trim();
        const codes = Core.getData('gift_codes');
        const newCode = generateGiftCode(codes);
        codes.push({
            code: newCode,
            status: 'active',
            createdAt: new Date().toISOString(),
            createdByUserId: currentUser.id,
            createdByName: currentUser.name,
            recipientName: recipient || null
        });
        Core.saveData('gift_codes', codes);
        logGiftEvent({
            type: 'Létrehozás',
            code: newCode,
            user: currentUser,
            amount: 1,
            note: recipient ? `Cél: ${recipient}` : 'Nincs megadva'
        });

        const codeWrap = document.getElementById('gift-generated-code');
        const codeValue = document.getElementById('gift-generated-code-value');
        if (codeValue) codeValue.textContent = newCode;
        if (codeWrap) codeWrap.style.display = 'block';
        newForm.reset();
    });
}

function setupGiftRedeemForm() {
    const form = document.getElementById('gift-redeem-form');
    if (!form) return;

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Beváltáshoz be kell jelentkezned.");
            return;
        }
        const codeInput = document.getElementById('gift-redeem-code');
        const code = codeInput.value.trim().toUpperCase();
        if (!code) {
            alert("Add meg az ajándékkódot!");
            return;
        }

        const codes = Core.getData('gift_codes');
        const codeEntry = codes.find(item => item.code === code);
        if (!codeEntry) {
            alert("A kód nem található.");
            return;
        }
        if (codeEntry.status !== 'active') {
            alert("Ez a kód már nem használható.");
            return;
        }

        codeEntry.status = 'redeemed';
        codeEntry.redeemedAt = new Date().toISOString();
        codeEntry.redeemedByUserId = currentUser.id;
        codeEntry.redeemedByName = currentUser.name;
        Core.saveData('gift_codes', codes);

        const userIndex = appUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex > -1) {
            const currentEntitlements = appUsers[userIndex].giftEntitlements || 0;
            appUsers[userIndex].giftEntitlements = currentEntitlements + 1;
            Core.saveData('app_users', appUsers);
            currentUser = appUsers[userIndex];
            Core.saveData('currentUser', currentUser);
        }

        logGiftEvent({
            type: 'Beváltás',
            code,
            user: currentUser,
            amount: 1,
            note: 'Ajándék jogosultság létrehozva'
        });

        alert("Ajándékkód beváltva! 1 HFZ jogosultság hozzáadva.");
        codeInput.value = '';
        updateSubscriptionUI();
    });
}

function dismissAnnouncement() {
    const banner = document.getElementById('announcement-banner');
    if (banner) banner.style.display = 'none';
}
