import * as anchor from '@coral-xyz/anchor'
import { Program, web3, BN , AnchorProvider  } from '@coral-xyz/anchor'
import { Keypair, PublicKey } from '@solana/web3.js'
import { StableFun } from '../target/types/stable_fun'
import { assert } from 'chai'
import { before } from 'mocha';

describe('stable_fun', () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as AnchorProvider;
  const program = anchor.workspace.StableFun as Program<StableFun>;

  // Configure the client to use the local cluster.
  const METADATA_SEED = "metadata";
  const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey("BmJdSchRjGygUrMEHz5B2C31VTfiK6uoTcSb3ar9L1XN");

  // Constants from our program
  const MINT_SEED = "mint";
  // Data for our tests
  const payer = provider.wallet.publicKey;
  const metadata = {
    name: "Just a Test Token",
    symbol: "TEST",
    uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
    decimals: 9,
    target_currency: "USD"
  };
  const mintAmount = 10;
  const redeemAmount = 5;

  const [mint] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    program.programId
  );

  const [metadataAddress] = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const feedAccount = Keypair.generate();
  before(async () => {
    // Initialize feed account with mock data
    const feedTx = new web3.Transaction().add(
      web3.SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: feedAccount.publicKey,
        space: 1000, // Adjust size as needed
        lamports: await provider.connection.getMinimumBalanceForRentExemption(1000),
        programId: program.programId
      })
    );
    await provider.sendAndConfirm(feedTx, [feedAccount]);
  });

  it('Initialize stable_fun', async () => {
    const info = await provider.connection.getAccountInfo(mint);
    if (info) return;

    console.log("Mint not found. Attempting to initialize.");

    const tx = await program.methods
      .initializeMint(metadata)
      .accounts({
        metadata: metadataAddress,
        mint,
        payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .rpc();

    console.log(`  https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    const newInfo = await provider.connection.getAccountInfo(mint);
    assert(newInfo, "Mint should be initialized.");
  });

  it('Minting tokens', async () => {
    const destination = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: payer,
    });

    let initialBalance: number;
    try {
      const balance = (await provider.connection.getTokenAccountBalance(destination));
      initialBalance = balance.value.uiAmount ?? 0;
    } catch {
      initialBalance = 0;
    } 

    const tx = await program.methods
      .mintTokens(new BN(mintAmount * 10 ** metadata.decimals))
      .accounts({
        mint,
        destination,
        payer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        feed: feedAccount.publicKey,
      })
      .rpc();

    console.log(`  https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    const postBalance = (
      await provider.connection.getTokenAccountBalance(destination)
    ).value.uiAmount;
    
    assert.equal(
      initialBalance + mintAmount,
      postBalance,
      "Post balance should equal initial plus mint amount"
    );
  });

  it('Redeeming tokens', async () => {
    const userTokenAccount = await anchor.utils.token.associatedAddress({
      mint: mint,
      owner: payer,
    });

    const initialBalance = (
      await provider.connection.getTokenAccountBalance(userTokenAccount)
    ).value.uiAmount ?? 0;

    const tx = await program.methods
      .redeemStablecoin(new BN(redeemAmount * 10 ** metadata.decimals))
      .accounts({
        mint,
        userTokenAccount,
        authority: payer,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        feed: feedAccount.publicKey,
      })
      .rpc();

    console.log(`  https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    const postBalance = (
      await provider.connection.getTokenAccountBalance(userTokenAccount)
    ).value.uiAmount;

    assert.equal(
      initialBalance - redeemAmount,
      postBalance,
      "Post balance should equal initial minus redeem amount"
    );
  });
});