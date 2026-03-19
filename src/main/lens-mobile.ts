async function uploadFile(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;

  const statusEl = document.getElementById('status');
  if (!statusEl) return;

  const formData = new FormData();
  formData.append('image', file);

  statusEl.innerText = 'Uploading...';
  statusEl.className = '';
  statusEl.style.display = 'block';

  try {
    const token = window.location.pathname.split('/')[2];
    const uploadUrl = window.location.origin + '/lens/' + token + '/upload';
    
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    const responseText = await res.text();
    
    if (res.ok) {
      statusEl.innerText = 'Added to Ledger.';
      statusEl.className = 'success';
      input.value = '';
    } else {
      statusEl.innerHTML = `Error ${res.status}: ${responseText}`;
      statusEl.className = 'error';
    }
  } catch (e) {
    statusEl.innerHTML = `Network error: ${(e as Error).message}`;
    statusEl.className = 'error';
  }
}

// Keep status hidden until needed
const statusEl = document.getElementById('status');
if (statusEl) {
  statusEl.style.display = 'none';
}

// Attach event listener directly (more reliable on mobile)
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      uploadFile(fileInput);
    });
  }
});

window.addEventListener('error', function(e: Event) {
  const target = e.target as HTMLScriptElement;
  if (target?.src?.includes('lens-script')) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.innerText = 'Script failed to load. Refresh and try again.';
      statusEl.className = 'error';
    }
  }
});
