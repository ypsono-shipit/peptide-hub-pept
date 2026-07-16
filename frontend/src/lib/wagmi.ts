import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodChainMainnet, robinhoodChainTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [robinhoodChainTestnet, robinhoodChainMainnet],
  connectors: [injected()],
  transports: {
    [robinhoodChainTestnet.id]: http(
      process.env.NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com",
    ),
    [robinhoodChainMainnet.id]: http(
      process.env.NEXT_PUBLIC_ROBINHOOD_MAINNET_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com",
    ),
  },
});
