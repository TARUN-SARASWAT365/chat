import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import './Chat.css';

// Connect to your deployed backend
const socket = io('https://chatback-7.onrender.com');

const Chat = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const messagesEndRef = useRef(null);

  // Setup socket listeners
  useEffect(() => {
    if (!currentUser) return;

    socket.emit('user_connected', currentUser);

    socket.on('online_users', setOnlineUsers);

    socket.on('receive_message', msg => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('message_deleted', id => {
      setMessages(prev => prev.filter(m => m._id !== id));
    });

    socket.on('message_updated', updated => {
      setMessages(prev => prev.map(m => (m._id === updated._id ? updated : m)));
    });

    socket.on('typing', sender => {
      if (sender === selectedUser) {
        setTypingUser(sender);
        setTimeout(() => setTypingUser(null), 2000);
      }
    });

    socket.on('messages_seen', updatedMessages => {
      setMessages(updatedMessages);
    });

    return () => socket.disconnect();
  }, [currentUser, selectedUser]);

  // Fetch all users
  useEffect(() => {
    axios.get('https://chatback-7.onrender.com/users')
      .then(res => setUsers(res.data));
  }, []);

  // Fetch messages with selected user & mark seen
  useEffect(() => {
    if (!selectedUser) return;

    axios.get(`https://chatback-7.onrender.com/messages?sender=${currentUser}&receiver=${selectedUser}`)
      .then(res => {
        setMessages(res.data);

        // Mark messages as seen (notify backend)
        socket.emit('mark_seen', {
          sender: selectedUser,
          receiver: currentUser
        });
      });
  }, [selectedUser, currentUser]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending message
  const sendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    let content = newMessage;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await axios.post('https://chatback-7.onrender.com/upload', formData);
        content = res.data.url;
        setFile(null);
      } catch (error) {
        console.error('File upload error:', error);
        return;
      }
    }

    const msg = {
      sender: currentUser,
      receiver: selectedUser,
      content,
      timestamp: new Date()
    };

    socket.emit('send_message', msg);
    setNewMessage('');
  };

  // Handle typing event emit
  const handleInputChange = e => {
    setNewMessage(e.target.value);
    if (selectedUser) {
      socket.emit('typing', { sender: currentUser, receiver: selectedUser });
    }
  };

  // Handle file input change
  const handleFileChange = e => setFile(e.target.files[0]);

  return (
    <div className={`chat-container ${darkMode ? 'dark' : ''}`}>
      <div className={`sidebar ${selectedUser ? 'hide-on-mobile' : ''}`}>
        <h4>Users</h4>
        {users.map(u => (
          <div
            key={u.username}
            className={`user-item ${selectedUser === u.username ? 'active' : ''} ${onlineUsers.includes(u.username) ? 'online' : ''}`}
            onClick={() => setSelectedUser(u.username)}
          >
            <span className={`status-dot ${onlineUsers.includes(u.username) ? 'online' : ''}`}></span>
            {u.username}
          </div>
        ))}
        <button onClick={() => setDarkMode(!darkMode)}>Toggle Dark Mode</button>
      </div>

      {selectedUser && (
        <div className="chat-window">
          <div className="chat-header">
            <button className="back-btn" onClick={() => setSelectedUser(null)}><ArrowLeft size={20} /></button>
            {`Chat with ${selectedUser}`}
          </div>

          <div className="messages">
            {typingUser && <div className="typing-indicator">{typingUser} is typing...</div>}

            {messages.map(m => (
              <div key={m._id} className={`message ${m.sender === currentUser ? 'sent' : 'received'}`}>
                {m.content.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                  <div className="file-preview">
                    <img src={m.content} alt="sent file" />
                  </div>
                ) : (
                  <div className="msg-content">{m.content}</div>
                )}
                <div className="msg-time">{new Date(m.timestamp).toLocaleTimeString()}</div>

                {/* Show seen label for your sent messages */}
                {m.sender === currentUser && m.seen && (
                  <div className="seen-label">✓ Seen</div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input type="file" onChange={handleFileChange} />
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleInputChange}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
