export type Role = {
	name: string;
	id: string;
};

/**
 * Moderator role definitions mapping role names to their Discord IDs
 */
export const MODERATOR_ROLES: Record<string, Role> = {
	AZTEC_LABS_TEAM: { name: "Aztec Labs Team", id: "1144693819015700620" },
	AZMOD: { name: "AzMod", id: "1362901049803018513" },
	ADMIN: { name: "Admin", id: "1146246812299165817" },
};

/**
 * Node operator role definitions mapping role names to their Discord IDs
 */
export const NODE_OPERATOR_ROLES: Record<string, Role> = {
	APPRENTICE: { name: "Apprentice", id: "1366916508072148992" },
};

/**
 * Developer role definitions mapping role names to their Discord IDs
 */
export const DEVELOPER_ROLES: Record<string, Role> = {
	DEVELOPER: { name: "Developer", id: "1367015094638346271" },
};

/**
 * User role definitions mapping role names to their Discord IDs
 */
export const USER_ROLES: Record<string, Role> = {
	VERIFIED_PLUS: { name: "Verified+", id: "1364982673604345886" },
};
