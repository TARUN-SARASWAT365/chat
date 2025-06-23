import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './Chat.css';

const socket = io('http://localhost:5000');

const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '👏'];

const Chat = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReactionsFor, setShowReactionsFor] = useState(null); // track which message's reactions are shown
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

    socket.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    return () => {
      socket.off('receive_message');
      socket.off('reaction_updated');
    };
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

  const toggleReaction = (messageId, reaction) => {
    // If this message's reactions are not showing, show them (optional)
    setShowReactionsFor(null); // Hide reaction panel after click

    socket.emit('toggle_reaction', { messageId, user: currentUser, reaction });
  };

  const userHasReacted = (message, reaction) =>
    message.reactions?.some(r => r.user === currentUser && r.reaction === reaction);

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
              {messages.map(m => (
                <div
                  key={m._id || m.timestamp} 
                  className={`message ${m.sender === currentUser ? 'sent' : 'received'}`}
                  onClick={() =>
                    setShowReactionsFor(showReactionsFor === m._id ? null : m._id)
                  }
                >
                  <div>{m.content}</div>
                  <small>{new Date(m.timestamp).toLocaleTimeString()}</small>

                  {/* Reaction icons only show if this message is selected */}
                  {showReactionsFor === m._id && (
                    <div className="reactions">
                      {reactionsList.map(reaction => (
                        <button
                          key={reaction}
                          className={`reaction-btn ${userHasReacted(m, reaction) ? 'reacted' : ''}`}
                          onClick={e => {
                            e.stopPropagation(); // prevent toggling again
                            toggleReaction(m._id, reaction);
                          }}
                        >
                          {reaction}
                        </button>
                      ))}
                    </div>
                  )}
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
