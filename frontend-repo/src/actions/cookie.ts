// app/actions/cookieActions.ts (or wherever deleteCookie is)
"use server";

import { cookies } from "next/headers";
import {redirect} from "next/navigation";

export async function deleteCookie(name: string) {
  console.log(`Attempting to delete cookie: ${name}`);

  const cookieStore = await cookies();
  cookieStore.set({
    name: name,
    value: "", // Set an empty value
    expires: new Date(0), // Set expiry to a past date (epoch)
    maxAge: 0, // Explicitly set maxAge to 0 for immediate invalidation
    path: "/", // Crucial: Ensure the path matches the cookie's path
    // Add other attributes if your original cookie had them, e.g.:
    // domain: 'yourdomain.com',
    // secure: process.env.NODE_ENV === 'production',
    // httpOnly: true,
    // sameSite: 'Lax',
  });

  console.log(`Cookie deletion command sent for: ${name}`);

  // After sending the Set-Cookie header for deletion,
  // tell Next.js to redirect the user to a public page.
  // This ensures the browser processes the Set-Cookie before the new navigation.
  redirect("/");
}

export async function getCookie(name: string): Promise<string | null> {
  const cookie = await (await cookies()).get(name);
  return cookie?.value ?? null;
}
