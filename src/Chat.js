import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './Chat.css';

const socket = io('http://localhost:5000');

const Chat = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('user_connected', currentUser);

    socket.on('online_users', users => setOnlineUsers(users));

    socket.on('receive_message', msg => {
      if (
        (msg.sender === currentUser && msg.receiver === selectedUser) ||
        (msg.sender === selectedUser && msg.receiver === currentUser)
      ) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => socket.off('receive_message');
  }, [currentUser, selectedUser]);

  useEffect(() => {
    // Load all users
    axios.get('http://localhost:5000/api/users')
      .then(res => setUsers(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    axios.get(`http://localhost:5000/api/messages?sender=${currentUser}&receiver=${selectedUser}`)
      .then(res => setMessages(res.data))
      .catch(console.error);
  }, [selectedUser, currentUser]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      sender: currentUser,
      receiver: selectedUser,
      content: newMessage.trim(),
      timestamp: new Date(),
    };
    socket.emit('send_message', msg);
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h3>Users</h3>
        {users.map(user => (
          <div
            key={user.username}
            className={`user-item ${user.username === selectedUser ? 'selected' : ''} ${onlineUsers.includes(user.username) ? 'online' : ''}`}
            onClick={() => setSelectedUser(user.username)}
          >
            {user.username}
            {onlineUsers.includes(user.username) && <span className="online-dot" />}
          </div>
        ))}
      </div>

      <div className="chat-window">
        {!selectedUser && <div className="welcome">Select a user to chat</div>}
        {selectedUser && (
          <>
            <div className="chat-header">Chat with {selectedUser}</div>
            <div className="messages">
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.sender === currentUser ? 'sent' : 'received'}`}>
                  <div>{m.content}</div>
                  <small>{new Date(m.timestamp).toLocaleTimeString()}</small>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="input-area">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
