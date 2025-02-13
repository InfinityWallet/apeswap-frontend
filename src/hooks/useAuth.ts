import { useCallback } from 'react'
import { useWeb3React, UnsupportedChainIdError } from '@web3-react/core'
import { NoBscProviderError } from '@binance-chain/bsc-connector'
import {
  NoEthereumProviderError,
  UserRejectedRequestError as UserRejectedRequestErrorInjected,
} from '@web3-react/injected-connector'
import {
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect,
  WalletConnectConnector,
} from '@web3-react/walletconnect-connector'
import { ConnectorNames, localStorageKey } from '@ape.swap/uikit'
import { connectorsByName } from 'utils/web3React'
import { setupNetwork } from 'utils/wallet'
import { useNetworkChainId, useToast } from 'state/hooks'
import { profileClear } from 'state/profile'

import { useDispatch } from 'react-redux'
import { useTranslation } from 'contexts/Localization'

const useAuth = () => {
  const { activate, deactivate } = useWeb3React()
  const chainId = useNetworkChainId()
  const { toastError } = useToast()
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const login = useCallback((connectorID: ConnectorNames) => {
    const connector = connectorsByName[connectorID]
    if (connector) {
      activate(connector, async (error: Error) => {
        if (error instanceof UnsupportedChainIdError) {
          const hasSetup = await setupNetwork(chainId)
          if (hasSetup) {
            activate(connector)
          }
        } else {
          window.localStorage.removeItem(localStorageKey)
          if (error instanceof NoEthereumProviderError || error instanceof NoBscProviderError) {
            toastError(t('Use a crypto wallet app’s browser to connect to ApeSwap.'), {
              text: 'Learn More',
              url: 'https://apeswap.gitbook.io/apeswap-finance/product-and-features/wallets/how-to-use-apeswap-on-mobile-devices',
            })
          } else if (
            error instanceof UserRejectedRequestErrorInjected ||
            error instanceof UserRejectedRequestErrorWalletConnect
          ) {
            if (connector instanceof WalletConnectConnector) {
              const walletConnector = connector as WalletConnectConnector
              walletConnector.walletConnectProvider = null
            }
            toastError(t('Authorization Error, Please authorize to access your account'))
          } else {
            toastError(`${error.name}, ${error.message}`)
          }
        }
      })
    } else {
      console.info('Unable to find connector', 'The connector config is wrong')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = useCallback(() => {
    dispatch(profileClear())
    deactivate()
    if (window.localStorage.getItem('walletconnect')) {
      connectorsByName.walletconnect.close()
      connectorsByName.walletconnect.walletConnectProvider = null
    }
  }, [deactivate, dispatch])

  return { login, logout }
}

export default useAuth
