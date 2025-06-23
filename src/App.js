import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import Chat from './Chat';

function App() {
  const [user, setUser] = useState(null);

  return !user ? (
    <>
      <Register />
      <Login onLoginSuccess={setUser} />
    </>
  ) : (
    <Chat currentUser={user} />
  );
}

export default App;
