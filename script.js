// Virtual Photobooth State Management & Navigation
const state = {
    step: 'intro',
    selectedLayout: null,
    requiredPhotos: 3,
    photos: [], // Array of base64 image strings or null
    stripBgColor: '#fffdf9',
    stripStyle: 'classic',
    customNote: '09 · 24 · FOREVER'
};

// DOM Elements
const screens = {
    intro: document.getElementById('screen-intro'),
    layout: document.getElementById('screen-layout'),
    camera: document.getElementById('screen-camera'),
    design: document.getElementById('screen-design')
};

const navStep = document.getElementById('step-nav');
const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const btnEnableCamera = document.getElementById('btn-enable-camera');
const btnTakePhoto = document.getElementById('btn-take-photo');
const countdownEl = document.getElementById('countdown');
const holdersList = document.getElementById('holders-list');
const photoProgressText = document.getElementById('photo-progress-text');
const progressCircle = document.getElementById('progress-circle');
const btnToDesign = document.getElementById('btn-to-design');
const globalRetakeContainer = document.getElementById('global-retake-container');

// Navigation Engine
function goToStep(stepName) {
    state.step = stepName;
    Object.keys(screens).forEach(key => {
        if (key === stepName) {
            screens[key].classList.remove('hidden');
        } else {
            screens[key].classList.add('hidden');
        }
    });

    if (stepName === 'intro') {
        navStep.classList.add('hidden');
    } else {
        navStep.classList.remove('hidden');
        updateStepNavUI();
    }
}

function updateStepNavUI() {
    const steps = ['layout', 'camera', 'design'];
    steps.forEach((s, idx) => {
        const el = document.getElementById(`nav-step-${idx + 1}`);
        if (s === state.step) {
            el.className = 'px-2 sm:px-2.5 py-1 rounded-full bg-soft text-accent-dark font-bold';
        } else {
            el.className = 'px-2 sm:px-2.5 py-1 rounded-full muted-text';
        }
    });
}

// Step 1: Intro -> Layout
document.getElementById('btn-start-photobooth').addEventListener('click', () => goToStep('layout'));
document.getElementById('brand-logo').addEventListener('click', () => goToStep('intro'));
document.getElementById('btn-back-to-intro').addEventListener('click', () => goToStep('intro'));

// Step 2: Layout Selection
const layoutCards = document.querySelectorAll('.layout-card');
const btnToCamera = document.getElementById('btn-to-camera');

layoutCards.forEach(card => {
    card.addEventListener('click', () => {
        layoutCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.selectedLayout = card.dataset.layout;
        state.requiredPhotos = (state.selectedLayout === '1x3') ? 3 : 4;
        btnToCamera.disabled = false;
    });
});

btnToCamera.addEventListener('click', () => {
    setupPhotoHolders();
    goToStep('camera');
});

// Step 3: Camera Logic
let mediaStream = null;

btnEnableCamera.addEventListener('click', async () => {
    try {
        // Mobile-friendly constraints that adapt to phone cameras natively
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 1080 },
                height: { ideal: 1920 }
            },
            audio: false
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        webcam.srcObject = mediaStream;
        webcam.classList.remove('hidden');
        cameraPlaceholder.classList.add('hidden');
        btnTakePhoto.disabled = false;
    } catch (err) {
        alert('Could not access camera. Please allow camera permissions.');
        console.error(err);
    }
});

function setupPhotoHolders() {
    state.photos = new Array(state.requiredPhotos).fill(null);
    renderHoldersUI();
}

function renderHoldersUI() {
    holdersList.innerHTML = '';
    const capturedCount = state.photos.filter(p => p !== null).length;
    
    // Find next empty slot
    const nextEmptyIndex = state.photos.findIndex(p => p === null);

    // Check if all photos are captured
    if (capturedCount === state.requiredPhotos) {
        btnToDesign.disabled = false;
        btnTakePhoto.disabled = true;
    } else {
        btnToDesign.disabled = true;
        if (mediaStream) btnTakePhoto.disabled = false;
    }

    // Toggle Global Retake All button separately
    if (capturedCount > 0) {
        globalRetakeContainer.classList.remove('hidden');
    } else {
        globalRetakeContainer.classList.add('hidden');
    }

    // Update Text & Circle Counter
    photoProgressText.textContent = `${capturedCount} of ${state.requiredPhotos} captured`;
    progressCircle.textContent = `${capturedCount}/${state.requiredPhotos}`;

    state.photos.forEach((photoData, i) => {
        const slot = document.createElement('div');
        
        if (photoData) {
            // Filled holder: Tap anywhere on card to retake
            slot.className = 'photo-slot-card has-photo rounded-2xl p-3 flex flex-col items-center justify-center relative cursor-pointer group shadow-xs transition h-28 sm:h-32 overflow-hidden';
            slot.onclick = () => retakeSingle(i);
            slot.innerHTML = `
                <img src="${photoData}" class="absolute inset-0 w-full h-full object-cover rounded-2xl" />
                <div class="absolute top-2.5 left-2.5 w-6 h-6 rounded-full bg-stone-900/80 text-white text-xs font-bold flex items-center justify-center z-10">
                    ${i + 1}
                </div>
                <div class="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold space-x-1 backdrop-blur-xs">
                    <span>📷 Tap to Retake</span>
                </div>
            `;
        } else {
            // Empty holder matching exact reference UI (Image icon + numbered badge)
            const isTarget = (i === nextEmptyIndex);
            slot.className = `photo-slot-card ${isTarget ? 'active-target' : ''} rounded-2xl p-3 flex flex-col items-center justify-center relative h-28 sm:h-32`;
            slot.innerHTML = `
                <div class="absolute top-2.5 left-2.5 w-6 h-6 rounded-full ${isTarget ? 'bg-stone-700 text-white' : 'bg-stone-300 text-stone-700'} text-xs font-bold flex items-center justify-center">
                    ${i + 1}
                </div>
                <svg class="w-7 h-7 text-stone-400 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="1.5"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5" stroke-width="1.5"></circle>
                    <polyline points="21 15 16 10 5 21" stroke-width="1.5"></polyline>
                </svg>
            `;
        }
        holdersList.appendChild(slot);
    });
}

