console.log("PWA JS VERSION: TAURI-DESKTOP-UPDATE");

// Check if running inside Tauri
const isTauri = window.__TAURI__ !== undefined || navigator.userAgent.includes('Tauri');

const installBtn = document.getElementById('btn-install-app');

// If running inside the installed Tauri app, hide the install button
if (isTauri && installBtn) {
  installBtn.classList.add('hidden');
}

if (installBtn) {
  installBtn.addEventListener('click', () => {
    console.log('Install button clicked - initiating desktop installer download');
    
    // Direct the user to the GitHub release URL for the Windows installer
    const installerUrl = "https://github.com/anujguptaclg-dev/TOC/releases/latest/download/Grammar_String_Deriver_Installer.exe";
    
    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    link.href = installerUrl;
    link.download = 'Grammar_String_Deriver_Installer.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Optional fallback message in case the browser blocks automatic downloads
    alert("Downloading the Windows installer...\n\nIf the download doesn't start automatically, please visit our GitHub Releases page at: https://github.com/anujguptaclg-dev/TOC/releases");
  });
}

