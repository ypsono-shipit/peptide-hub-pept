import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodChainTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [robinhoodChainTestnet],
  connectors: [injected()],
  transports: {
    [robinhoodChainTestnet.id]: http(),
  },
});
