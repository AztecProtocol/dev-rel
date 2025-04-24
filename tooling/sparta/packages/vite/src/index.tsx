import React from "react";
import ReactDOM from "react-dom/client";
// import App from './App'; // App component doesn't exist
import PassportVerificationApp from './components/PassportVerificationApp'; // Import the correct component
import './index.css';
import { WagmiProvider } from 'wagmi'; // Import WagmiProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import QueryClient things
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { http, createConfig } from 'wagmi'; // Import necessary Wagmi config functions
import { sepolia as wagmiSepolia } from 'wagmi/chains'; // Import the chain definition for wagmi config

import { createAppKit } from "@reown/appkit/react";
import {
	// anvil, // Unused
	// type AppKitNetwork, // Unused
	// holesky, // Unused
	// mainnet, // Unused
	sepolia,
} from "@reown/appkit/networks";

// Ensure environment variables are handled correctly, maybe access them here
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID; // Use import.meta.env
if (!projectId) { // Add check for undefined projectId
	throw new Error("VITE_REOWN_PROJECT_ID is not set in the environment variables. Please check your .env file.");
}
// const projectId = process.env.VITE_REOWN_PROJECT_ID; // Placeholder if import.meta.env doesn't work

const metadata = {
	name: "Sparta Passport",
	description: "Sparta Human Passport Verification",
	url: "https://sparta.xyz", // Replace with your dApp URL
	icons: ["https://sparta.xyz/icon.png"], // Replace with your dApp icon URL
};

// Create wagmi config
const wagmiConfig = createConfig({ // Uncomment wagmiConfig creation
	chains: [wagmiSepolia],
	transports: {
		[wagmiSepolia.id]: http(),
	},
});

// Initialize WagmiAdapter with projectId and networks
const wagmiAdapter = new WagmiAdapter({
	networks: [sepolia], // Pass the viem/appkit network definition
	projectId,
	// ssr: true // Add if needed for server-side rendering setup
});

// Create the AppKit instance (modal)
// We still need to call createAppKit to initialize the modal UI etc.
// const _appKit = // Remove this if appKit instance isn't used directly
createAppKit({
	adapters: [wagmiAdapter],
	networks: [sepolia], // Pass networks here too for AppKit UI
	projectId,
	metadata,
	// Other options like walletConnectOptions, etc.
});

// Create a QueryClient instance
const queryClient = new QueryClient();

// Assuming PassportVerificationApp uses the AppKitProvider internally or we wrap it here
ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<WagmiProvider config={wagmiConfig}>
			<QueryClientProvider client={queryClient}>
				<PassportVerificationApp />
			</QueryClientProvider>
		</WagmiProvider>
	</React.StrictMode>,
);
