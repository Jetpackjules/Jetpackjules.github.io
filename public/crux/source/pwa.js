let installPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
window.addEventListener('appinstalled',()=>{installPrompt=null;document.querySelector('#install-app').textContent='App installed';});
export function setupInstall(showDialog){
 document.querySelector('#install-app').onclick=async()=>{
  if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
  showDialog('<p class="eyebrow">CRUX ON YOUR PHONE</p><h2>Add to home screen</h2><p>In Safari, open Share → Add to Home Screen. In Chrome or Edge, open the browser menu and choose Install app or Add to Home Screen when available.</p><p>Open the site once online first. The app and models are cached after use, when your browser permits it. Your wall photos stay on your device and are not saved between sessions.</p>');
 };
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
}
