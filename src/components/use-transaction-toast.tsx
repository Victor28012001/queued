import { toast } from 'sonner'

export function useTransactionToast() {
  return (_signature: string) => {
    toast('Transaction sent', {
      description: "View Transaction",
    })
  }
}
