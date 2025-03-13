export const validateAddress = (address: string) => {
	if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
		return "Please provide a valid Ethereum address.";
	}
};
