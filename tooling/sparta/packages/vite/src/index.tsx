import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { createAppKit } from "@reown/appkit/react";
import { mainnet, sepolia, type AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

import "./index.css";
import PassportVerificationApp from "./components/PassportVerificationApp.jsx";

const queryClient = new QueryClient();

const projectId = "d037e9da5c5c9b24cfcd94c509d88dce";

const metadata = {
	name: "Human Passport Verification",
	description: "Verify your identity with Human Passport",
	url: window.location.origin,
	icons: [
		"https://github.com/gitcoinco/passport/blob/main/assets/humanbound-logo.png?raw=true",
	],
};

const networks: AppKitNetwork[] = [mainnet, sepolia];

const wagmiAdapter = new WagmiAdapter({
	networks,
	projectId,
	ssr: true,
});

createAppKit({
	adapters: [wagmiAdapter],
	networks: [mainnet, sepolia],
	defaultNetwork: mainnet,
	projectId,
	metadata,
	features: {
		analytics: true,
		socials: false,
		email: false,
	},
});

export function AppKitProvider({ children }: { children: React.ReactNode }) {
	return (
		<WagmiProvider config={wagmiAdapter.wagmiConfig as any}>
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		</WagmiProvider>
	);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<AppKitProvider>
		<PassportVerificationApp />
	</AppKitProvider>
);
