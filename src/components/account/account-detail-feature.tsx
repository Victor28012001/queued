import { useMemo } from 'react'
import { useParams } from 'react-router'

import { AccountBalance, AccountButtons, AccountTokens, AccountTransactions } from './account-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '../../lib/utils'

export default function AccountDetailFeature() {
  const params = useParams() as { address: string }

  const address = useMemo(() => {
    if (!params.address) return null
    return params.address
  }, [params])

  if (!address) {
    return <div>Error loading account</div>
  }

  return (
    <div>
      <AppHero
        title={<AccountBalance />}
        subtitle={
          <div className="my-4 font-mono">
            {ellipsify(address)}
          </div>
        }
      >
        <div className="my-4">
          <AccountButtons />
        </div>
      </AppHero>

      <div className="space-y-8">
        <AccountTokens />
        <AccountTransactions />
      </div>
    </div>
  )
}