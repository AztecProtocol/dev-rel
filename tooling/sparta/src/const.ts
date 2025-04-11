export const ADDRESSES_PER_PAGE = 20;

export enum AdminSubcommandGroups {
	Admin = "admin",
}

export enum AdminSubcommands {
	Get = "get",
	Committee = "committee",
	Validators = "validators",
	Remove = "remove",
	Fund = "fund",
}

export enum NodeOperatorSubcommandGroups {
	Operator = "operator",
}

export enum NodeOperatorSubcommands {
	ChainInfo = "chain-info",
}

export enum ValidatorSubcommandGroups {
	Validator = "validator",
}

export enum ValidatorSubcommands {
	Check = "check",
}

export enum NodeOperatorRoles {
	Guardian = "Guardian", // lowest level, requires minimum score of 0
	Defender = "Defender", // mid level, requires over 5
	Sentinel = "Sentinel", // set manually, but can be removed by this service
}
