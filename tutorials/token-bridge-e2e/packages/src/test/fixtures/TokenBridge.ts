
/* Autogenerated file, do not edit! */

/* eslint-disable */
import {
  AztecAddress,
  AztecAddressLike,
  CompleteAddress,
  Contract,
  ContractArtifact,
  ContractBase,
  ContractFunctionInteraction,
  ContractMethod,
  DeployMethod,
  EthAddress,
  EthAddressLike,
  FieldLike,
  Fr,
  FunctionSelectorLike,
  Point,
  PublicKey,
  Wallet,
} from '@aztec/aztec.js';
import TokenBridgeContractArtifactJson from './TokenBridge.json' assert { type: 'json' };
export const TokenBridgeContractArtifact = TokenBridgeContractArtifactJson as ContractArtifact;

/**
 * Type-safe interface for contract TokenBridge;
 */
export class TokenBridgeContract extends ContractBase {
  
  private constructor(
    completeAddress: CompleteAddress,
    wallet: Wallet,
    portalContract = EthAddress.ZERO
  ) {
    super(completeAddress, TokenBridgeContractArtifact, wallet, portalContract);
  }
  

  
  /**
   * Creates a contract instance.
   * @param address - The deployed contract's address.
   * @param wallet - The wallet to use when interacting with the contract.
   * @returns A promise that resolves to a new Contract instance.
   */
  public static async at(
    address: AztecAddress,
    wallet: Wallet,
  ) {
    return Contract.at(address, TokenBridgeContract.artifact, wallet) as Promise<TokenBridgeContract>;
  }

  
  /**
   * Creates a tx to deploy a new instance of this contract.
   */
  public static deploy(wallet: Wallet, token: AztecAddressLike) {
    return new DeployMethod<TokenBridgeContract>(Point.ZERO, wallet, TokenBridgeContractArtifact, TokenBridgeContract.at, Array.from(arguments).slice(1));
  }

  /**
   * Creates a tx to deploy a new instance of this contract using the specified public key to derive the address.
   */
  public static deployWithPublicKey(publicKey: PublicKey, wallet: Wallet, token: AztecAddressLike) {
    return new DeployMethod<TokenBridgeContract>(publicKey, wallet, TokenBridgeContractArtifact, TokenBridgeContract.at, Array.from(arguments).slice(2));
  }
  

  
  /**
   * Returns this contract's artifact.
   */
  public static get artifact(): ContractArtifact {
    return TokenBridgeContractArtifact;
  }
  

  /** Type-safe wrappers for the public methods exposed by the contract. */
  public methods!: {
    
    /** _assert_token_is_same(token: struct) */
    _assert_token_is_same: ((token: AztecAddressLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;

    /** _call_mint_on_token(amount: field, secret_hash: field) */
    _call_mint_on_token: ((amount: FieldLike, secret_hash: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;

    /** claim_private(secret_hash_for_redeeming_minted_notes: field, amount: field, canceller: struct, msg_key: field, secret_for_L1_to_L2_message_consumption: field) */
    claim_private: ((secret_hash_for_redeeming_minted_notes: FieldLike, amount: FieldLike, canceller: EthAddressLike, msg_key: FieldLike, secret_for_L1_to_L2_message_consumption: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;

    /** claim_public(to: struct, amount: field, canceller: struct, msg_key: field, secret: field) */
    claim_public: ((to: AztecAddressLike, amount: FieldLike, canceller: EthAddressLike, msg_key: FieldLike, secret: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;

    /** compute_note_hash_and_nullifier(contract_address: struct, nonce: field, storage_slot: field, serialized_note: array) */
    compute_note_hash_and_nullifier: ((contract_address: AztecAddressLike, nonce: FieldLike, storage_slot: FieldLike, serialized_note: FieldLike[]) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;

    /** exit_to_l1_private(token: struct, recipient: struct, amount: field, callerOnL1: struct, nonce: field) */
    exit_to_l1_private: ((token: AztecAddressLike, recipient: EthAddressLike, amount: FieldLike, callerOnL1: EthAddressLike, nonce: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;

    /** exit_to_l1_public(recipient: struct, amount: field, callerOnL1: struct, nonce: field) */
    exit_to_l1_public: ((recipient: EthAddressLike, amount: FieldLike, callerOnL1: EthAddressLike, nonce: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;

    /** token() */
    token: (() => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
  };
}
