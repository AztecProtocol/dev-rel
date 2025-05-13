import type {
  OpenAPIClient,
  Parameters,
  UnknownParamsObject,
  OperationResponse,
  AxiosRequestConfig,
} from 'openapi-client-axios'; 

declare namespace Components {
    namespace Schemas {
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
             * The Discord username of the node operator.
             * example:
             * user#1234
             */
            discordUsername?: string;
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
        export interface OperatorResponse {
            /**
             * The Discord user ID of the node operator.
             */
            discordId?: string;
            /**
             * The Ethereum wallet address associated with the node operator.
             */
            walletAddress?: string;
            /**
             * Timestamp when operator was created
             */
            createdAt?: number;
            /**
             * Timestamp when operator was last updated
             */
            updatedAt?: number;
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
    }
}
declare namespace Paths {
    namespace ApproveOperator {
        namespace Parameters {
            export type DiscordId = string;
            export type DiscordUsername = string;
        }
        export interface QueryParameters {
            discordId?: Parameters.DiscordId;
            discordUsername?: Parameters.DiscordUsername;
        }
        namespace Responses {
            export type $200 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace CreateOperator {
        export interface RequestBody {
            /**
             * The Discord user ID.
             */
            discordId: string;
            /**
             * The Ethereum wallet address.
             */
            walletAddress: string;
            /**
             * The Discord username.
             */
            discordUsername?: string;
        }
        namespace Responses {
            export type $201 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $409 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace DeleteOperator {
        namespace Parameters {
            export type DiscordId = string;
            export type DiscordUsername = string;
        }
        export interface QueryParameters {
            discordId?: Parameters.DiscordId;
            discordUsername?: Parameters.DiscordUsername;
        }
        namespace Responses {
            export interface $204 {
            }
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetAllValidators {
        namespace Responses {
            export type $200 = Components.Schemas.EthereumResponse;
            export type $401 = Components.Schemas.ErrorResponse;
            export type $500 = Components.Schemas.ErrorResponse;
        }
    }
    namespace GetCurrentEpochCommittee {
        namespace Responses {
            export type $200 = Components.Schemas.EthereumResponse;
            export type $401 = Components.Schemas.ErrorResponse;
            export type $500 = Components.Schemas.ErrorResponse;
        }
    }
    namespace GetOperator {
        namespace Parameters {
            export type DiscordId = string;
            export type DiscordUsername = string;
        }
        export interface QueryParameters {
            discordId?: Parameters.DiscordId;
            discordUsername?: Parameters.DiscordUsername;
        }
        namespace Responses {
            export type $200 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
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
            export type $401 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetOperatorStats {
        namespace Responses {
            export interface $200 {
                stats?: {
                    /**
                     * Total number of registered operators.
                     * example:
                     * 42
                     */
                    totalCount?: number;
                };
            }
            export type $401 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetOperators {
        namespace Parameters {
            export type PageToken = string;
        }
        export interface QueryParameters {
            pageToken?: Parameters.PageToken;
        }
        namespace Responses {
            export interface $200 {
                operators?: Components.Schemas.NodeOperator[];
                /**
                 * Token to retrieve the next page of results. Not present on the last page.
                 * example:
                 * eyJsYXN0S2V5IjoiMTIzNDU2Nzg5MCJ9
                 */
                nextPageToken?: string;
            }
            export type $401 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetRollupStatus {
        namespace Responses {
            export type $200 = Components.Schemas.RollupStatusResponse;
            export type $401 = Components.Schemas.ErrorResponse;
            export type $500 = Components.Schemas.ErrorResponse;
        }
    }
    namespace UpdateOperator {
        namespace Parameters {
            export type DiscordId = string;
            export type DiscordUsername = string;
        }
        export interface QueryParameters {
            discordId?: Parameters.DiscordId;
            discordUsername?: Parameters.DiscordUsername;
        }
        export interface RequestBody {
            /**
             * The new wallet address.
             */
            walletAddress?: string;
            /**
             * The new Discord username.
             */
            discordUsername?: string;
        }
        namespace Responses {
            export type $200 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
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
   * getOperators - Get node operators
   * 
   * Retrieves a list of registered node operators.
   */
  'getOperators'(
    parameters?: Parameters<Paths.GetOperators.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetOperators.Responses.$200>
  /**
   * getOperator - Get a specific node operator
   * 
   * Retrieves a specific node operator using either their Discord ID or username.
   */
  'getOperator'(
    parameters?: Parameters<Paths.GetOperator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetOperator.Responses.$200>
  /**
   * updateOperator - Update operator's wallet address
   * 
   * Updates the wallet address for a specific node operator using their Discord ID or username.
   */
  'updateOperator'(
    parameters?: Parameters<Paths.UpdateOperator.QueryParameters> | null,
    data?: Paths.UpdateOperator.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateOperator.Responses.$200>
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
   * deleteOperator - Delete an operator by Discord ID or username
   * 
   * Removes a node operator registration using either their Discord ID or username.
   */
  'deleteOperator'(
    parameters?: Parameters<Paths.DeleteOperator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.DeleteOperator.Responses.$204>
  /**
   * getOperatorStats - Get node operator statistics
   * 
   * Retrieves statistics about registered node operators.
   */
  'getOperatorStats'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetOperatorStats.Responses.$200>
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
   * approveOperator - Approve a node operator
   * 
   * Approves a node operator using their Discord ID or username.
   */
  'approveOperator'(
    parameters?: Parameters<Paths.ApproveOperator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ApproveOperator.Responses.$200>
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
  ['/api/operator/operators']: {
    /**
     * getOperators - Get node operators
     * 
     * Retrieves a list of registered node operators.
     */
    'get'(
      parameters?: Parameters<Paths.GetOperators.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetOperators.Responses.$200>
  }
  ['/api/operator']: {
    /**
     * getOperator - Get a specific node operator
     * 
     * Retrieves a specific node operator using either their Discord ID or username.
     */
    'get'(
      parameters?: Parameters<Paths.GetOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetOperator.Responses.$200>
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
    /**
     * deleteOperator - Delete an operator by Discord ID or username
     * 
     * Removes a node operator registration using either their Discord ID or username.
     */
    'delete'(
      parameters?: Parameters<Paths.DeleteOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteOperator.Responses.$204>
    /**
     * updateOperator - Update operator's wallet address
     * 
     * Updates the wallet address for a specific node operator using their Discord ID or username.
     */
    'put'(
      parameters?: Parameters<Paths.UpdateOperator.QueryParameters> | null,
      data?: Paths.UpdateOperator.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateOperator.Responses.$200>
  }
  ['/api/operator/stats']: {
    /**
     * getOperatorStats - Get node operator statistics
     * 
     * Retrieves statistics about registered node operators.
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetOperatorStats.Responses.$200>
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
  ['/api/operator/approve']: {
    /**
     * approveOperator - Approve a node operator
     * 
     * Approves a node operator using their Discord ID or username.
     */
    'put'(
      parameters?: Parameters<Paths.ApproveOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ApproveOperator.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
