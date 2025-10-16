import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(request: NextRequest) {
  try {
    // Get the customer ID from your database based on the authenticated user
    // fetch req to NEXT_PUBLIC_BACKEND_URL/api/users/profile
    // Get the session_id cookie from the request
    const cookies = request.cookies;
    const sessionId = cookies.get("session_id")?.value;

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/profile`, {
      method: "GET",
      headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sessionId}`
      }
    });

    const data = await response.json();

    const customerId = data.data.user.subscription.stripeCustomerId;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${request.headers.get("origin")}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error creating portal session" },
      { status: 500 }
    );
  }
}
