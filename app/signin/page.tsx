import type { Metadata } from "next"
import { SignInPage } from '@/components/ui/sign-in'

export const metadata: Metadata = {
  title: "Sign in with Google",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SignInRoute() {
  return <SignInPage />
}
