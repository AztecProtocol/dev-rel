import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { ApiProvider } from "./providers/apiProvider";

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
		appName: "Aztec Human Passport",
		appDescription: "Aztec Human Passport",
	})
);

const queryClient = new QueryClient();

// Find the root element
const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Could not find root element to mount to!");
}

// Create a root and render the app
const root = ReactDOM.createRoot(rootElement);
root.render(
	<StrictMode>
		<ApiProvider>
			<WagmiProvider config={config}>
				<QueryClientProvider client={queryClient}>
					<ConnectKitProvider
						mode="dark"
						customTheme={{
							"--ck-connectbutton-background": "#3b82f6",
							"--ck-connectbutton-hover-background": "#2563eb",
						}}
					>
						<App />
					</ConnectKitProvider>
				</QueryClientProvider>
			</WagmiProvider>
		</ApiProvider>
	</StrictMode>
);
