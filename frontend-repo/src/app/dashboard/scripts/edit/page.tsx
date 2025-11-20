"use client"
import { useRouter } from "next/navigation"
export default function ScriptsEditRedirect() {
    const router = useRouter()
    router.push("/dashboard")
    return;
}
