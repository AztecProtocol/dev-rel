import { ConnectKitButton } from 'connectkit';
import React from 'react';

export const Button = ({ onClick, children, disabled } : { onClick: () => void, children: React.ReactNode, disabled?: boolean }) => {
  return (
    <button 
        onClick={onClick}
        className="px-6 py-2.5 rounded-lg font-medium transition-all bg-white/80 duration-300
          bg-gradient-purple shadow-md 
          hover:shadow-lg hover:scale-105 active:scale-100 text-gray-800"
      >
        {children}
      </button>
  );
}


export const StyledConnectButton = () => (
  <ConnectKitButton.Custom>
    {({ isConnected, show, truncatedAddress, ensName }) => (
      <Button onClick={show!}>{isConnected ? ensName ?? truncatedAddress : "Connect Wallet"}</Button>
    )}
  </ConnectKitButton.Custom>
);
