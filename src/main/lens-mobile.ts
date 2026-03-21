interface LensStrings {
  uploading: string;
  success: string;
  scriptError: string;
}

function getLensStrings(): LensStrings {
  try {
    const raw = (document.body as HTMLElement & { dataset: DOMStringMap }).dataset.strings;
    if (raw) return JSON.parse(raw) as LensStrings;
  } catch { /* fall through */ }
  // Fallback to Spanish (app default) if attribute missing or unparseable
  return {
    uploading: 'Subiendo...',
    success: 'Añadido al Registro.',
    scriptError: 'Error al cargar el script. Recarga e inténtalo de nuevo.',
  };
}

const STRINGS = getLensStrings();

async function uploadFile(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;

  const statusEl = document.getElementById('status');
  if (!statusEl) return;

  const formData = new FormData();
  formData.append('image', file);

  statusEl.innerText = STRINGS.uploading;
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
      statusEl.innerText = STRINGS.success;
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
      statusEl.innerText = STRINGS.scriptError;
      statusEl.className = 'error';
    }
  }
});
