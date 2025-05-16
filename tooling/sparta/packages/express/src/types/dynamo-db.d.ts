import type { User } from "../routes/users/users";

// Extend the DynamoDBService type from @sparta/utils
declare module "@sparta/utils/dynamo-db" {
	export default interface DynamoDBService {
		// User operations
		getUser(discordUserId: string): Promise<User | null>;
		getUserByWalletAddress(walletAddress: string): Promise<User | null>;
		getAllUsers(): Promise<User[]>;
		createUser(user: User): Promise<boolean>;
		updateUser(
			discordUserId: string,
			updates: Partial<User>
		): Promise<boolean>;
		deleteUser(discordUserId: string): Promise<boolean>;
	}
}
