import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './Chat.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const socket = io(BACKEND_URL);

const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '👏'];

const Chat = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReactionsFor, setShowReactionsFor] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set()); // Added typing indicator state
  const [loadingMessages, setLoadingMessages] = useState(false); // Loading state for messages
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    socket.emit('user_connected', currentUser);

    socket.on('online_users', users => setOnlineUsers(users));

    socket.on('receive_message', msg => {
      if (
        (msg.sender === currentUser && msg.receiver === selectedUser) ||
        (msg.sender === selectedUser && msg.receiver === currentUser)
      ) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
    });

    socket.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    // Typing indicator events
    socket.on('user_typing', ({ sender, receiver }) => {
      if (receiver === currentUser && sender === selectedUser) {
        setTypingUsers(prev => new Set(prev).add(sender));
        // Remove typing indicator after 3 seconds of no update
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(sender);
            return newSet;
          });
        }, 3000);
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('reaction_updated');
      socket.off('user_typing');
    };
  }, [currentUser, selectedUser]);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/users`)
      .then(res => setUsers(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    setLoadingMessages(true);

    axios.get(`${BACKEND_URL}/api/messages?sender=${currentUser}&receiver=${selectedUser}`)
      .then(res => {
        setMessages(res.data);
        setLoadingMessages(false);
        scrollToBottom();
      })
      .catch(err => {
        console.error(err);
        setLoadingMessages(false);
      });
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
    scrollToBottom();
  };

  const toggleReaction = (messageId, reaction) => {
    setShowReactionsFor(null);
    socket.emit('toggle_reaction', { messageId, user: currentUser, reaction });
  };

  const userHasReacted = (message, reaction) =>
    message.reactions?.some(r => r.user === currentUser && r.reaction === reaction);

  // Notify backend & other user when currentUser is typing
  const handleTyping = e => {
    setNewMessage(e.target.value);
    socket.emit('user_typing', { sender: currentUser, receiver: selectedUser });
  };

  // Delete message function
  const deleteMessage = async (messageId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m._id !== messageId));
      socket.emit('message_deleted', { messageId }); // optionally notify others
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  // Show loading indicator when messages load
  const LoadingIndicator = () => <div className="loading">Loading messages...</div>;

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
            
            {loadingMessages && <LoadingIndicator />}

            <div className="messages">
              {messages.map(m => (
                <div
                  key={m._id || m.timestamp}
                  className={`message ${m.sender === currentUser ? 'sent' : 'received'}`}
                  onClick={() =>
                    setShowReactionsFor(showReactionsFor === m._id ? null : m._id)
                  }
                >
                  <div>
                    {m.content}
                    {m.seen && m.sender === currentUser && <span className="seen-status">✓✓</span>}
                  </div>
                  <small>{new Date(m.timestamp).toLocaleTimeString()}</small>

                  {/* Delete button only for user's own messages */}
                  {m.sender === currentUser && (
                    <button 
                      className="delete-btn"
                      onClick={e => {
                        e.stopPropagation();
                        deleteMessage(m._id);
                      }}
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  )}

                  {showReactionsFor === m._id && (
                    <div className="reactions">
                      {reactionsList.map(reaction => (
                        <button
                          key={reaction}
                          className={`reaction-btn ${userHasReacted(m, reaction) ? 'reacted' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
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

            {/* Typing indicator */}
            <div className="typing-indicator">
              {typingUsers.has(selectedUser) && <em>{selectedUser} is typing...</em>}
            </div>

            <div className="input-area">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                disabled={!selectedUser}
              />
              <button onClick={sendMessage} disabled={!selectedUser || !newMessage.trim()}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
