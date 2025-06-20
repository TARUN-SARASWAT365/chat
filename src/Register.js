import React, { useState } from 'react';
import axios from 'axios';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '' });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://192.168.1.19:5000/register', form);
      alert('Registered successfully');
    } catch (err) {
      if (err.response && err.response.data) {
        alert(err.response.data.error);
      } else {
        alert('Server not responding');
      }
    }
  };

  return (
    <form onSubmit={submit}>
      <h2>Register</h2>
      <input placeholder="Username" onChange={e => setForm({ ...form, username: e.target.value })} />
      <input placeholder="Password" type="password" onChange={e => setForm({ ...form, password: e.target.value })} />
      <button type="submit">Register</button>
    </form>
  );
}
