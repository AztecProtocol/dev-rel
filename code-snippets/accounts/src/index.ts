import { Fr, Fq, GrumpkinScalar, createPXEClient, AccountManager, AccountWallet } from '@aztec/aztec.js';
import { } from '@aztec/circuit-types/interfaces';
import { type PXE, } from '@aztec/circuit-types';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { getEcdsaAccount, getEcdsaWallet } from '@aztec/accounts/ecdsa';

// 
import { Secp256k1 } from '@aztec/circuits.js/barretenberg';

const { PXE_URL = 'http://localhost:8080' } = process.env;

async function main() {

    // connect PXE
    const pxe = createPXEClient(PXE_URL);
    const { chainId } = await pxe.getNodeInfo();
    console.log(`Connected to chain ${chainId}`);

    // load accounts
    const accounts = await pxe.getRegisteredAccounts();
    console.log(`User accounts:\n${accounts.map(a => a.address).join('\n')}`);

    // create new account
    createAccount(pxe, AccountType.Ecdsa);

}

enum AccountType {
    Schnorr,
    Ecdsa,
    Passkey
}

async function createAccount(pxe: PXE, type: AccountType = AccountType.Ecdsa) {
    switch (type) {
        case AccountType.Schnorr:
            const schnorrSecretKey = Fr.random();
            const schnorrSigningKey = GrumpkinScalar.random();
            const schnorrAccount = await getSchnorrAccount(pxe, schnorrSecretKey, schnorrSigningKey).waitSetup();
            console.log("Schnorr account: ", schnorrAccount);
            break;
        case AccountType.Ecdsa:
            const ecdsaSecretKey = Fr.random();
            const secp256k1 = new Secp256k1();
            const ecdsaSigningKey = secp256k1.getRandomFr();
            const ecdsaAccount = await getEcdsaAccount(pxe, ecdsaSecretKey, ecdsaSigningKey).waitSetup();
            console.log("ECDSA account: ", ecdsaAccount);
            break;
        case AccountType.Passkey:

            break;
    }
}

main().catch(err => {
    console.error(`Error in app: ${err}`);
    process.exit(1);
});
