import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios'; 

declare namespace Components {
    namespace Schemas {
        export interface Error {
            /**
             * example:
             * false
             */
            success: boolean;
            /**
             * Error message describing the issue.
             */
            error: string;
        }
        export interface ErrorResponse {
            /**
             * Always false for error responses
             * example:
             * false
             */
            success: boolean;
            /**
             * Error message describing what went wrong
             * example:
             * Failed to retrieve rollup status
             */
            error: string;
        }
        export interface EthereumResponse {
            /**
             * Indicates if the request was successful
             * example:
             * true
             */
            success: boolean;
            /**
             * Array of data returned from the endpoint
             * example:
             * [
             *   "0x1234567890abcdef1234567890abcdef12345678",
             *   "0xabcdef1234567890abcdef1234567890abcdef12"
             * ]
             */
            data: string[];
        }
        export interface HumanPassport {
            /**
             * Current status of verification (e.g., pending_signature, verification_complete)
             */
            status?: string;
            /**
             * Passport score if verification completed
             */
            score?: number | null;
            /**
             * Timestamp (ms) when verification was last completed
             */
            lastVerificationTime?: number | null; // int64
            /**
             * ID used for the verification process
             */
            verificationId?: string | null;
            /**
             * Discord interaction token for UI updates
             */
            interactionToken?: string | null;
        }
        export interface NodeOperator {
            /**
             * The Discord user ID of the node operator.
             * example:
             * 123456789012345678
             */
            discordId: string;
            /**
             * The Ethereum wallet address associated with the node operator.
             * example:
             * 0x1234567890abcdef1234567890abcdef12345678
             */
            walletAddress: string;
            /**
             * Timestamp (milliseconds since epoch) when the operator was created.
             * example:
             * 1678886400000
             */
            createdAt: number;
            /**
             * Timestamp (milliseconds since epoch) when the operator was last updated.
             * example:
             * 1678887400000
             */
            updatedAt: number;
        }
        export interface OperatorError {
            /**
             * Error message describing the issue.
             */
            error?: string;
        }
        export interface OperatorInput {
            /**
             * The Discord user ID.
             */
            discordId: string;
            /**
             * The Ethereum wallet address.
             * example:
             * 0x1234567890abcdef1234567890abcdef12345678
             */
            walletAddress: string;
        }
        export interface OperatorUpdateInput {
            /**
             * The new Ethereum wallet address.
             * example:
             * 0xabcdef1234567890abcdef1234567890abcdef12
             */
            walletAddress: string;
        }
        export interface RollupStatusResponse {
            /**
             * Indicates if the request was successful
             * example:
             * true
             */
            success: boolean;
            data: {
                /**
                 * Current pending block number
                 * example:
                 * 123456
                 */
                pendingBlockNum?: string;
                /**
                 * Current proven block number
                 * example:
                 * 123450
                 */
                provenBlockNum?: string;
                /**
                 * List of validator addresses
                 */
                validators?: string[];
                /**
                 * List of forwarded validator addresses
                 */
                forwardedValidators?: string[];
                /**
                 * Current committee members
                 */
                committee?: string[];
                /**
                 * Forwarded committee members
                 */
                forwardedCommittee?: string[];
                /**
                 * Archive node addresses
                 */
                archive?: string[];
                /**
                 * Current epoch number
                 * example:
                 * 42
                 */
                currentEpoch?: string;
                /**
                 * Current slot number
                 * example:
                 * 1024
                 */
                currentSlot?: string;
                /**
                 * Current proposer address
                 * example:
                 * 0x1234567890abcdef1234567890abcdef12345678
                 */
                proposerNow?: string;
            };
        }
        export interface ScoreResponse {
            /**
             * True if the score is sufficient, false otherwise.
             */
            success: boolean;
            /**
             * The fetched Gitcoin Passport score.
             */
            score: number;
            /**
             * Status indicating score sufficiency (e.g., score_sufficient, verification_failed).
             */
            status: string;
            /**
             * The minimum score required.
             */
            minimumScore: number;
        }
        export interface User {
            /**
             * Discord user ID (Primary Key)
             */
            discordUserId: string;
            /**
             * Discord username
             */
            discordUsername: string;
            /**
             * Ethereum address (verified through passport)
             */
            walletAddress?: string | null;
            /**
             * User role within the system
             */
            role?: string | null;
            humanPassport?: HumanPassport;
            /**
             * Timestamp when user was created
             */
            createdAt: number; // int64
            /**
             * Timestamp when user was last updated
             */
            updatedAt: number; // int64
        }
        export interface VerificationStatusResponse {
            /**
             * example:
             * true
             */
            success: boolean;
            /**
             * The verification ID associated with this status check.
             */
            verificationId: string;
            /**
             * Whether a wallet address is associated with this verification.
             */
            walletConnected: boolean;
            /**
             * Whether the verification process was successfully completed (met score threshold).
             */
            verified: boolean;
            /**
             * Whether the Discord role was assigned.
             */
            roleAssigned: boolean;
            /**
             * The user's score, if verification was attempted.
             */
            score?: number | null;
            /**
             * The current status of the verification process (e.g., pending_signature, verification_complete).
             */
            status: string;
            /**
             * The minimum score required for verification.
             */
            minimumRequiredScore: number;
            /**
             * The timestamp when this status check was performed.
             */
            lastChecked: string; // date-time
        }
        export interface VerifyResponse {
            /**
             * example:
             * true
             */
            success: boolean;
            /**
             * Whether the overall verification (score + role assignment) was successful.
             */
            verified: boolean;
            /**
             * The user's Gitcoin Passport score.
             */
            score: number;
            /**
             * Whether the Discord role was successfully assigned/updated.
             */
            roleAssigned: boolean;
            /**
             * The wallet address recovered from the signature.
             */
            address: string;
            /**
             * Final status of the verification process (e.g., verification_complete, verification_failed).
             */
            status: string;
            /**
             * A user-friendly message summarizing the result.
             */
            message: string;
            /**
             * The minimum score required for verification.
             */
            minimumRequiredScore: number;
        }
    }
}
declare namespace Paths {
    namespace CreateOperator {
        export type RequestBody = Components.Schemas.OperatorInput;
        namespace Responses {
            export type $201 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $409 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace CreateUser {
        export interface RequestBody {
            /**
             * Discord user ID
             */
            discordUserId: string;
            /**
             * Discord username
             */
            discordUsername: string;
            /**
             * Ethereum wallet address
             */
            walletAddress?: string;
            /**
             * User role
             */
            role?: string;
            /**
             * Human passport verification data
             */
            humanPassport?: {
                [key: string]: any;
            };
        }
        namespace Responses {
            export interface $201 {
            }
            export interface $400 {
            }
            export interface $401 {
            }
            export interface $500 {
            }
        }
    }
    namespace DeleteOperatorByDiscordId {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface PathParameters {
            discordId: Parameters.DiscordId;
        }
        namespace Responses {
            export interface $204 {
            }
            export type $400 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace DeleteUserByDiscordId {
        namespace Parameters {
            export type DiscordUserId = string;
        }
        export interface PathParameters {
            discordUserId: Parameters.DiscordUserId;
        }
        namespace Responses {
            export interface $200 {
            }
            export interface $401 {
            }
            export interface $404 {
            }
            export interface $500 {
            }
        }
    }
    namespace GetAllOperators {
        namespace Responses {
            export type $200 = Components.Schemas.NodeOperator[];
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetAllUsers {
        namespace Responses {
            export interface $200 {
                /**
                 * Success status
                 */
                success?: boolean;
                users?: Components.Schemas.User[];
            }
            export type $401 = Components.Schemas.Error;
            export type $500 = Components.Schemas.Error;
        }
    }
    namespace GetAllValidators {
        namespace Responses {
            export type $200 = Components.Schemas.EthereumResponse;
            export type $500 = Components.Schemas.ErrorResponse;
        }
    }
    namespace GetCurrentEpochCommittee {
        namespace Responses {
            export type $200 = Components.Schemas.EthereumResponse;
            export type $500 = Components.Schemas.ErrorResponse;
        }
    }
    namespace GetOperatorByAddress {
        namespace Parameters {
            export type Address = string;
        }
        export interface PathParameters {
            address: Parameters.Address;
        }
        namespace Responses {
            export type $200 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetOperatorByDiscordId {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface PathParameters {
            discordId: Parameters.DiscordId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetRollupStatus {
        namespace Responses {
            export type $200 = Components.Schemas.RollupStatusResponse;
            export type $500 = Components.Schemas.ErrorResponse;
        }
    }
    namespace GetScore {
        namespace Parameters {
            export type Address = string;
            export type VerificationId = string;
        }
        export interface QueryParameters {
            verificationId: Parameters.VerificationId;
            address: Parameters.Address;
        }
        namespace Responses {
            export type $200 = Components.Schemas.ScoreResponse;
            export type $400 = Components.Schemas.Error;
            export type $404 = Components.Schemas.Error;
            export type $500 = Components.Schemas.Error;
        }
    }
    namespace GetStatusByDiscordId {
        namespace Parameters {
            export type DiscordUserId = string;
        }
        export interface PathParameters {
            discordUserId: Parameters.DiscordUserId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.VerificationStatusResponse;
            export type $404 = Components.Schemas.Error;
            export type $500 = Components.Schemas.Error;
        }
    }
    namespace GetStatusByVerificationId {
        namespace Parameters {
            export type VerificationId = string;
        }
        export interface PathParameters {
            verificationId: Parameters.VerificationId;
        }
        namespace Responses {
            export type $200 = Components.Schemas.VerificationStatusResponse;
            export type $404 = Components.Schemas.Error;
            export type $500 = Components.Schemas.Error;
        }
    }
    namespace GetUserByDiscordId {
        namespace Parameters {
            export type DiscordUserId = string;
        }
        export interface PathParameters {
            discordUserId: Parameters.DiscordUserId;
        }
        namespace Responses {
            export interface $200 {
                /**
                 * Success status
                 */
                success?: boolean;
                user?: Components.Schemas.User;
            }
            export type $401 = Components.Schemas.Error;
            export type $404 = Components.Schemas.Error;
            export type $500 = Components.Schemas.Error;
        }
    }
    namespace GetUserByVerificationId {
        namespace Parameters {
            export type VerificationId = string;
        }
        export interface PathParameters {
            verificationId: Parameters.VerificationId;
        }
        namespace Responses {
            export interface $200 {
                /**
                 * Success status
                 */
                success?: boolean;
                user?: Components.Schemas.User;
            }
            export type $400 = Components.Schemas.Error;
            export type $401 = Components.Schemas.Error;
            export type $404 = Components.Schemas.Error;
            export type $500 = Components.Schemas.Error;
        }
    }
    namespace GetUserByWalletAddress {
        namespace Parameters {
            export type WalletAddress = string;
        }
        export interface PathParameters {
            walletAddress: Parameters.WalletAddress;
        }
        namespace Responses {
            export interface $200 {
                /**
                 * Success status
                 */
                success?: boolean;
                /**
                 * Whether the wallet is registered
                 */
                isRegistered?: boolean;
                /**
                 * Informational message
                 */
                message?: string;
                user?: Components.Schemas.User;
            }
            export type $400 = Components.Schemas.Error;
            export type $401 = Components.Schemas.Error;
            export type $500 = Components.Schemas.Error;
        }
    }
    namespace UpdateOperatorWallet {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface PathParameters {
            discordId: Parameters.DiscordId;
        }
        export type RequestBody = Components.Schemas.OperatorUpdateInput;
        namespace Responses {
            export type $200 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace UpdateUserByDiscordId {
        namespace Parameters {
            export type DiscordUserId = string;
        }
        export interface PathParameters {
            discordUserId: Parameters.DiscordUserId;
        }
        export interface RequestBody {
            /**
             * Discord username
             */
            discordUsername?: string;
            /**
             * Ethereum wallet address
             */
            walletAddress?: string;
            /**
             * User role
             */
            role?: string;
            /**
             * Human passport verification data
             */
            humanPassport?: {
                [key: string]: any;
            };
        }
        namespace Responses {
            export interface $200 {
            }
            export interface $400 {
            }
            export interface $401 {
            }
            export interface $404 {
            }
            export interface $500 {
            }
        }
    }
    namespace VerifySignature {
        namespace Parameters {
            export type VerificationId = string;
        }
        export interface QueryParameters {
            verificationId?: Parameters.VerificationId;
        }
        export interface RequestBody {
            /**
             * Wallet signature
             */
            signature: string;
            /**
             * The verification ID (if not provided in query)
             */
            verificationId?: string;
        }
        namespace Responses {
            export type $200 = Components.Schemas.VerifyResponse;
            export type $400 = Components.Schemas.Error;
            export type $404 = Components.Schemas.Error;
            export type $500 = Components.Schemas.Error;
        }
    }
}

export interface OperationMethods {
  /**
   * getCurrentEpochCommittee - Get current epoch committee
   * 
   * Retrieves the list of committee members for the current epoch
   */
  'getCurrentEpochCommittee'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetCurrentEpochCommittee.Responses.$200>
  /**
   * getAllValidators - Get all validators
   * 
   * Retrieves the list of all attesters (validators) in the rollup system
   */
  'getAllValidators'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAllValidators.Responses.$200>
  /**
   * getRollupStatus - Get comprehensive rollup status
   * 
   * Retrieves complete information about the rollup's current state including block numbers, validators, committee members, and other chain data
   */
  'getRollupStatus'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetRollupStatus.Responses.$200>
  /**
   * verifySignature - Verify a wallet signature
   * 
   * Verify a wallet signature and process Passport verification
   */
  'verifySignature'(
    parameters?: Parameters<Paths.VerifySignature.QueryParameters> | null,
    data?: Paths.VerifySignature.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.VerifySignature.Responses.$200>
  /**
   * getStatusByDiscordId - Check verification status by Discord user ID
   * 
   * Check the human verification status of a user by their Discord ID
   */
  'getStatusByDiscordId'(
    parameters: Parameters<Paths.GetStatusByDiscordId.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetStatusByDiscordId.Responses.$200>
  /**
   * getStatusByVerificationId - Check verification status by verification ID
   * 
   * Check the human verification status of a user by their verification ID
   */
  'getStatusByVerificationId'(
    parameters: Parameters<Paths.GetStatusByVerificationId.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetStatusByVerificationId.Responses.$200>
  /**
   * getScore - Get passport score for a given address and verification
   * 
   * Fetches the Gitcoin Passport score for the wallet address associated with a verification ID
   */
  'getScore'(
    parameters?: Parameters<Paths.GetScore.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetScore.Responses.$200>
  /**
   * getAllOperators - Get all node operators
   * 
   * Retrieves a list of all registered node operators.
   */
  'getAllOperators'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAllOperators.Responses.$200>
  /**
   * createOperator - Create a new node operator
   * 
   * Registers a new node operator with their Discord ID and wallet address.
   */
  'createOperator'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.CreateOperator.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateOperator.Responses.$201>
  /**
   * getOperatorByDiscordId - Get operator by Discord ID
   * 
   * Retrieves a specific node operator using their Discord ID.
   */
  'getOperatorByDiscordId'(
    parameters: Parameters<Paths.GetOperatorByDiscordId.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetOperatorByDiscordId.Responses.$200>
  /**
   * getOperatorByAddress - Get operator by wallet address
   * 
   * Retrieves a specific node operator using their wallet address.
   */
  'getOperatorByAddress'(
    parameters: Parameters<Paths.GetOperatorByAddress.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetOperatorByAddress.Responses.$200>
  /**
   * updateOperatorWallet - Update operator's wallet address
   * 
   * Updates the wallet address for a specific node operator using their Discord ID.
   */
  'updateOperatorWallet'(
    parameters: Parameters<Paths.UpdateOperatorWallet.PathParameters>,
    data?: Paths.UpdateOperatorWallet.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateOperatorWallet.Responses.$200>
  /**
   * deleteOperatorByDiscordId - Delete an operator by Discord ID
   * 
   * Removes a node operator registration using their Discord ID.
   */
  'deleteOperatorByDiscordId'(
    parameters: Parameters<Paths.DeleteOperatorByDiscordId.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteOperatorByDiscordId.Responses.$204>
  /**
   * getAllUsers - Get all users
   * 
   * Retrieve a list of all users
   */
  'getAllUsers'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAllUsers.Responses.$200>
  /**
   * createUser - Create a new user
   * 
   * Create a new user profile
   */
  'createUser'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: Paths.CreateUser.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateUser.Responses.$201>
  /**
   * getUserByDiscordId - Get a specific user by Discord user ID
   * 
   * Retrieve a user by their Discord user ID
   */
  'getUserByDiscordId'(
    parameters: Parameters<Paths.GetUserByDiscordId.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetUserByDiscordId.Responses.$200>
  /**
   * updateUserByDiscordId - Update a user by Discord user ID
   * 
   * Update an existing user's information
   */
  'updateUserByDiscordId'(
    parameters: Parameters<Paths.UpdateUserByDiscordId.PathParameters>,
    data?: Paths.UpdateUserByDiscordId.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateUserByDiscordId.Responses.$200>
  /**
   * deleteUserByDiscordId - Delete a user by Discord user ID
   * 
   * Delete a user by their Discord user ID
   */
  'deleteUserByDiscordId'(
    parameters: Parameters<Paths.DeleteUserByDiscordId.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteUserByDiscordId.Responses.$200>
  /**
   * getUserByWalletAddress - Get a user by wallet address
   * 
   * Retrieve a user by their Ethereum wallet address
   */
  'getUserByWalletAddress'(
    parameters: Parameters<Paths.GetUserByWalletAddress.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetUserByWalletAddress.Responses.$200>
  /**
   * getUserByVerificationId - Get a user by verification ID
   * 
   * Retrieve a user by their Human Passport verification ID
   */
  'getUserByVerificationId'(
    parameters: Parameters<Paths.GetUserByVerificationId.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetUserByVerificationId.Responses.$200>
}

export interface PathsDictionary {
  ['/api/ethereum/rollup/committee']: {
    /**
     * getCurrentEpochCommittee - Get current epoch committee
     * 
     * Retrieves the list of committee members for the current epoch
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetCurrentEpochCommittee.Responses.$200>
  }
  ['/api/ethereum/rollup/validators']: {
    /**
     * getAllValidators - Get all validators
     * 
     * Retrieves the list of all attesters (validators) in the rollup system
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAllValidators.Responses.$200>
  }
  ['/api/ethereum/rollup/status']: {
    /**
     * getRollupStatus - Get comprehensive rollup status
     * 
     * Retrieves complete information about the rollup's current state including block numbers, validators, committee members, and other chain data
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetRollupStatus.Responses.$200>
  }
  ['/api/human/verify']: {
    /**
     * verifySignature - Verify a wallet signature
     * 
     * Verify a wallet signature and process Passport verification
     */
    'post'(
      parameters?: Parameters<Paths.VerifySignature.QueryParameters> | null,
      data?: Paths.VerifySignature.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.VerifySignature.Responses.$200>
  }
  ['/api/human/status/discord/{discordUserId}']: {
    /**
     * getStatusByDiscordId - Check verification status by Discord user ID
     * 
     * Check the human verification status of a user by their Discord ID
     */
    'get'(
      parameters: Parameters<Paths.GetStatusByDiscordId.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetStatusByDiscordId.Responses.$200>
  }
  ['/api/human/status/verification/{verificationId}']: {
    /**
     * getStatusByVerificationId - Check verification status by verification ID
     * 
     * Check the human verification status of a user by their verification ID
     */
    'get'(
      parameters: Parameters<Paths.GetStatusByVerificationId.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetStatusByVerificationId.Responses.$200>
  }
  ['/api/human/score']: {
    /**
     * getScore - Get passport score for a given address and verification
     * 
     * Fetches the Gitcoin Passport score for the wallet address associated with a verification ID
     */
    'get'(
      parameters?: Parameters<Paths.GetScore.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetScore.Responses.$200>
  }
  ['/api/operator']: {
    /**
     * getAllOperators - Get all node operators
     * 
     * Retrieves a list of all registered node operators.
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAllOperators.Responses.$200>
    /**
     * createOperator - Create a new node operator
     * 
     * Registers a new node operator with their Discord ID and wallet address.
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.CreateOperator.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateOperator.Responses.$201>
  }
  ['/api/operator/discord/{discordId}']: {
    /**
     * getOperatorByDiscordId - Get operator by Discord ID
     * 
     * Retrieves a specific node operator using their Discord ID.
     */
    'get'(
      parameters: Parameters<Paths.GetOperatorByDiscordId.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetOperatorByDiscordId.Responses.$200>
  }
  ['/api/operator/address/{address}']: {
    /**
     * getOperatorByAddress - Get operator by wallet address
     * 
     * Retrieves a specific node operator using their wallet address.
     */
    'get'(
      parameters: Parameters<Paths.GetOperatorByAddress.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetOperatorByAddress.Responses.$200>
  }
  ['/api/operator/{discordId}']: {
    /**
     * deleteOperatorByDiscordId - Delete an operator by Discord ID
     * 
     * Removes a node operator registration using their Discord ID.
     */
    'delete'(
      parameters: Parameters<Paths.DeleteOperatorByDiscordId.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteOperatorByDiscordId.Responses.$204>
    /**
     * updateOperatorWallet - Update operator's wallet address
     * 
     * Updates the wallet address for a specific node operator using their Discord ID.
     */
    'put'(
      parameters: Parameters<Paths.UpdateOperatorWallet.PathParameters>,
      data?: Paths.UpdateOperatorWallet.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateOperatorWallet.Responses.$200>
  }
  ['/api/users']: {
    /**
     * getAllUsers - Get all users
     * 
     * Retrieve a list of all users
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAllUsers.Responses.$200>
    /**
     * createUser - Create a new user
     * 
     * Create a new user profile
     */
    'post'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: Paths.CreateUser.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateUser.Responses.$201>
  }
  ['/api/users/discord/{discordUserId}']: {
    /**
     * getUserByDiscordId - Get a specific user by Discord user ID
     * 
     * Retrieve a user by their Discord user ID
     */
    'get'(
      parameters: Parameters<Paths.GetUserByDiscordId.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetUserByDiscordId.Responses.$200>
    /**
     * updateUserByDiscordId - Update a user by Discord user ID
     * 
     * Update an existing user's information
     */
    'put'(
      parameters: Parameters<Paths.UpdateUserByDiscordId.PathParameters>,
      data?: Paths.UpdateUserByDiscordId.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateUserByDiscordId.Responses.$200>
    /**
     * deleteUserByDiscordId - Delete a user by Discord user ID
     * 
     * Delete a user by their Discord user ID
     */
    'delete'(
      parameters: Parameters<Paths.DeleteUserByDiscordId.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteUserByDiscordId.Responses.$200>
  }
  ['/api/users/wallet/{walletAddress}']: {
    /**
     * getUserByWalletAddress - Get a user by wallet address
     * 
     * Retrieve a user by their Ethereum wallet address
     */
    'get'(
      parameters: Parameters<Paths.GetUserByWalletAddress.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetUserByWalletAddress.Responses.$200>
  }
  ['/api/users/verification/{verificationId}']: {
    /**
     * getUserByVerificationId - Get a user by verification ID
     * 
     * Retrieve a user by their Human Passport verification ID
     */
    'get'(
      parameters: Parameters<Paths.GetUserByVerificationId.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetUserByVerificationId.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
