import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { SuiClient } from '@onelabs/sui/client'

interface WalletState {
  connected: boolean
  address: string | null
  client: SuiClient | null
  chainId: string | null
  isCorrectChain: boolean
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  installWallet: () => void
  isWalletInstalled: () => boolean
  signTransaction: (input: { transaction: string }) => Promise<{ signature: string }>
  executeTransaction: (transactionBlock: any) => Promise<any>
  checkChain: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | null>(null)

// Storage keys
const WALLET_STORAGE_KEY = 'onechain_wallet_connected'
const WALLET_ADDRESS_KEY = 'onechain_wallet_address'

// Helper functions (copied from original hook)
const getWallet = (): any => {
  if (typeof window === 'undefined') return null

  if ((window.navigator as any).wallets) {
    const wallets = (window.navigator as any).wallets
    const oneWallet = wallets.find(
      (w: any) =>
        w.name?.toLowerCase().includes('one') ||
        w.name?.toLowerCase().includes('onewallet') ||
        w.name?.toLowerCase().includes('sui'),
    )
    if (oneWallet) return oneWallet
    if (wallets.length > 0) return wallets[0]
  }

  const checks = [
    (window as any).onechain,
    (window as any).onechainWallet,
    (window as any).onewallet,
    (window as any).oneWallet,
    (window as any).OneWallet,
    (window as any).suiWallet,
    (window as any).wallet,
    (window as any).__ONE_WALLET__,
    (window as any).__oneWallet__,
  ]

  for (const check of checks) {
    if (check) return check
  }
  return null
}

const getSuiProvider = (wallet: any): any => {
  if (!wallet) return null
  if (wallet.sui) return wallet.sui
  return wallet
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  // Load persisted state
  const loadPersistedState = (): { connected: boolean; address: string | null } => {
    if (typeof window === 'undefined') return { connected: false, address: null }
    try {
      const connected = localStorage.getItem(WALLET_STORAGE_KEY) === 'true'
      const address = localStorage.getItem(WALLET_ADDRESS_KEY)
      return { connected, address }
    } catch {
      return { connected: false, address: null }
    }
  }

  const persistedState = loadPersistedState()

  const [walletState, setWalletState] = useState<WalletState>({
    connected: persistedState.connected,
    address: persistedState.address,
    client: null,
    chainId: null,
    isCorrectChain: false,
  })
  const [walletAvailable, setWalletAvailable] = useState(false)

  const networks = {
    testnet: { url: 'https://rpc-testnet.onelabs.cc:443' },
    mainnet: { url: 'https://rpc-mainnet.onelabs.cc:443' },
  }
  type NetworkKey = keyof typeof networks
  const NETWORK_RPC = (import.meta.env.VITE_NETWORK as NetworkKey) || 'testnet'
  // OneChain Testnet chain identifier
  const ONECHAIN_TESTNET_CHAIN = 'onechain:testnet' // Common identifier for OneChain Testnet

  // Initialize client
  useEffect(() => {
    const client = new SuiClient({
      url: networks[NETWORK_RPC].url,
    })
    setWalletState((prev) => ({ ...prev, client }))
  }, [])

  // Check wallet availability
  useEffect(() => {
    const checkWallet = () => {
      const wallet = getWallet()
      if (wallet) {
        setWalletAvailable(true)
        const suiProvider = getSuiProvider(wallet)

        // Auto-reconnect if persisted or if provider is already connected
        if (suiProvider) {
          const accounts = suiProvider.accounts || wallet.accounts
          if (accounts && accounts.length > 0) {
            const address = accounts[0].address || accounts[0]
            const addressStr = typeof address === 'string' ? address : String(address)

            // Only update if state is different (to avoid loops)
            if (!walletState.connected || walletState.address !== addressStr) {
              setWalletState((prev) => ({
                ...prev,
                connected: true,
                address: addressStr,
              }))
              localStorage.setItem(WALLET_STORAGE_KEY, 'true')
              localStorage.setItem(WALLET_ADDRESS_KEY, addressStr)
            }
          }
        }
      } else {
        setWalletAvailable(false)
      }
    }

    checkWallet()
    const handleLoad = () => checkWallet()
    window.addEventListener('load', handleLoad)

    // Accounts changed listener
    const handleAccountsChanged = () => {
      console.log('Account changed event')
      checkWallet()
    }

    window.addEventListener('onewallet#accountsChanged', handleAccountsChanged)
    window.addEventListener('oneWallet#accountsChanged', handleAccountsChanged)
    window.addEventListener('accountsChanged', handleAccountsChanged)

    return () => {
      window.removeEventListener('load', handleLoad)
      window.removeEventListener('onewallet#accountsChanged', handleAccountsChanged)
      window.removeEventListener('oneWallet#accountsChanged', handleAccountsChanged)
      window.removeEventListener('accountsChanged', handleAccountsChanged)
    }
  }, []) // Empty dependency array to run once

  const installWallet = () => {
    window.open('https://onelabs.cc', '_blank')
  }

  const connect = async () => {
    try {
      const wallet = getWallet()
      if (!wallet) {
        installWallet()
        return
      }

      const suiProvider = getSuiProvider(wallet)
      if (!suiProvider) {
        alert('Sui provider not found')
        return
      }

      // Try connect
      if (typeof suiProvider.connect === 'function') {
        await suiProvider.connect()
        // State update will be handled by re-check or event
        // But let's force check immediately
        const accounts = await suiProvider.getAccounts()
        if (accounts && accounts.length > 0) {
          const address = accounts[0].address || accounts[0]
          const addressStr = typeof address === 'string' ? address : String(address)
          setWalletState((prev) => ({ ...prev, connected: true, address: addressStr }))
          localStorage.setItem(WALLET_STORAGE_KEY, 'true')
          localStorage.setItem(WALLET_ADDRESS_KEY, addressStr)
          // Check chain after connecting
          await checkChain()
        }
      }
    } catch (error) {
      console.error('Connect failed:', error)
      alert('Failed to connect wallet')
    }
  }

  const disconnect = async () => {
    try {
      const wallet = getWallet()
      if (wallet) {
        const suiProvider = getSuiProvider(wallet)
        if (suiProvider && typeof suiProvider.disconnect === 'function') {
          await suiProvider.disconnect()
        } else if (typeof wallet.disconnect === 'function') {
          await wallet.disconnect()
        }
      }
    } catch (e) {
      console.error('Disconnect error:', e)
    } finally {
      setWalletState((prev) => ({ ...prev, connected: false, address: null }))
      localStorage.removeItem(WALLET_STORAGE_KEY)
      localStorage.removeItem(WALLET_ADDRESS_KEY)
    }
  }

  const isWalletInstalled = () => walletAvailable

  const signTransaction = async (input: { transaction: string }) => {
    const wallet = getWallet()
    const suiProvider = getSuiProvider(wallet)
    if (suiProvider && suiProvider.signTransaction) {
      return await suiProvider.signTransaction(input)
    }
    throw new Error('Sign transaction not supported')
  }

  const executeTransaction = async (transactionBlock: any) => {
    console.log('executeTransaction called', { hasWallet: !!getWallet() })
    const wallet = getWallet()
    const suiProvider = getSuiProvider(wallet)

    // Set a default gas budget if not set
    if (!transactionBlock.gasConfig?.budget) {
      // Set a reasonable gas budget (0.01 SUI = 10,000,000 MIST)
      transactionBlock.setGasBudget?.(10000000)
    }

    // Try different wallet APIs
    try {
      // Newer wallet API
      if (suiProvider?.signAndExecuteTransaction) {
        console.log('Using signAndExecuteTransaction')
        const result = await suiProvider.signAndExecuteTransaction({
          transaction: transactionBlock,
          options: {
            showEffects: true,
            showObjectChanges: true,
            showEvents: true,
          },
          requestType: 'WaitForEffectsCert',
        })
        console.log('Transaction result:', result)
        return result
      }

      // Older wallet API
      if (suiProvider?.signAndExecuteTransactionBlock) {
        console.log('Using signAndExecuteTransactionBlock')
        const result = await suiProvider.signAndExecuteTransactionBlock({
          transactionBlock,
          options: {
            showEffects: true,
            showObjectChanges: true,
            showEvents: true,
          },
        })
        console.log('Transaction result:', result)
        return result
      }

      throw new Error('Execute transaction not supported by this wallet')
    } catch (error: any) {
      console.error('Transaction execution error:', error)

      // Handle specific error types
      if (error.code === 4001) {
        console.log('User rejected the transaction')
        throw new Error('User rejected the transaction')
      }

      if (error.message?.includes('insufficient gas')) {
        console.log('Insufficient gas, trying with higher budget...')
        // Retry with higher gas budget
        transactionBlock.setGasBudget?.(50000000)
        return executeTransaction(transactionBlock)
      }

      throw error
    }
  }

  const checkChain = async () => {
    try {
      const wallet = getWallet()
      if (!wallet) {
        setWalletState((prev) => ({ ...prev, chainId: null, isCorrectChain: false }))
        return
      }

      const suiProvider = getSuiProvider(wallet)
      if (!suiProvider) {
        setWalletState((prev) => ({ ...prev, chainId: null, isCorrectChain: false }))
        return
      }

      // Try to get chain info from provider
      let chainId: string | null = null
      let isCorrectChain = false

      // Method 1: Try getChain() method
      if (typeof suiProvider.getChain === 'function') {
        try {
          chainId = await suiProvider.getChain()
        } catch (e) {
          console.log('getChain() not available:', e)
        }
      }

      // Method 2: Try chain property
      if (!chainId && suiProvider.chain) {
        chainId = suiProvider.chain
      }

      // Method 3: Check RPC URL if available
      if (!chainId && suiProvider.rpcUrl) {
        const rpcUrl = suiProvider.rpcUrl
        if (rpcUrl.includes('testnet.onelabs.cc') || rpcUrl.includes('onelabs.cc')) {
          chainId = ONECHAIN_TESTNET_CHAIN
        }
      }

      // Method 4: Check if client can connect to testnet (fallback)
      if (!chainId && walletState.client) {
        try {
          // Try to get chain info from RPC
          const chainInfo = await walletState.client.getChainIdentifier()
          if (chainInfo) {
            chainId = chainInfo
          }
        } catch (e) {
          console.log('Could not get chain from client:', e)
        }
      }

      // Determine if correct chain
      // OneChain Testnet should be identified as "testnet"
      if (chainId) {
        const chainLower = chainId.toLowerCase().trim()
        // Check if chain is exactly "testnet" or contains "testnet" (case-insensitive)
        isCorrectChain = chainLower === NETWORK_RPC || chainLower.includes(NETWORK_RPC)
      } else {
        // If we can't determine chain, assume it might be correct if connected
        // This is a fallback - ideally wallet should provide chain info
        isCorrectChain = walletState.connected
      }

      setWalletState((prev) => ({ ...prev, chainId, isCorrectChain }))
    } catch (error) {
      console.error('Failed to check chain:', error)
      setWalletState((prev) => ({ ...prev, chainId: null, isCorrectChain: false }))
    }
  }

  // Check chain when wallet state changes
  useEffect(() => {
    if (walletState.connected && walletState.address) {
      checkChain()
    } else {
      setWalletState((prev) => ({ ...prev, chainId: null, isCorrectChain: false }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletState.connected, walletState.address])

  return (
    <WalletContext.Provider
      value={{
        ...walletState,
        connect,
        disconnect,
        installWallet,
        isWalletInstalled,
        signTransaction,
        executeTransaction,
        checkChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useOneWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useOneWallet must be used within a WalletProvider')
  }
  return context
}
