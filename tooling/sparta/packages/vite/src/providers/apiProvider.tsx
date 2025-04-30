import React, { type ReactNode, useState, useEffect, useRef } from "react";
// import { configuredClientPromise } from "../api/axios"; // Old name
import { clientPromise } from "../api/axios"; // Use the correct promise name again
import { ApiContext } from "../contexts/apiContext";
import type { Client as ApiClient } from "@sparta/utils/openapi/types";

export const ApiProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const isServer = typeof window === "undefined";
	// const [client, setClient] = useState<ApiClient | null>(null); // Remove client state
	const [isLoading, setIsLoading] = useState(true); // Start loading
	const [error, setError] = useState<Error | null>(null);
	const clientRef = useRef<ApiClient | null>(null); // Use ref to hold the client

	useEffect(() => {
		let didCancel = false;
		if (!isServer) {
			// console.log("ApiProvider: Initializing client via promise..."); // Removed log
			clientPromise
				.then((initializedClient: ApiClient) => {
					if (!didCancel) {
						// console.log("ApiProvider: Promise resolved, storing client in ref:", initializedClient); // Removed log
						clientRef.current = initializedClient;
						setIsLoading(false);
						setError(null);
					}
				})
				.catch((err: unknown) => {
					if (!didCancel) {
						console.error(
							"ApiProvider: Client Promise Initialization Error:",
							err
						); // Keep error log
						setError(
							err instanceof Error ? err : new Error(String(err))
						);
						setIsLoading(false);
					}
				});
		}

		// Cleanup function
		return () => {
			didCancel = true;
		};
	}, [isServer]); // Run only once on the client

	// If there was an error during initialization
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen text-red-600">
				<p>API Initialization Error: {error.message}</p>
			</div>
		);
	}

	// Show loading state while the promise is resolving
	if (isLoading && !isServer) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p>Initializing API Client…</p>
			</div>
		);
	}

	// Render children only after successful initialization, providing the resolved client from the ref
	// Ensure clientRef.current is not null before rendering provider
	if (!isLoading && !error && clientRef.current) {
		return (
			<ApiContext.Provider value={clientRef.current}>
				{children}
			</ApiContext.Provider>
		);
	}

	// Fallback case (should ideally not be reached on client after loading/error state)
	// On server-side, or if something unexpected happens, render children without context or show error/loading
	if (isServer) {
		return <>{children}</>; // Or provide null context if needed server-side
	}

	return (
		<div className="flex items-center justify-center min-h-screen text-gray-500">
			<p>Unexpected state in ApiProvider.</p>
		</div>
	);
};
