'use client'

import { getStableFunProgram, getStableFunProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

export function useStableFunProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getStableFunProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getStableFunProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['stable_fun', 'all', { cluster }],
    queryFn: () => program.account.stable_fun.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['stable_fun', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ stable_fun: keypair.publicKey }).signers([keypair]).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useStableFunProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useStableFunProgram()

  const accountQuery = useQuery({
    queryKey: ['stable_fun', 'fetch', { cluster, account }],
    queryFn: () => program.account.stable_fun.fetch(account),
  })

  const closeMutation = useMutation({
    mutationKey: ['stable_fun', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ stable_fun: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['stable_fun', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ stable_fun: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['stable_fun', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ stable_fun: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['stable_fun', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ stable_fun: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
  }
}
