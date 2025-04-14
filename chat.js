import { supabase } from './integrations/supabase/client.js';

// State management
let currentUser = null;
let currentRoom = null;
let rooms = [];
let onlineUsers = {};
let userCoins = 0;

// DOM Elements
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const usernameDisplay = document.getElementById('username-display');
const currentUsernameElement = document.getElementById('current-username');
const coinDisplay = document.getElementById('coin-display');
const coinCountElement = document.getElementById('coin-count');
const nicknameInput = document.getElementById('nickname');
const joinBtn = document.getElementById('join-btn');
const roomList = document.getElementById('room-list');
const newRoomNameInput = document.getElementById('new-room-name');
const createRoomBtn = document.getElementById('create-room-btn');
const onlineUsersList = document.getElementById('online-users');
const currentRoomHeader = document.getElementById('current-room-header');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Initialize the app
init();

async function init() {
  // Check if user has a saved nickname
  const savedNickname = localStorage.getItem('chatverse-nickname');
  if (savedNickname) {
    nicknameInput.value = savedNickname;
  }

  // Set up event listeners
  joinBtn.addEventListener('click', handleJoinChat);
  createRoomBtn.addEventListener('click', handleCreateRoom);
  messageForm.addEventListener('submit', handleSendMessage);

  // Set up realtime subscription for messages
  const messageChannel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      handleNewMessage
    )
    .subscribe();
    
  // Handle enter key on nickname input
  nicknameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleJoinChat();
    }
  });
}

function handleJoinChat() {
  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    alert('Please enter a nickname');
    return;
  }

  // Save user info
  currentUser = {
    id: generateUserId(),
    nickname
  };
  
  localStorage.setItem('chatverse-nickname', nickname);
  localStorage.setItem('chatverse-user-id', currentUser.id);
  
  // Update UI
  currentUsernameElement.textContent = nickname;
  usernameDisplay.classList.remove('hidden');
  coinDisplay.classList.remove('hidden');
  loginContainer.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  
  // Set up presence channel for online users
  setupPresenceChannel();
  
  // Load rooms
  loadRooms();
}

function generateUserId() {
  // Check if we have a stored ID
  const storedId = localStorage.getItem('chatverse-user-id');
  if (storedId) return storedId;
  
  // Generate a new random ID
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

async function setupPresenceChannel() {
  const presenceChannel = supabase.channel('online-users');

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const newState = presenceChannel.presenceState();
      updateOnlineUsers(newState);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Share presence information
        await presenceChannel.track({
          user_id: currentUser.id,
          nickname: currentUser.nickname,
          online_at: new Date().toISOString()
        });
      }
    });
}

function updateOnlineUsers(state) {
  onlineUsers = {};
  
  // Process presence state
  for (const key in state) {
    state[key].forEach(presence => {
      onlineUsers[presence.user_id] = presence;
    });
  }
  
  // Update UI
  renderOnlineUsers();
}

function renderOnlineUsers() {
  onlineUsersList.innerHTML = '';
  
  Object.values(onlineUsers).forEach(user => {
    const userItem = document.createElement('li');
    userItem.className = 'user-online';
    
    userItem.innerHTML = `
      <span class="online-indicator"></span>
      <span>${user.nickname}</span>
    `;
    
    onlineUsersList.appendChild(userItem);
  });
}

async function loadRooms() {
  try {
    // For simplicity, we're using a simple approach without actual room table
    // In real app, you would fetch rooms from a dedicated table
    
    // Mock room data for now
    rooms = [
      { id: 'general', name: 'General Chat' },
      { id: 'random', name: 'Random Talk' }
    ];
    
    renderRoomList();
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
}

function renderRoomList() {
  roomList.innerHTML = '';
  
  rooms.forEach(room => {
    const roomItem = document.createElement('li');
    roomItem.className = `room-item ${room.id === currentRoom?.id ? 'active-room' : ''}`;
    roomItem.textContent = room.name;
    
    roomItem.addEventListener('click', () => {
      joinRoom(room);
    });
    
    roomList.appendChild(roomItem);
  });
}

async function handleCreateRoom() {
  const roomName = newRoomNameInput.value.trim();
  if (!roomName) {
    alert('Please enter a room name');
    return;
  }
  
  const roomId = 'room_' + Math.random().toString(36).substr(2, 9);
  const newRoom = {
    id: roomId,
    name: roomName
  };
  
  // Add room to list
  rooms.push(newRoom);
  
  // Clear input and render updated room list
  newRoomNameInput.value = '';
  renderRoomList();
  
  // Join the newly created room
  joinRoom(newRoom);
}

async function joinRoom(room) {
  currentRoom = room;
  
  // Update UI
  renderRoomList();
  currentRoomHeader.innerHTML = `<h2 class="text-xl font-semibold">${room.name}</h2>`;
  
  // Enable message input
  messageInput.disabled = false;
  sendBtn.disabled = false;
  
  // Load messages for this room
  await loadMessages(room.id);
}

async function loadMessages(roomId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    renderMessages(data);
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

function renderMessages(messages) {
  messagesContainer.innerHTML = '';
  
  messages.forEach(msg => {
    renderSingleMessage(msg);
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderSingleMessage(message) {
  const isCurrentUser = message.is_user;
  const messageElement = document.createElement('div');
  
  messageElement.className = `message ${isCurrentUser ? 'user-message' : 'other-message'}`;
  
  // Format timestamp
  const timestamp = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageElement.innerHTML = `
    <div>${message.content}</div>
    <div class="message-time">${timestamp}</div>
  `;
  
  messagesContainer.appendChild(messageElement);
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function handleSendMessage(e) {
  e.preventDefault();
  
  const content = messageInput.value.trim();
  if (!content || !currentRoom) return;
  
  try {
    const message = {
      content,
      is_user: true,
    };
    
    // Add message to Supabase
    const { error } = await supabase
      .from('messages')
      .insert(message);
    
    if (error) throw error;
    
    // Clear input
    messageInput.value = '';
    
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message');
  }
}

function handleNewMessage(payload) {
  const newMessage = payload.new;
  renderSingleMessage(newMessage);
}

// Export necessary functions for potential use in other modules
export {
  init,
  currentUser,
  currentRoom
};