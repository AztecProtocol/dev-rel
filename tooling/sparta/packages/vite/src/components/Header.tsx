import React, { useState } from 'react';
import { StyledConnectButton } from './button';
import { Link } from 'react-router-dom';

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Header - Hidden on mobile */}
      <header className="fixed top-0 left-0 right-0 p-4 z-50 hidden md:block">
        <div className="container mx-auto flex justify-between items-center">
          <StyledConnectButton />
        </div>
      </header>

      {/* Mobile Hamburger Button - Shown only on mobile */}
      <header className="fixed top-0 left-0 right-0 p-4 z-50 flex md:hidden justify-end">
         <StyledConnectButton />
      </header>
    </>
  );
}

export default Header; 
