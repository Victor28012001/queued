import { RefreshCw } from 'lucide-react'
import { useState, useMemo } from 'react'

import { useOneWallet } from '@/hooks/useOneWallet'
import { ellipsify } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { AppAlert } from '@/components/app-alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AppModal } from '@/components/app-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * MOCK HOOKS (replace with real OneChain API later)
 */
function useGetBalance(address?: string) {
  return {
    data: address ? 100 : null, // fake balance
    isLoading: false,
    isError: false,
    refetch: async () => {},
  }
}

function useGetTransactions(_address?: string) {
  return {
    data: [],
    isLoading: false,
    isError: false,
    refetch: async () => {},
  }
}

function useSendTransaction() {
  return {
    isPending: false,
    mutateAsync: async ({ destination, amount }: { destination: string; amount: number }) => {
      console.log('Sending', amount, 'to', destination)
    },
  }
}

/**
 * BALANCE
 */
export function AccountBalance() {
  const { address } = useOneWallet()
  const query = useGetBalance(address ?? undefined)

  return (
    <h1 className="text-5xl font-bold cursor-pointer" onClick={() => query.refetch()}>
      {query.data ?? '...'}
    </h1>
  )
}

/**
 * CHECKER
 */
export function AccountChecker() {
  const { connected, address } = useOneWallet()

  if (!connected || !address) return null

  return <AccountBalanceCheck address={address} />
}

export function AccountBalanceCheck({ address }: { address: string }) {
  const query = useGetBalance(address)

  if (query.isLoading) return null

  if (query.isError || query.data === null) {
    return (
      <AppAlert>
        Wallet connected but account not found.
      </AppAlert>
    )
  }

  return null
}

/**
 * BUTTONS
 */
export function AccountButtons() {
  const { address } = useOneWallet()

  if (!address) return null

  return (
    <div className="space-x-2">
      <ModalSend address={address} />
      <ModalReceive address={address} />
    </div>
  )
}

/**
 * TOKENS (placeholder)
 */
export function AccountTokens() {
  return (
    <div className="text-gray-400">
      Token support coming soon (OneChain integration)
    </div>
  )
}

/**
 * TRANSACTIONS
 */
export function AccountTransactions() {
  const { address } = useOneWallet()
  const query = useGetTransactions(address ?? undefined)
  const [showAll, setShowAll] = useState(false)

  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Transaction History</h2>

        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCw size={16} />
        </Button>
      </div>

      {query.data?.length === 0 ? (
        <div>No transactions found.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hash</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items?.map((tx: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-mono">
                  {ellipsify(tx.hash || '0x...')}
                </TableCell>
                <TableCell className="text-right">
                  {tx.amount || 0}
                </TableCell>
              </TableRow>
            ))}

            {(query.data?.length ?? 0) > 5 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center">
                  <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                    {showAll ? 'Show Less' : 'Show All'}
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

/**
 * RECEIVE
 */
function ModalReceive({ address }: { address: string }) {
  return (
    <AppModal title="Receive">
      <p>Send assets to:</p>
      <code>{address}</code>
    </AppModal>
  )
}

/**
 * SEND
 */
function ModalSend({ address }: { address: string }) {
  const { connected } = useOneWallet()
  const mutation = useSendTransaction()

  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('1')

  if (!connected) {
    return <div>Wallet not connected</div>
  }

  return (
    <AppModal
      title="Send"
      submitDisabled={!destination || !amount || mutation.isPending}
      submitLabel="Send"
      submit={() => {
        mutation.mutateAsync({
          destination,
          amount: parseFloat(amount),
        })
      }}
    >
      <div className="text-sm text-gray-500">From: {ellipsify(address)}</div>

      <Label htmlFor="destination">Destination</Label>
      <Input
        id="destination"
        onChange={(e) => setDestination(e.target.value)}
        value={destination}
        placeholder="Wallet address"
      />

      <Label htmlFor="amount">Amount</Label>
      <Input
        id="amount"
        type="number"
        onChange={(e) => setAmount(e.target.value)}
        value={amount}
      />
    </AppModal>
  )
}