btnTakePhoto.addEventListener('click', async () => {
    const emptyIndex = state.photos.findIndex(p => p === null);
    if (emptyIndex === -1) return;

    btnTakePhoto.disabled = true;
    await runCountdown();
    const photoData = captureFrame();
    
    state.photos[emptyIndex] = photoData;
    renderHoldersUI();
});

function runCountdown() {
    return new Promise(resolve => {
        let count = 3;
        countdownEl.textContent = count;
        countdownEl.classList.remove('hidden');

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                countdownEl.textContent = count;
            } else {
                clearInterval(timer);
                countdownEl.classList.add('hidden');
                resolve();
            }
        }, 1000);
    });
}

function captureFrame() {
    canvas.width = webcam.videoWidth || 640;
    canvas.height = webcam.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

// Tap any photo card directly to retake ONLY that image slot
window.retakeSingle = function(index) {
    state.photos[index] = null;
    renderHoldersUI();
};

// Retake ALL photos
document.getElementById('btn-retake-all').addEventListener('click', () => {
    setupPhotoHolders();
});

document.getElementById('btn-back-to-layout').addEventListener('click', () => goToStep('layout'));

// Step 4: Strip Design & Customization
document.getElementById('btn-to-design').addEventListener('click', () => {
    renderFinalStripPreview();
    goToStep('design');
});

document.getElementById('btn-back-to-camera').addEventListener('click', () => goToStep('camera'));

const finalContainer = document.getElementById('final-strip-container');
const finalSlots = document.getElementById('final-strip-slots');
const finalNotePreview = document.getElementById('final-note-preview');
const customNoteInput = document.getElementById('custom-note-input');

function renderFinalStripPreview() {
    finalSlots.innerHTML = '';
    
    if (state.selectedLayout === '2x2') {
        finalSlots.className = 'w-full grid grid-cols-2 gap-2';
    } else {
        finalSlots.className = 'w-full flex flex-col space-y-2';
    }

    state.photos.forEach(url => {
        if (url) {
            const img = document.createElement('img');
            img.src = url;
            img.className = 'w-full aspect-[4/3] object-cover rounded shadow-xs';
            finalSlots.appendChild(img);
        }
    });

    finalContainer.style.backgroundColor = state.stripBgColor;
    finalNotePreview.textContent = state.customNote;
}

// Swatch Selection
document.querySelectorAll('.swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active-swatch'));
        btn.classList.add('active-swatch');
        state.stripBgColor = btn.dataset.color;
        finalContainer.style.backgroundColor = state.stripBgColor;
    });
});

// Style Selection
document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active-style'));
        btn.classList.add('active-style');
        state.stripStyle = btn.dataset.style;
    });
});

// Live Note Input
customNoteInput.addEventListener('input', (e) => {
    state.customNote = e.target.value || '09 · 24 · FOREVER';
    finalNotePreview.textContent = state.customNote;
});

// Download Functionality
function generateExportCanvas(format) {
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');

    const width = 600;
    const height = state.selectedLayout === '1x4' ? 1400 : 1200;
    exportCanvas.width = width;
    exportCanvas.height = height;

    // Background fill
    ctx.fillStyle = state.stripBgColor;
    ctx.fillRect(0, 0, width, height);

    // Header Text
    ctx.fillStyle = (state.stripBgColor === '#29251f' || state.stripBgColor === '#66836b') ? '#fffdf9' : '#29251f';
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.fillText('KEEPSAKE', width / 2, 50);

    // Render Photos
    let loaded = 0;
    const validPhotos = state.photos.filter(p => p !== null);

    validPhotos.forEach((url, i) => {
        const img = new Image();
        img.onload = () => {
            if (state.selectedLayout === '2x2') {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = 40 + col * 265;
                const y = 80 + row * 210;
                ctx.drawImage(img, x, y, 250, 190);
            } else {
                const y = 80 + i * (state.selectedLayout === '1x4' ? 290 : 340);
                const h = state.selectedLayout === '1x4' ? 270 : 310;
                ctx.drawImage(img, 40, y, 520, h);
            }

            loaded++;
            if (loaded === validPhotos.length) {
                // Footer Custom Note
                ctx.font = '16px monospace';
                ctx.fillStyle = (state.stripBgColor === '#29251f' || state.stripBgColor === '#66836b') ? '#e9e1d7' : '#827b72';
                ctx.fillText(state.customNote, width / 2, height - 40);

                // Export File
                const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
                const link = document.createElement('a');
                link.download = `photostrip.${format}`;
                link.href = exportCanvas.toDataURL(mime, 0.95);
                link.click();

                // Success Message & Reset to Intro
                const msg = document.getElementById('download-success-msg');
                msg.classList.remove('hidden');
                setTimeout(() => {
                    msg.classList.add('hidden');
                    goToStep('intro');
                }, 2500);
            }
        };
        img.src = url;
    });
}

document.getElementById('btn-download-png').addEventListener('click', () => generateExportCanvas('png'));
document.getElementById('btn-download-jpg').addEventListener('click', () => generateExportCanvas('jpg'));
