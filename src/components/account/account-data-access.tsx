import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * MOCK ONECHAIN API (replace with real OneChain SDK)
 */
async function oneGetBalance(_address: string) {
  // Replace with OneChain SDK call
  return 100 // fake balance
}

async function oneGetTransactions(_address: string) {
  // Replace with OneChain SDK call
  return [
    { hash: '0x1234abcd', amount: 10 },
    { hash: '0x5678efgh', amount: 5 },
  ]
}

async function oneSendTransaction(destination: string, amount: number) {
  // Replace with OneChain SDK call
  console.log(`Sending ${amount} ONE to ${destination}`)
  return '0xFAKE_TRANSACTION_HASH'
}

async function oneRequestAirdrop(address: string, amount: number) {
  console.log(`Airdrop ${amount} ONE to ${address}`)
  return '0xFAKE_AIRDROP_HASH'
}

/**
 * BALANCE
 */
export function useGetBalance({ address }: { address?: string }) {
  return useQuery({
    queryKey: ['get-balance', { address }],
    queryFn: () => (address ? oneGetBalance(address) : Promise.resolve(0)),
    enabled: !!address,
  })
}

/**
 * TRANSACTIONS
 */
export function useGetTransactions({ address }: { address?: string }) {
  return useQuery({
    queryKey: ['get-transactions', { address }],
    queryFn: () => (address ? oneGetTransactions(address) : Promise.resolve([])),
    enabled: !!address,
  })
}

/**
 * SEND TRANSACTION
 */
export function useTransferOne({ address }: { address?: string }) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['transfer-one', { address }],
    mutationFn: async (input: { destination: string; amount: number }) => {
      if (!address) throw new Error('Wallet not connected')
      return oneSendTransaction(input.destination, input.amount)
    },
    onSuccess: async () => {
      if (address) {
        client.invalidateQueries({ queryKey: ['get-balance', { address }] })
        client.invalidateQueries({ queryKey: ['get-transactions', { address }] })
      }
    },
  })
}

/**
 * AIRDROP
 */
export function useRequestAirdrop({ address }: { address?: string }) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['airdrop', { address }],
    mutationFn: async (amount: number = 1) => {
      if (!address) throw new Error('Wallet not connected')
      return oneRequestAirdrop(address, amount)
    },
    onSuccess: async () => {
      if (address) {
        client.invalidateQueries({ queryKey: ['get-balance', { address }] })
        client.invalidateQueries({ queryKey: ['get-transactions', { address }] })
      }
    },
  })
}