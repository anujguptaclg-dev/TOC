console.log("PWA JS VERSION: 2026-10-08-FIX-2");

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}

// Handle PWA Installation
let deferredPrompt;
const installBtn = document.getElementById('btn-install-app');

// Check if app is already installed/running in standalone mode
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

// Initially hide only if we are running in standalone mode
if (isStandalone && installBtn) {
  installBtn.classList.add('hidden');
}

if ('getInstalledRelatedApps' in navigator) {
  navigator.getInstalledRelatedApps().then((relatedApps) => {
    if (relatedApps.length > 0 && installBtn) {
      installBtn.classList.add('hidden');
    }
  }).catch(() => {});
}

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt fired');
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    console.log('Install button clicked');
    
    if (!deferredPrompt) {
      console.log('No deferred install prompt available');
      alert("This app may already be installed. You can also use Chrome's menu \u2192 Install page as app.");
      return;
    }
    
    console.log('Deferred install prompt available');
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      if (installBtn) installBtn.classList.add('hidden');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferredPrompt variable
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', (evt) => {
  console.log('App installed');
  if (installBtn) {
    installBtn.classList.add('hidden');
  }
  // clear the saved deferred prompt
  deferredPrompt = null;
});
