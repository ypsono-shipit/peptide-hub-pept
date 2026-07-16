import { redirect } from "next/navigation";

/** Alias — landing is at /. */
export default function HomeAlias() {
  redirect("/");
}
