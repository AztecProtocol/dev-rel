import React, { useState, useEffect } from 'react'
import { StrictMode } from 'react'
import './index.css'
import { renderToString } from 'react-dom/server'
import App from './App'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ConnectKitProvider, getDefaultConfig } from 'connectkit'
import { ApiProvider } from './providers/apiProvider'

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
  }),
)

const queryClient = new QueryClient()

export function render(_url: string) {
  const html = renderToString(
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

              <ApiProvider>
                <App />
              </ApiProvider>,
            </ConnectKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </StrictMode>,
  )
  return { html }
}
