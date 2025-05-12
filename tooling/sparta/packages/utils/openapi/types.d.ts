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
    namespace CreateOperator {
        export type RequestBody = Components.Schemas.OperatorInput;
        namespace Responses {
            export type $201 = Components.Schemas.NodeOperator;
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $409 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
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
            export type $401 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetAllOperators {
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
    namespace GetRollupStatus {
        namespace Responses {
            export type $200 = Components.Schemas.RollupStatusResponse;
            export type $401 = Components.Schemas.ErrorResponse;
            export type $500 = Components.Schemas.ErrorResponse;
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
   * getAllOperators - Get node operators
   * 
   * Retrieves a list of registered node operators.
   */
  'getAllOperators'(
    parameters?: Parameters<Paths.GetAllOperators.QueryParameters> | null,
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
   * getOperatorByAddress - Get operator by wallet address
   * 
   * Retrieves a specific node operator using their wallet address.
   */
  'getOperatorByAddress'(
    parameters: Parameters<Paths.GetOperatorByAddress.PathParameters>,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetOperatorByAddress.Responses.$200>
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
  ['/api/operator']: {
    /**
     * getAllOperators - Get node operators
     * 
     * Retrieves a list of registered node operators.
     */
    'get'(
      parameters?: Parameters<Paths.GetAllOperators.QueryParameters> | null,
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
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
