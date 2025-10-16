"use client"
import { useRouter } from "next/navigation"
export default function ScriptsRedirect() {
    const router = useRouter()
    router.push("/dashboard")
    return;
}