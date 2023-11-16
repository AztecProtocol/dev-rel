import { CounterContract } from "../contracts/artifacts/Counter.js";
import {
  Fr,
  createPXEClient,
  generatePublicKey,
  GrumpkinScalar,
  SignerlessWallet,
  Note,
  AztecAddress,
  ExtendedNote,
  getContractDeploymentInfo,
} from "@aztec/aztec.js";

async function main() {
  /*

  Setup

  */

  // this will be used to encrypt private notes to a specific account
  const encryptionKey = GrumpkinScalar.random();
  const publicKey = await generatePublicKey(encryptionKey);

  const pxe = createPXEClient("http://localhost:8080");
  const nonContractAccountWallet = new SignerlessWallet(pxe);

  // this will be used for access control on the account contract
  const secret = Fr.random();
  // deployment salt is an input to determine the contract address
  const salt = Fr.random();

  // contract deployment info is deterministic
  // get the deployment info to register the to be deployed account contract
  // with the PXE
  const deploymentInfo = await getContractDeploymentInfo(
    CounterContract.artifact,
    [secret],
    salt,
    publicKey
  );

  await pxe.registerAccount(
    encryptionKey,
    deploymentInfo.completeAddress.partialAddress
  );

  /*

  Deploy

  */

  const tx = await CounterContract.deployWithPublicKey(
    publicKey,
    nonContractAccountWallet,
    secret
  ).send({ contractAddressSalt: salt });
  const contract = await tx.deployed({
    debug: false,
  });
  const receipt = await tx.wait({ debug: true });
  // const receipt = await tx.getReceipt();

  console.log("deployed", receipt.debugInfo);

  /*

  Add note to PXE

  */

  const note = new Note([secret]);
  const extendedNote = new ExtendedNote(
    note,
    contract.address,
    contract.address,
    new Fr(1),
    receipt.txHash
  );
  console.log("adding note manually to pxe");
  await pxe.addNote(extendedNote);

  let constantSecret = await contract.methods.get_secret().view();
  console.log("secret from contract: ", constantSecret);

  /*

    Increment the protected counter

  */

  let incrementReceipt = await contract.methods
    .increment(contract.address, secret)
    .send()
    .wait();

  let newCount = await contract.methods.get_counter(contract.address).view();

  console.log("new count", newCount);

  // this fails with tx already exists
  // need to program a nonce into the tx entrypoint to make a unique hash
  // await contract.methods.increment(contract.address, secret).send().wait();

  // newCount = await contract.methods
  //   .get_counter(someAddress)
  //   .view();
  // console.log("new count", newCount);

  // This will fail with incorrect secret provided
  // await contract.methods.increment(contract.address, Fr.random()).send().wait();

  /*

    Update the secret used for access control
    
  */

  // const newSecret = Fr.random();

  // const upstateSecretReceipt = await contract.methods
  //   .update_secret(secret, newSecret)
  //   .send()
  //   .wait({ debug: true });

  // const newSecretNote = new Note([newSecret]);
  // const newSecretExtendedNote = new ExtendedNote(
  //   newSecretNote,
  //   contract.address,
  //   contract.address,
  //   new Fr(1),
  //   upstateSecretReceipt.txHash
  // );
  // console.log("adding note manually to pxe");
  // await pxe.addNote(newSecretExtendedNote);

  // let newConstantSecret = await contract.methods.get_secret().view();

  // console.log("New constant secret: ", newConstantSecret);

  // ===================================================================

  let finalCount = await contract.methods.get_counter(contract.address).view();
  console.log("final count", finalCount);

  // log the count on a random address
  const someAddress = AztecAddress.random();
  let randomCount = await contract.methods.get_counter(someAddress).view();
  console.log("random account count", randomCount);
}

main();
