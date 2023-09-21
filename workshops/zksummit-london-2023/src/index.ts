import { Fr } from '@aztec/foundation/fields';
import { createAztecRpcClient } from '@aztec/aztec.js';
import { PrivateCounterContract } from './PrivateCounter.js';

const SANDBOX_URL = process.env['SANDBOX_URL'] || 'http://localhost:8080';

const deployContract = async () => {
    const rpc = await createAztecRpcClient(SANDBOX_URL);
    const accounts = await rpc.getRegisteredAccounts();
    await console.log(accounts);

    const deployerWallet = accounts[0];
    const salt = Fr.random();

    const tx = PrivateCounterContract.deploy(rpc, 100n, deployerWallet.address).send({ contractAddressSalt: salt });
    console.log(`Tx sent with hash ${await tx.getTxHash()}`);

    await tx.isMined({ interval: 0.1 });
    const receiptAfterMined = await tx.getReceipt();
    console.log(`Status: ${receiptAfterMined.status}`);
    console.log(`Contract address: ${receiptAfterMined.contractAddress}`);
};
deployContract()