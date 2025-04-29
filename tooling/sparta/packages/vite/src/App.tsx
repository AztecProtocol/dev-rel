import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import Header from './components/Header.tsx';
import LandingPage from './pages/LandingPage.tsx';
import PowPage from './pages/PowPage.tsx';
import React from 'react';


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-linear-to-lavender text-gray-800 flex flex-col relative fade-in">
        {/* Header is always visible */}
        <Header />
        
        <main className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="w-full">
            <Routes>
              {/* Root route with query parameter for verificationId */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Other routes */}
              <Route path="/pow" element={
                <PowPage />
              } />
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
