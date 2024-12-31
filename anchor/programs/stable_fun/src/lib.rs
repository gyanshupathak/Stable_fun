#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount, burn , Burn},
    metadata::{
        create_metadata_accounts_v3,
        mpl_token_metadata::types::DataV2,
        CreateMetadataAccountsV3, 
    },
};
use switchboard_on_demand::on_demand::accounts::pull_feed::PullFeedAccountData;
use switchboard_on_demand::prelude::rust_decimal::prelude::ToPrimitive;

// Declare the program ID
declare_id!("BmJdSchRjGygUrMEHz5B2C31VTfiK6uoTcSb3ar9L1XN");

#[program]
pub mod stable_fun {
    use super::*;

    // Initialize a new stablecoin mint
    pub fn initialize_mint(ctx: Context<InitializeMint>, metadata: InitTokenParams) -> Result<()> {
        let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
        let signer = [&seeds[..]];

        let token_data: DataV2 = DataV2 {
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let metadata_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                payer: ctx.accounts.payer.to_account_info(),
                update_authority: ctx.accounts.mint.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                mint_authority: ctx.accounts.mint.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            &signer
        );


        create_metadata_accounts_v3(
            metadata_ctx,
            token_data,
            false,
            true,
            None,
        )?;

        msg!("Token mint created successfully.");

        Ok(())
    }

    // Mint stablecoins to a user's wallet
    pub fn mint_tokens(ctx: Context<MintTokens>, quantity: u64) -> Result<()> {
        // Get price directly from feed account
        let feed_account = ctx.accounts.feed.data.borrow();
        let feed = PullFeedAccountData::parse(feed_account).unwrap();     
        let price = feed.value()
            .and_then(|p| p.to_f64())
            .ok_or(ErrorCode::FailedToConvertExchangeRateTof64)?;

        // Adjust quantity based on price (quantity / price since we're minting)
        let adjusted_quantity = ((quantity as f64) / price).round() as u64;

        let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
        let signer = [&seeds[..]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    authority: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
                &signer,
            ),
            adjusted_quantity,
        )?;
        
        msg!(
            "Successfully minted {} stablecoins at price {}", 
            adjusted_quantity,
            price
        );
        Ok(())
    }
    // Redeem stablecoins and burn tokens
    pub fn redeem_stablecoin(ctx: Context<RedeemStablecoin>, quantity: u64) -> Result<()> {
        // Get price directly from feed account
        let feed_account = ctx.accounts.feed.data.borrow();
        let feed = PullFeedAccountData::parse(feed_account).unwrap();     
        let price = feed.value()
            .and_then(|p| p.to_f64())
            .ok_or(ErrorCode::FailedToConvertExchangeRateTof64)?;

        // Adjust quantity based on price (quantity * price since we're redeeming)
        let adjusted_quantity = ((quantity as f64) * price).round() as u64;

        let seeds = &["mint".as_bytes(), &[ctx.bumps.mint]];
        let signer = [&seeds[..]];

        burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
                &signer,
            ),
            adjusted_quantity,
        )?;

        msg!(
            "Redeemed {} stablecoins at price {}", 
            adjusted_quantity,
            price
        );
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    params: InitTokenParams
)]
pub struct InitializeMint<'info> {
    /// CHECK: New Metaplex Account being created
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    #[account(
        init,
        seeds = [b"mint"],
        bump,
        payer = payer,
        mint::decimals = params.decimals,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(
        mut,
        seeds = [b"mint"],
        bump,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
    )]
    pub destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub feed: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RedeemStablecoin<'info> {
    #[account(
        mut,
        seeds = [b"mint"],
        bump,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,

    pub feed: AccountInfo<'info>,
}

// Defining the init token params
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub target_currency: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid Exchange Rate")]
    InvalidExchangeRate,
    #[msg("Failed to parse feed data")]
    FailedToParseFeedData,
    #[msg("Failed to get exchange rate value")]
    FailedToGetExchangeRateValue,
    #[msg("Failed to convert exchange rate to f64")]
    FailedToConvertExchangeRateTof64,
}