import { toast } from 'sonner'

export function useTransactionToast() {
  return (signature: string) => {
    toast('Transaction sent', {
      description: "View Transaction",
    })
  }
}
