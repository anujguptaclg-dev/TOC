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
if (isStandalone && installBtn) {
  installBtn.classList.add('hidden');
}

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      alert("Automatic installation is not supported by your current browser.\n\nPlease use the \"Install\" or \"Add to Home Screen\" option found in your browser's main menu to install the application.");
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      installBtn.classList.add('hidden');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Clear the deferredPrompt variable
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', (evt) => {
  console.log('App was installed');
  if (installBtn) {
    installBtn.classList.add('hidden');
  }
});
