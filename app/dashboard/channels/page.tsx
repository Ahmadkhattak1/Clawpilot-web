import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardChannelsPage() {
  return (
    <main className="min-h-[100dvh] bg-background px-4 py-10 sm:px-6 md:px-10 md:py-14">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">OpenClaw</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Channels</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Channel management is no longer handled in ClawPilot. Make channel changes directly inside your hosted
            OpenClaw gateway.
          </p>
        </div>

        <Card className="border-border/70">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-lg">Manage channels in OpenClaw</CardTitle>
            <CardDescription className="text-sm leading-6">
              Launch your gateway to connect or change WhatsApp, Telegram, and other channel settings there.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="sm:min-w-44">
              <Link href="/dashboard/chat">Launch OpenClaw</Link>
            </Button>
            <Button asChild variant="outline" className="sm:min-w-44">
              <Link href="/settings">Back to settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
