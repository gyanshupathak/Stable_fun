// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import StableFunIDL from '../target/idl/stable_fun.json'
import type { StableFun } from '../target/types/stable-fun'

// Re-export the generated IDL and type
export { StableFun, StableFunIDL }

// The programId is imported from the program IDL.
export const STABLE_FUN_PROGRAM_ID = new PublicKey(StableFunIDL.address)

// This is a helper function to get the StableFun Anchor program.
export function getStableFunProgram(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...StableFunIDL, address: address ? address.toBase58() : StableFunIDL.address } as StableFun, provider)
}

// This is a helper function to get the program ID for the StableFun program depending on the cluster.
export function getStableFunProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the StableFun program on devnet and testnet.
      return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case 'mainnet-beta':
    default:
      return STABLE_FUN_PROGRAM_ID
  }
}
