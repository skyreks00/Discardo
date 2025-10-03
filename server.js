const template = document.getElementById('message-template');
const messagesContainer = document.getElementById('messages');
const form = document.getElementById('chat-form');
const authorInput = document.getElementById('author');
const messageInput = document.getElementById('message');

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocol}://${window.location.host}`);

function appendMessage(message) {
  const clone = template.content.cloneNode(true);
  const authorEl = clone.querySelector('.chat-author');
  const timeEl = clone.querySelector('.chat-time');
  const textEl = clone.querySelector('.chat-text');

  authorEl.textContent = message.author;
  timeEl.textContent = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(message.timestamp));
  timeEl.dateTime = message.timestamp;
  textEl.textContent = message.text;

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

  const payload = {
    type: 'chat',
    payload: {
      author: authorInput.value.trim() || 'Anonyme',
      text: messageInput.value.trim()
    }
  };

  if (!payload.payload.text) {
    return;
  }

  ws.send(JSON.stringify(payload));
  messageInput.value = '';
  messageInput.focus();
});
