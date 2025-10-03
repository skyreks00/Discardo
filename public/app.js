const template = document.getElementById('message-template');
const messagesContainer = document.getElementById('messages');
const form = document.getElementById('chat-form');
const authorInput = document.getElementById('author');
const messageInput = document.getElementById('message');
const imageInput = document.getElementById('image');
const previewContainer = document.getElementById('image-preview');
const previewImage = previewContainer?.querySelector('img');
const clearImageButton = document.getElementById('clear-image');

const IMAGE_MAX_BYTES = 1_000_000; // ~1 Mo
let selectedImageData = null;

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.host}`);

function appendMessage(message) {
  const clone = template.content.cloneNode(true);
  const authorEl = clone.querySelector('.chat-author');
  const timeEl = clone.querySelector('.chat-time');
  const textEl = clone.querySelector('.chat-text');
  const imageFigure = clone.querySelector('.chat-image');
  const figureImage = imageFigure?.querySelector('img');

  authorEl.textContent = message.author;
  timeEl.textContent = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(message.timestamp));
  timeEl.dateTime = message.timestamp;
  textEl.textContent = message.text || '';
  textEl.hidden = !message.text;

  if (message.image && figureImage) {
    figureImage.src = message.image;
    imageFigure.hidden = false;
  }

  messagesContainer.appendChild(clone);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

ws.addEventListener('open', () => {
  console.info('Connecté au serveur WebSocket');
});

ws.addEventListener('message', (event) => {
  try {
    const data = JSON.parse(event.data);

    if (data.type === 'history' && Array.isArray(data.payload)) {
      data.payload.forEach(appendMessage);
    } else if (data.type === 'chat' && data.payload) {
      appendMessage(data.payload);
    }
  } catch (error) {
    console.error('Message mal formé reçu', error);
  }
});

ws.addEventListener('close', () => {
  console.warn('Connexion WebSocket fermée');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  if (ws.readyState !== WebSocket.OPEN) {
    alert('Le serveur WebSocket est hors ligne.');
    return;
  }

  const text = messageInput.value.trim();
  const payload = {
    type: 'chat',
    payload: {
      author: authorInput.value.trim() || 'Anonyme',
      text
    }
  };

  if (selectedImageData) {
    payload.payload.image = selectedImageData;
  }

  if (!payload.payload.text && !payload.payload.image) {
    return;
  }

  ws.send(JSON.stringify(payload));
  messageInput.value = '';
  messageInput.focus();
  clearImageSelection();
});

function clearImageSelection() {
  selectedImageData = null;
  if (imageInput) {
    imageInput.value = '';
  }
  if (previewContainer) {
    previewContainer.hidden = true;
  }
  if (previewImage) {
    previewImage.removeAttribute('src');
  }
}

if (imageInput) {
  imageInput.addEventListener('change', () => {
    const [file] = imageInput.files || [];

    if (!file) {
      clearImageSelection();
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Format non supporté. Choisissez une image.');
      clearImageSelection();
      return;
    }

    if (file.size > IMAGE_MAX_BYTES) {
      alert('Image trop lourde (max 1 Mo).');
      clearImageSelection();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        selectedImageData = reader.result;
        if (previewImage) {
          previewImage.src = reader.result;
        }
        if (previewContainer) {
          previewContainer.hidden = false;
        }
      }
    };
    reader.onerror = () => {
      alert("Impossible de lire l'image.");
      clearImageSelection();
    };
    reader.readAsDataURL(file);
  });
}

if (clearImageButton) {
  clearImageButton.addEventListener('click', () => {
    clearImageSelection();
  });
}
