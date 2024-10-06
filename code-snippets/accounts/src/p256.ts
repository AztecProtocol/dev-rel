import { type NoirCompiledContract, loadContractArtifact } from '@aztec/aztec.js';

import P256AccountContractJson from './artifacts/EcdsaP256Account.json' assert { type: 'json' };



import { type AuthWitnessProvider } from '@aztec/aztec.js/account';
import { AuthWitness, type CompleteAddress } from '@aztec/circuit-types';
import { Ecdsa } from '@aztec/circuits.js/barretenberg';
import { type Fr, ContractArtifact } from '@aztec/aztec.js';

import { DefaultAccountContract } from '@aztec/accounts/defaults';

export const P256AccountContractArtifact = loadContractArtifact(P256AccountContractJson as NoirCompiledContract);

/**
 * Account contract that authenticates transactions using passkey signatures
 * verified against a secp256r1 public key stored in an immutable encrypted note.
 */
export class P256AccountContract extends DefaultAccountContract {
    constructor(private signingPrivateKey: Buffer) {
        super(P256AccountContractArtifact as ContractArtifact);
        signingPrivateKey = Buffer.alloc(32); //TODO: set to pre-tested value (256r1 functionality not bound to bb wasm)
    }

    getDeploymentArgs() {
        // const signingPublicKey = new Ecdsa().computePublicKey(this.signingPrivateKey);
        const signingPublicKey = Buffer.alloc(32); //TODO: set to pre-tested value (corresponding to private key)
        return [signingPublicKey.subarray(0, 32), signingPublicKey.subarray(32, 64)];
    }

    getAuthWitnessProvider(_address: CompleteAddress): AuthWitnessProvider {
        return new P256AuthWitnessProvider(this.signingPrivateKey);
    }
}

/** Creates auth witnesses using P256 signatures. */
class P256AuthWitnessProvider implements AuthWitnessProvider {
    constructor(private signingPrivateKey: Buffer) { }

    createAuthWit(messageHash: Fr): Promise<AuthWitness> {
        const ecdsa = new Ecdsa();
        const signature = ecdsa.constructSignature(messageHash.toBuffer(), this.signingPrivateKey);
        return Promise.resolve(new AuthWitness(messageHash, [...signature.r, ...signature.s]));
    }
}
