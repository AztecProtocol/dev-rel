import { expect, jest } from "@jest/globals";
import {
  AccountWallet,
  AztecAddress,
  DebugLogger,
  EthAddress,
  Fr,
  computeAuthWitMessageHash,
  createDebugLogger,
  createPXEClient,
  getSandboxAccountsWallets,
  waitForSandbox,
} from "@aztec/aztec.js";
import {
  TokenBridgeContract,
  TokenContract,
} from "@aztec/noir-contracts/types";

import { CrossChainTestHarness } from "./fixtures/cross_chain_test_harness.js";
import { delay } from "./fixtures/utils.js";
import { mnemonicToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http } from "viem";
import { foundry } from "viem/chains";

const {
  PXE_URL = "http://localhost:8080",
  ETHEREUM_HOST = "http://localhost:8545",
} = process.env;
const MNEMONIC = "test test test test test test test test test test test junk";
const hdAccount = mnemonicToAccount(MNEMONIC);

describe("e2e_cross_chain_messaging", () => {
  jest.setTimeout(90_000);

  let logger: DebugLogger;
  // include code:
  let user1Wallet: AccountWallet;
  let user2Wallet: AccountWallet;
  let ethAccount: EthAddress;
  let ownerAddress: AztecAddress;

  let crossChainTestHarness: CrossChainTestHarness;
  let l2Token: TokenContract;
  let l2Bridge: TokenBridgeContract;
  let outbox: any;

  beforeEach(async () => {
    logger = createDebugLogger("aztec:canary_uniswap");
    const pxe = createPXEClient(PXE_URL);
    await waitForSandbox(pxe);
    const wallets = await getSandboxAccountsWallets(pxe);

    const walletClient = createWalletClient({
      account: hdAccount,
      chain: foundry,
      transport: http(ETHEREUM_HOST),
    });
    const publicClient = createPublicClient({
      chain: foundry,
      transport: http(ETHEREUM_HOST),
    });

    crossChainTestHarness = await CrossChainTestHarness.new(
      pxe,
      publicClient,
      walletClient,
      wallets[0],
      logger
    );

    l2Token = crossChainTestHarness.l2Token;
    l2Bridge = crossChainTestHarness.l2Bridge;
    ethAccount = crossChainTestHarness.ethAccount;
    ownerAddress = crossChainTestHarness.ownerAddress;
    outbox = crossChainTestHarness.outbox;
    user1Wallet = wallets[0];
    user2Wallet = wallets[1];
    logger = logger;
    logger("Successfully deployed contracts and initialized portal");
  });

  it("Privately deposit funds from L1 -> L2 and withdraw back to L1", async () => {
    // Generate a claim secret using pedersen
    const l1TokenBalance = 1000000n;
    const bridgeAmount = 100n;

    const [secretForL2MessageConsumption, secretHashForL2MessageConsumption] =
      await crossChainTestHarness.generateClaimSecret();
    const [secretForRedeemingMintedNotes, secretHashForRedeemingMintedNotes] =
      await crossChainTestHarness.generateClaimSecret();

    // 1. Mint tokens on L1
    await crossChainTestHarness.mintTokensOnL1(l1TokenBalance);

    // 2. Deposit tokens to the TokenPortal
    const messageKey = await crossChainTestHarness.sendTokensToPortalPrivate(
      secretHashForRedeemingMintedNotes,
      bridgeAmount,
      secretHashForL2MessageConsumption
    );
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(
      l1TokenBalance - bridgeAmount
    );

    // Wait for the archiver to process the message
    await delay(5000); /// waiting 5 seconds.

    // Perform an unrelated transaction on L2 to progress the rollup. Here we mint public tokens.
    const unrelatedMintAmount = 99n;
    await crossChainTestHarness.mintTokensPublicOnL2(unrelatedMintAmount);
    await crossChainTestHarness.expectPublicBalanceOnL2(
      ownerAddress,
      unrelatedMintAmount
    );

    // 3. Consume L1-> L2 message and mint private tokens on L2
    await crossChainTestHarness.consumeMessageOnAztecAndMintSecretly(
      secretHashForRedeemingMintedNotes,
      bridgeAmount,
      messageKey,
      secretForL2MessageConsumption
    );
    // tokens were minted privately in a TransparentNote which the owner (person who knows the secret) must redeem:
    await crossChainTestHarness.redeemShieldPrivatelyOnL2(
      bridgeAmount,
      secretForRedeemingMintedNotes
    );
    await crossChainTestHarness.expectPrivateBalanceOnL2(
      ownerAddress,
      bridgeAmount
    );

    // time to withdraw the funds again!
    logger("Withdrawing funds from L2");

    // 4. Give approval to bridge to burn owner's funds:
    const withdrawAmount = 9n;
    const nonce = Fr.random();
    const burnMessageHash = await computeAuthWitMessageHash(
      l2Bridge.address,
      l2Token.methods.burn(ownerAddress, withdrawAmount, nonce).request()
    );
    await user1Wallet.createAuthWitness(burnMessageHash);

    // 5. Withdraw owner's funds from L2 to L1
    const entryKey = await crossChainTestHarness.checkEntryIsNotInOutbox(
      withdrawAmount
    );
    await crossChainTestHarness.withdrawPrivateFromAztecToL1(
      withdrawAmount,
      nonce
    );
    await crossChainTestHarness.expectPrivateBalanceOnL2(
      ownerAddress,
      bridgeAmount - withdrawAmount
    );

    // Check balance before and after exit.
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(
      l1TokenBalance - bridgeAmount
    );
    await crossChainTestHarness.withdrawFundsFromBridgeOnL1(
      withdrawAmount,
      entryKey
    );
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(
      l1TokenBalance - bridgeAmount + withdrawAmount
    );

    expect(await outbox.read.contains([entryKey.toString(true)])).toBeFalsy();
  }, 120_000);

  it("Publicly deposit funds from L1 -> L2 and withdraw back to L1", async () => {
    // Generate a claim secret using pedersen
    const l1TokenBalance = 1000000n;
    const bridgeAmount = 100n;

    const [secret, secretHash] =
      await crossChainTestHarness.generateClaimSecret();

    // 1. Mint tokens on L1
    await crossChainTestHarness.mintTokensOnL1(l1TokenBalance);

    // 2. Deposit tokens to the TokenPortal
    const messageKey = await crossChainTestHarness.sendTokensToPortalPublic(
      bridgeAmount,
      secretHash
    );
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(
      l1TokenBalance - bridgeAmount
    );

    // Wait for the archiver to process the message
    await delay(5000); /// waiting 5 seconds.

    // Perform an unrelated transaction on L2 to progress the rollup. Here we mint public tokens.
    const unrelatedMintAmount = 99n;
    await crossChainTestHarness.mintTokensPublicOnL2(unrelatedMintAmount);
    await crossChainTestHarness.expectPublicBalanceOnL2(
      ownerAddress,
      unrelatedMintAmount
    );
    const balanceBefore = unrelatedMintAmount;

    // 3. Consume L1-> L2 message and mint public tokens on L2
    await crossChainTestHarness.consumeMessageOnAztecAndMintPublicly(
      bridgeAmount,
      messageKey,
      secret
    );
    await crossChainTestHarness.expectPublicBalanceOnL2(
      ownerAddress,
      balanceBefore + bridgeAmount
    );
    const afterBalance = balanceBefore + bridgeAmount;

    // time to withdraw the funds again!
    logger("Withdrawing funds from L2");

    // 4. Give approval to bridge to burn owner's funds:
    const withdrawAmount = 9n;
    const nonce = Fr.random();
    const burnMessageHash = await computeAuthWitMessageHash(
      l2Bridge.address,
      l2Token.methods.burn_public(ownerAddress, withdrawAmount, nonce).request()
    );
    await user1Wallet.setPublicAuth(burnMessageHash, true).send().wait();

    // 5. Withdraw owner's funds from L2 to L1
    const entryKey = await crossChainTestHarness.checkEntryIsNotInOutbox(
      withdrawAmount
    );
    await crossChainTestHarness.withdrawPublicFromAztecToL1(
      withdrawAmount,
      nonce
    );
    await crossChainTestHarness.expectPublicBalanceOnL2(
      ownerAddress,
      afterBalance - withdrawAmount
    );

    // Check balance before and after exit.
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(
      l1TokenBalance - bridgeAmount
    );
    await crossChainTestHarness.withdrawFundsFromBridgeOnL1(
      withdrawAmount,
      entryKey
    );
    expect(await crossChainTestHarness.getL1BalanceOf(ethAccount)).toBe(
      l1TokenBalance - bridgeAmount + withdrawAmount
    );

    expect(await outbox.read.contains([entryKey.toString(true)])).toBeFalsy();
  }, 120_000);
});
