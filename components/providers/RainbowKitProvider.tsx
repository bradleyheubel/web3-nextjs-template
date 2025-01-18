'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { State, WagmiProvider, useDisconnect, useAccount } from 'wagmi';
import {
  RainbowKitProvider as NextRainbowKitProvider,
  RainbowKitAuthenticationProvider
} from '@rainbow-me/rainbowkit';
import { ReactNode, useState, useEffect } from 'react';
import ReactQueryProvider from './ReactQueryProvider';
import wagmiConfig from '@/lib/config/wagmi';
import { authenticationAdapter } from '@/lib/utils/authenticationAdapter';
import useAsyncEffect from '@/lib/hooks/useAsyncEffect';
import { isAuthAction } from '@/lib/actions/auth';
import { Optional } from '@/lib/types/common';
import { eventEmitter } from '@/lib/config/clients/eventEmitter';
import { EMITTER_EVENTS } from '@/lib/constants';

function WalletWatcher() {
  const { isConnected } = useAccount();
  
  useEffect(() => {
    if (!isConnected) {
      authenticationAdapter.signOut();
    }
  }, [isConnected]);

  // Check auth status when wallet is connected
  useAsyncEffect(async () => {
    if (isConnected) {
      const { isAuth } = await isAuthAction();
      if (isAuth) {
        eventEmitter.emit(EMITTER_EVENTS.SIGN_IN);
      }
    }
  }, [isConnected]);

  return null;
}

type RainbowKitProviderProps = {
  children: ReactNode;
  initialState: State | undefined;
};

export default function RainbowKitProvider({
  children,
  initialState
}: RainbowKitProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState<Optional<boolean>>();

  useAsyncEffect(async () => {
    const { isAuth } = await isAuthAction();
    setIsAuth(isAuth);
    setIsLoading(false);

    const handleSignIn = () => setIsAuth(true);
    const handleSignOut = () => setIsAuth(false);

    eventEmitter.on(EMITTER_EVENTS.SIGN_IN, handleSignIn);
    eventEmitter.on(EMITTER_EVENTS.SIGN_OUT, handleSignOut);

    return () => {
      eventEmitter.off(EMITTER_EVENTS.SIGN_IN, handleSignIn);
      eventEmitter.off(EMITTER_EVENTS.SIGN_OUT, handleSignOut);
    };
  }, []);

  const status = isLoading
    ? 'loading'
    : isAuth
    ? 'authenticated'
    : 'unauthenticated';

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <ReactQueryProvider>
        <RainbowKitAuthenticationProvider
          adapter={authenticationAdapter}
          status={status}
        >
          <NextRainbowKitProvider coolMode>
            <WalletWatcher />
            {children}
          </NextRainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </ReactQueryProvider>
    </WagmiProvider>
  );
}
