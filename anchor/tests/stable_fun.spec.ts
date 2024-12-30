import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {StableFun} from '../target/types/stable_fun'

describe('stable_fun', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.StableFun as Program<StableFun>

  const stable_funKeypair = Keypair.generate()

  it('Initialize StableFun', async () => {
    await program.methods
      .initialize()
      .accounts({
        stable_fun: stable_funKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([stable_funKeypair])
      .rpc()

    const currentCount = await program.account.stable_fun.fetch(stable_funKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment StableFun', async () => {
    await program.methods.increment().accounts({ stable_fun: stable_funKeypair.publicKey }).rpc()

    const currentCount = await program.account.stable_fun.fetch(stable_funKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment StableFun Again', async () => {
    await program.methods.increment().accounts({ stable_fun: stable_funKeypair.publicKey }).rpc()

    const currentCount = await program.account.stable_fun.fetch(stable_funKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement StableFun', async () => {
    await program.methods.decrement().accounts({ stable_fun: stable_funKeypair.publicKey }).rpc()

    const currentCount = await program.account.stable_fun.fetch(stable_funKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set stable_fun value', async () => {
    await program.methods.set(42).accounts({ stable_fun: stable_funKeypair.publicKey }).rpc()

    const currentCount = await program.account.stable_fun.fetch(stable_funKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the stable_fun account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        stable_fun: stable_funKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.stable_fun.fetchNullable(stable_funKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
