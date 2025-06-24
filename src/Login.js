import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (!BACKEND_URL) {
      console.error('❌ Backend URL is not defined.');
      setError('Backend is not configured.');
      return;
    }

    try {
      const res = await axios.post(`${BACKEND_URL}/api/users/login`, {
        username,
        password,
      });

      if (res.data?.username) {
        onLoginSuccess(res.data.username);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('🚫 Login error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button type="submit">Login</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}

export default Login;
