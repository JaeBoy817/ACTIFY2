import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/sign-in`);
  }

  const dbUser = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!dbUser) {
    return NextResponse.json({ error: "User not provisioned" }, { status: 400 });
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app/settings`, { status: 303 });
}
