import { redirect } from "next/navigation";

/** Legacy path — perps live at /perps; spot is the primary market UI. */
export default function TradeRedirectPage() {
  redirect("/perps");
}
