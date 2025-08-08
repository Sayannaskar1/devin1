// frontend/src/App.jsx
import React from 'react'
import AppRoutes from './routes/AppRoutes'
import { UserProvider } from './context/user.context'
import './index.css'; // Ensure Tailwind CSS is imported

function App() { // Define App as a function component
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  )
}

export default App // Export App as the default export
