import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ConnectKitProvider, getDefaultConfig } from 'connectkit'

// Create config for ConnectKit
const config = createConfig(
  getDefaultConfig({
    // Your dApp's chains
    chains: [mainnet],
    // Configure RPC endpoints
    transports: {
      [mainnet.id]: http(),
    },
    walletConnectProjectId: import.meta.env.VITE_REOWN_PROJECT_ID,
    appName: 'Aztec Human Passport',
    appDescription: 'Aztec Human Passport',
    appUrl: window.location.origin,
    appIcon: window.location.origin + '/favicon.ico',
  }),
)

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          mode="dark"
          customTheme={{
            "--ck-connectbutton-background": "#3b82f6", 
            "--ck-connectbutton-hover-background": "#2563eb"
          }}
        >
          <App />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
