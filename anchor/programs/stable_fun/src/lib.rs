#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod stable_fun {
    use super::*;

  pub fn close(_ctx: Context<CloseStableFun>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.stable_fun.count = ctx.accounts.stable_fun.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.stable_fun.count = ctx.accounts.stable_fun.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeStableFun>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.stable_fun.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeStableFun<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + StableFun::INIT_SPACE,
  payer = payer
  )]
  pub stable_fun: Account<'info, StableFun>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseStableFun<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub stable_fun: Account<'info, StableFun>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub stable_fun: Account<'info, StableFun>,
}

#[account]
#[derive(InitSpace)]
pub struct StableFun {
  count: u8,
}
