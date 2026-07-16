import { redirect } from "next/navigation";

/** Entry: waitlist first. Marketing landing lives at /home. */
export default function RootPage() {
  redirect("/waitlist");
}
