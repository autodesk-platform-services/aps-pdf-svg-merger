import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
  const urn = 'dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6anBvbS10ZW1wbGF0ZXNoZWV0YnVja2V0L1NoZWV0VGVtcGxhdGUucnZ0';
  setupModelSelection(viewer, urn);
});

async function setupModelSelection(viewer, selectedUrn) {
  try {
    
    loadModel(viewer, selectedUrn);
  } catch (err) {
    alert('Could not list models. See the console for more details.');
    console.error(err);
  }
}

function showNotification(message) {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = `<div class="notification">${message}</div>`;
  overlay.style.display = 'flex';
}

function clearNotification() {
  const overlay = document.getElementById('overlay');
  overlay.innerHTML = '';
  overlay.style.display = 'none';
}