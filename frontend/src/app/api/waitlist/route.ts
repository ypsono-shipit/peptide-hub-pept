import { NextRequest, NextResponse } from "next/server";
import { getWaitlistCount, joinWaitlist } from "@/lib/waitlist/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await getWaitlistCount();
    return NextResponse.json(
      { count, label: `${count.toLocaleString()} trader${count === 1 ? "" : "s"} in line` },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (e) {
    console.error("[waitlist] count", e);
    return NextResponse.json({ count: 0, label: "0 traders in line" }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      wallet?: string;
      xHandle?: string;
      x_handle?: string;
    };

    const result = await joinWaitlist({
      email: body.email || "",
      wallet: body.wallet,
      xHandle: body.xHandle || body.x_handle,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({
      ok: true,
      alreadyJoined: Boolean(result.alreadyJoined),
      position: result.position,
      message: result.alreadyJoined
        ? "You're already on the waitlist."
        : "You're on the list. We'll be in touch.",
    });
  } catch (e) {
    console.error("[waitlist] post", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
