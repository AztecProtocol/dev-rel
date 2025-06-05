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
            /**
             * List of validators associated with this operator.
             */
            validators?: {
                /**
                 * The Ethereum address of the validator.
                 * example:
                 * 0x1234567890abcdef1234567890abcdef12345678
                 */
                validatorAddress?: string;
            }[];
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
        }
        export interface OperatorResponse {
            /**
             * The Discord user ID of the node operator.
             */
            discordId?: string;
            /**
             * Timestamp when operator was created
             */
            createdAt?: number;
            /**
             * Timestamp when operator was last updated
             */
            updatedAt?: number;
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
        export interface ValidatorResponse {
            /**
             * The Ethereum address of the validator.
             * example:
             * 0x1234567890abcdef1234567890abcdef12345678
             */
            address?: string;
            /**
             * The Discord ID of the operator who owns this validator.
             * example:
             * 123456789012345678
             */
            operatorId?: string;
            stats?: {
                /**
                 * Total number of validators in the system.
                 * example:
                 * 42
                 */
                totalValidators?: number;
            };
        }
    }
}
declare namespace Paths {
    namespace AddValidator {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface QueryParameters {
            discordId: Parameters.DiscordId;
        }
        export interface RequestBody {
            /**
             * The validator address to add.
             * example:
             * 0x1234567890abcdef1234567890abcdef12345678
             */
            validatorAddress: string;
            /**
             * Whether to skip on-chain validator addition (for testing).
             * example:
             * false
             */
            skipOnChain?: boolean;
        }
        namespace Responses {
            export interface $201 {
                success?: boolean;
                data?: Components.Schemas.ValidatorResponse;
            }
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $403 = Components.Schemas.OperatorError;
            export type $409 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace ApproveOperator {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface QueryParameters {
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
    namespace CreateOperator {
        namespace Parameters {
            export type Address = string;
            export type DiscordId = string;
        }
        export interface QueryParameters {
            discordId: Parameters.DiscordId;
            address: Parameters.Address;
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
        }
        export interface QueryParameters {
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
    namespace GetAllValidators {
        namespace Responses {
            export interface $200 {
                /**
                 * Indicates if the request was successful.
                 * example:
                 * true
                 */
                success?: boolean;
                data?: {
                    /**
                     * Array of all validators with comprehensive information and 5 latest history slots.
                     */
                    validators?: Components.Schemas.ValidatorResponse[];
                    stats?: {
                        /**
                         * Total number of validators.
                         */
                        totalValidators?: number;
                        /**
                         * Number of validators active in the current rollup.
                         */
                        activeValidators?: number;
                        /**
                         * Number of validators with associated operators.
                         */
                        knownValidators?: number;
                    };
                };
            }
            export type $401 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetAllValidatorsOnChain {
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
        }
        export interface QueryParameters {
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
                    totalOperators?: number;
                    /**
                     * Counts of operators without validators.
                     */
                    operatorsWithoutValidators?: {
                        /**
                         * Count of approved operators without validators.
                         * example:
                         * 10
                         */
                        approved?: number;
                        /**
                         * Count of all operators without validators.
                         * example:
                         * 15
                         */
                        all?: number;
                    };
                    /**
                     * Count of operators with more than one validator.
                     * example:
                     * 5
                     */
                    operatorsWithMultipleValidators?: number;
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
    namespace GetValidator {
        namespace Parameters {
            export type Address = string;
            export type DiscordId = string;
            export type HistoryLimit = number;
        }
        export interface QueryParameters {
            address?: Parameters.Address;
            discordId?: Parameters.DiscordId;
            historyLimit?: Parameters.HistoryLimit;
        }
        namespace Responses {
            export interface $200 {
                /**
                 * Indicates if the request was successful.
                 * example:
                 * true
                 */
                success?: boolean;
                data?: Components.Schemas.ValidatorResponse | {
                    operator?: {
                        [key: string]: any;
                    };
                    validators?: Components.Schemas.ValidatorResponse[];
                };
            }
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace GetValidatorStats {
        namespace Responses {
            export interface $200 {
                /**
                 * Indicates if the request was successful.
                 * example:
                 * true
                 */
                success?: boolean;
                data?: {
                    network?: {
                        /**
                         * Total number of validators in the current rollup set.
                         */
                        totalValidatorsInSet?: number;
                        /**
                         * Number of validators who attested in the last 24 hours.
                         */
                        activeValidators?: number;
                        /**
                         * Number of validators who attested in the last 24 hours.
                         */
                        validatorsAttested24h?: number;
                        /**
                         * Number of validators who proposed blocks in the last 24 hours.
                         */
                        validatorsProposed24h?: number;
                        /**
                         * Number of validators that have associated peer IDs.
                         */
                        validatorsWithPeers?: number;
                    };
                    performance?: {
                        /**
                         * Average attestation miss rate across all validators (0-1).
                         */
                        networkAttestationMissRate?: number;
                        /**
                         * Average proposal miss rate across all validators (0-1).
                         */
                        networkProposalMissRate?: number;
                    };
                    peers?: {
                        /**
                         * Total number of peers discovered by the crawler.
                         */
                        totalPeersInNetwork?: number;
                        /**
                         * Distribution of peers by client software.
                         */
                        clientDistribution?: {
                            [name: string]: number;
                        };
                    };
                    geography?: {
                        /**
                         * Distribution of peers by country.
                         */
                        countryDistribution?: {
                            [name: string]: number;
                        };
                        /**
                         * Country with the highest number of nodes.
                         */
                        topCountry?: {
                            country?: string;
                            count?: number;
                        } | null;
                    };
                    infrastructure?: {
                        /**
                         * Distribution of peers by ISP/hosting provider.
                         */
                        ispDistribution?: {
                            [name: string]: number;
                        };
                        /**
                         * ISP with the highest number of nodes.
                         */
                        topISP?: {
                            isp?: string;
                            count?: number;
                        } | null;
                    };
                    metadata?: {
                        /**
                         * Timestamp when the statistics were last updated.
                         */
                        lastUpdated?: number;
                        /**
                         * Current epoch number.
                         */
                        currentEpoch?: number;
                        /**
                         * Current slot number.
                         */
                        currentSlot?: number;
                    };
                };
            }
            export type $401 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace RemoveValidator {
        namespace Parameters {
            export type DiscordId = string;
            export type ValidatorAddress = string;
        }
        export interface QueryParameters {
            validatorAddress: Parameters.ValidatorAddress;
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
    namespace SendMessageToOperator {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface QueryParameters {
            discordId: Parameters.DiscordId;
        }
        export interface RequestBody {
            /**
             * The message content to send.
             */
            message: string;
        }
        namespace Responses {
            export interface $200 {
                success?: boolean;
                message?: string;
            }
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $404 = Components.Schemas.OperatorError;
            export type $500 = Components.Schemas.OperatorError;
        }
    }
    namespace UnapproveOperator {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface QueryParameters {
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
    namespace UnslashOperator {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface QueryParameters {
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
    namespace UpdateValidator {
        namespace Parameters {
            export type DiscordId = string;
        }
        export interface QueryParameters {
            discordId: Parameters.DiscordId;
        }
        export interface RequestBody {
            /**
             * The validator address to update.
             * example:
             * 0x1234567890abcdef1234567890abcdef12345678
             */
            validatorAddress: string;
            /**
             * The peer network ID to associate with this validator. Use null to remove.
             * example:
             * 16Uiu2HAmJpn1h7BCnz2XqmeuoykU7J7f52o8S4DtU4LpjVCJD1RU
             */
            peerId?: string | null;
        }
        namespace Responses {
            export interface $200 {
                success?: boolean;
                data?: {
                    address?: string;
                    peerId?: string | null;
                    updatedAt?: number;
                };
            }
            export type $400 = Components.Schemas.OperatorError;
            export type $401 = Components.Schemas.OperatorError;
            export type $403 = Components.Schemas.OperatorError;
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
   * getAllValidatorsOnChain - Get all validators
   * 
   * Retrieves the list of all attesters (validators) in the rollup system
   */
  'getAllValidatorsOnChain'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAllValidatorsOnChain.Responses.$200>
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
   * Retrieves a specific node operator using their Discord ID.
   */
  'getOperator'(
    parameters?: Parameters<Paths.GetOperator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetOperator.Responses.$200>
  /**
   * createOperator - Create a new node operator
   * 
   * Creates a new node operator registration with Discord ID and wallet address.
   */
  'createOperator'(
    parameters?: Parameters<Paths.CreateOperator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.CreateOperator.Responses.$201>
  /**
   * deleteOperator - Delete an operator by Discord ID
   * 
   * Removes a node operator registration using their Discord ID.
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
   * approveOperator - Approve a node operator
   * 
   * Approves a node operator using their Discord ID.
   */
  'approveOperator'(
    parameters?: Parameters<Paths.ApproveOperator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.ApproveOperator.Responses.$200>
  /**
   * unapproveOperator - Unapprove a node operator
   * 
   * Unapproves a node operator using their Discord ID.
   */
  'unapproveOperator'(
    parameters?: Parameters<Paths.UnapproveOperator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UnapproveOperator.Responses.$200>
  /**
   * unslashOperator - Remove slashed status from a node operator
   * 
   * Removes the wasSlashed flag from a node operator using their Discord ID.
   */
  'unslashOperator'(
    parameters?: Parameters<Paths.UnslashOperator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UnslashOperator.Responses.$200>
  /**
   * sendMessageToOperator - Send a direct message to an operator
   * 
   * Sends a direct message to a node operator via Discord.
   */
  'sendMessageToOperator'(
    parameters?: Parameters<Paths.SendMessageToOperator.QueryParameters> | null,
    data?: Paths.SendMessageToOperator.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.SendMessageToOperator.Responses.$200>
  /**
   * getAllValidators - Get all validators
   * 
   * Retrieves a comprehensive list of all validators with available information from blockchain, database, and external sources. Always includes the 5 latest history slots for each validator.
   */
  'getAllValidators'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetAllValidators.Responses.$200>
  /**
   * getValidator - Get validator information
   * 
   * Retrieves validator information either by validator address or by operator's Discord ID.
   */
  'getValidator'(
    parameters?: Parameters<Paths.GetValidator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetValidator.Responses.$200>
  /**
   * updateValidator - Update validator information
   * 
   * Updates validator information such as peer network ID.
   */
  'updateValidator'(
    parameters?: Parameters<Paths.UpdateValidator.QueryParameters> | null,
    data?: Paths.UpdateValidator.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.UpdateValidator.Responses.$200>
  /**
   * addValidator - Add a new validator
   * 
   * Adds a new validator and associates it with an operator. If the operator doesn't exist, it will be created automatically with approved status.
   */
  'addValidator'(
    parameters?: Parameters<Paths.AddValidator.QueryParameters> | null,
    data?: Paths.AddValidator.RequestBody,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.AddValidator.Responses.$201>
  /**
   * removeValidator - Remove a validator
   * 
   * Removes a validator from an operator's list of validators.
   */
  'removeValidator'(
    parameters?: Parameters<Paths.RemoveValidator.QueryParameters> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.RemoveValidator.Responses.$204>
  /**
   * getValidatorStats - Get validator network statistics
   * 
   * Retrieves comprehensive network-wide statistics about validators, peers, and network health.
   */
  'getValidatorStats'(
    parameters?: Parameters<UnknownParamsObject> | null,
    data?: any,
    config?: AxiosRequestConfig  
  ): OperationResponse<Paths.GetValidatorStats.Responses.$200>
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
     * getAllValidatorsOnChain - Get all validators
     * 
     * Retrieves the list of all attesters (validators) in the rollup system
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAllValidatorsOnChain.Responses.$200>
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
     * Retrieves a specific node operator using their Discord ID.
     */
    'get'(
      parameters?: Parameters<Paths.GetOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetOperator.Responses.$200>
    /**
     * createOperator - Create a new node operator
     * 
     * Creates a new node operator registration with Discord ID and wallet address.
     */
    'post'(
      parameters?: Parameters<Paths.CreateOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.CreateOperator.Responses.$201>
    /**
     * deleteOperator - Delete an operator by Discord ID
     * 
     * Removes a node operator registration using their Discord ID.
     */
    'delete'(
      parameters?: Parameters<Paths.DeleteOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.DeleteOperator.Responses.$204>
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
  ['/api/operator/approve']: {
    /**
     * approveOperator - Approve a node operator
     * 
     * Approves a node operator using their Discord ID.
     */
    'put'(
      parameters?: Parameters<Paths.ApproveOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.ApproveOperator.Responses.$200>
    /**
     * unapproveOperator - Unapprove a node operator
     * 
     * Unapproves a node operator using their Discord ID.
     */
    'delete'(
      parameters?: Parameters<Paths.UnapproveOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UnapproveOperator.Responses.$200>
  }
  ['/api/operator/slashed']: {
    /**
     * unslashOperator - Remove slashed status from a node operator
     * 
     * Removes the wasSlashed flag from a node operator using their Discord ID.
     */
    'delete'(
      parameters?: Parameters<Paths.UnslashOperator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UnslashOperator.Responses.$200>
  }
  ['/api/operator/message']: {
    /**
     * sendMessageToOperator - Send a direct message to an operator
     * 
     * Sends a direct message to a node operator via Discord.
     */
    'post'(
      parameters?: Parameters<Paths.SendMessageToOperator.QueryParameters> | null,
      data?: Paths.SendMessageToOperator.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.SendMessageToOperator.Responses.$200>
  }
  ['/api/validator/validators']: {
    /**
     * getAllValidators - Get all validators
     * 
     * Retrieves a comprehensive list of all validators with available information from blockchain, database, and external sources. Always includes the 5 latest history slots for each validator.
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetAllValidators.Responses.$200>
  }
  ['/api/validator']: {
    /**
     * getValidator - Get validator information
     * 
     * Retrieves validator information either by validator address or by operator's Discord ID.
     */
    'get'(
      parameters?: Parameters<Paths.GetValidator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetValidator.Responses.$200>
    /**
     * addValidator - Add a new validator
     * 
     * Adds a new validator and associates it with an operator. If the operator doesn't exist, it will be created automatically with approved status.
     */
    'post'(
      parameters?: Parameters<Paths.AddValidator.QueryParameters> | null,
      data?: Paths.AddValidator.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.AddValidator.Responses.$201>
    /**
     * updateValidator - Update validator information
     * 
     * Updates validator information such as peer network ID.
     */
    'put'(
      parameters?: Parameters<Paths.UpdateValidator.QueryParameters> | null,
      data?: Paths.UpdateValidator.RequestBody,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.UpdateValidator.Responses.$200>
    /**
     * removeValidator - Remove a validator
     * 
     * Removes a validator from an operator's list of validators.
     */
    'delete'(
      parameters?: Parameters<Paths.RemoveValidator.QueryParameters> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.RemoveValidator.Responses.$204>
  }
  ['/api/validator/stats']: {
    /**
     * getValidatorStats - Get validator network statistics
     * 
     * Retrieves comprehensive network-wide statistics about validators, peers, and network health.
     */
    'get'(
      parameters?: Parameters<UnknownParamsObject> | null,
      data?: any,
      config?: AxiosRequestConfig  
    ): OperationResponse<Paths.GetValidatorStats.Responses.$200>
  }
}

export type Client = OpenAPIClient<OperationMethods, PathsDictionary>
