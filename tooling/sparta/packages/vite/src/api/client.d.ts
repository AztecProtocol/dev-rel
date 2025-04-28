import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios'; 

declare namespace Components {
    export interface HeaderParameters {
        ContentTypeHeader?: Parameters.ContentTypeHeader;
        AcceptHeader?: Parameters.AcceptHeader;
    }
    namespace Parameters {
        export type AcceptHeader = string;
        export type ContentTypeHeader = string;
    }
    namespace Schemas {
        export interface Error {
            /**
             * Whether the request was successful
             * example:
             * false
             */
            success?: boolean;
            /**
             * Error message
             * example:
             * Session not found or expired
             */
            error?: string;
            /**
             * Status when an error occurred
             */
            verificationStatus?: "error";
        }
        export interface ScoreResponse {
            /**
             * Whether the score check succeeded or met threshold
             */
            success?: boolean;
            /**
             * Passport score
             */
            score?: number;
            /**
             * Status of the score check
             */
            status?: "pending" | "signature_received" | "verification_failed" | "verification_complete" | "error" | "score_sufficient";
            /**
             * Minimum required score
             */
            minimumScore?: number;
            /**
             * Error message if operation failed
             */
            error?: string;
        }
        export interface User {
            /**
             * Discord user ID
             */
            discordUserId?: string;
            /**
             * Discord username
             */
            discordUsername?: string;
            /**
             * User wallet address
             */
            walletAddress?: string | null;
            /**
             * Whether the user has been verified through Human Passport
             */
            verified?: boolean;
            /**
             * Human Passport verification score
             */
            passportScore?: number | null;
            /**
             * Timestamp when user was created
             */
            createdAt?: number;
            /**
             * Timestamp when user was last updated
             */
            updatedAt?: number;
            /**
             * When they last completed verification
             */
            lastVerificationTime?: number | null;
            /**
             * ID used for the verification process
             */
            verificationId?: string | null;
            /**
             * Current status of verification
             */
            verificationStatus?: "pending" | "signature_received" | "verification_failed" | "verification_complete" | "error";
            /**
             * Signature provided during verification
             */
            verificationSignature?: string | null;
            /**
             * Discord interaction token
             */
            interactionToken?: string | null;
            /**
             * Whether Discord roles were assigned
             */
            roleAssigned?: boolean | null;
        }
        export interface VerificationResponse {
            /**
             * Whether the operation was successful
             */
            success?: boolean;
            /**
             * Unique verification identifier
             */
            verificationId?: string;
            /**
             * URL for the verification process
             */
            verificationUrl?: string;
        }
        export interface VerificationStatusResponse {
            /**
             * Whether the operation was successful
             */
            success?: boolean;
            /**
             * Verification identifier
             */
            verificationId?: string;
            /**
             * Whether a wallet is connected
             */
            walletConnected?: boolean;
            /**
             * Whether a signature was received
             */
            signatureReceived?: boolean;
            /**
             * Whether the user is verified
             */
            verified?: boolean;
            /**
             * Whether roles were assigned in Discord
             */
            roleAssigned?: boolean;
            /**
             * Passport score
             */
            score?: number | null;
            /**
             * Current verification status
             */
            status?: "pending" | "signature_received" | "verification_failed" | "verification_complete" | "error";
            /**
             * Minimum score required for verification
             */
            minimumRequiredScore?: number;
            /**
             * Threshold for high scorer status
             */
            highScoreThreshold?: number;
            /**
             * Whether the user is a high scorer
             */
            isHighScorer?: boolean;
            /**
             * Timestamp of the last status check
             */
            lastChecked?: string; // date-time
        }
        export interface VerifyResponse {
            /**
             * Whether the verification was successful
             */
            success?: boolean;
            /**
             * Whether the user is verified
             */
            verified?: boolean;
            /**
             * Passport score
             */
            score?: number;
            /**
             * Whether Discord roles were assigned
             */
            roleAssigned?: boolean;
            /**
             * Recovered wallet address
             */
            address?: string;
            /**
             * Status of the verification process
             */
            verificationStatus?: "pending" | "signature_received" | "verification_failed" | "verification_complete" | "error";
            /**
             * Message describing the verification result
             */
            message?: string;
            /**
             * Minimum score required for verification
             */
            minimumRequiredScore?: number;
            /**
             * Threshold for high scorer status
             */
            highScoreThreshold?: number;
            /**
             * Whether the user is a high scorer
             */
            isHighScorer?: boolean;
        }
    }
}
declare namespace Paths {
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
    namespace DeleteUser {
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
    namespace GetStatus {
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
    namespace GetUserByWallet {
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
    namespace GetUsers {
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
    namespace UpdateUser {
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
   * getStatus - Check verification status by Discord user ID
   * 
   * Check the human verification status of a user by their Discord ID
   */
  'getStatus'(
    parameters: Parameters<Paths.GetStatus.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetStatus.Responses.$200>
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
   * getUsers - Get all users
   * 
   * Retrieve a list of all users
   */
  'getUsers'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetUsers.Responses.$200>
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
   * updateUser - Update a user
   * 
   * Update an existing user's information
   */
  'updateUser'(
    parameters: Parameters<Paths.UpdateUser.PathParameters>,
    data?: Paths.UpdateUser.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateUser.Responses.$200>
  /**
   * deleteUser - Delete a user
   * 
   * Delete a user by their Discord user ID
   */
  'deleteUser'(
    parameters: Parameters<Paths.DeleteUser.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteUser.Responses.$200>
  /**
   * getUserByWallet - Get a user by wallet address
   * 
   * Retrieve a user by their Ethereum wallet address
   */
  'getUserByWallet'(
    parameters: Parameters<Paths.GetUserByWallet.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetUserByWallet.Responses.$200>
}

export interface PathsDictionary {
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
  ['/api/human/status/{discordUserId}']: {
    /**
     * getStatus - Check verification status by Discord user ID
     * 
     * Check the human verification status of a user by their Discord ID
     */
    'get'(
      parameters: Parameters<Paths.GetStatus.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetStatus.Responses.$200>
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
  ['/api/users']: {
    /**
     * getUsers - Get all users
     * 
     * Retrieve a list of all users
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetUsers.Responses.$200>
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
  ['/api/users/{discordUserId}']: {
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
     * updateUser - Update a user
     * 
     * Update an existing user's information
     */
    'put'(
      parameters: Parameters<Paths.UpdateUser.PathParameters>,
      data?: Paths.UpdateUser.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateUser.Responses.$200>
    /**
     * deleteUser - Delete a user
     * 
     * Delete a user by their Discord user ID
     */
    'delete'(
      parameters: Parameters<Paths.DeleteUser.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteUser.Responses.$200>
  }
  ['/api/users/wallet/{walletAddress}']: {
    /**
     * getUserByWallet - Get a user by wallet address
     * 
     * Retrieve a user by their Ethereum wallet address
     */
    'get'(
      parameters: Parameters<Paths.GetUserByWallet.PathParameters>,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetUserByWallet.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
