"use client"

import Script from "next/script"
import { useEffect, useMemo, useRef, useState } from "react"

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (element?: HTMLElement) => void
        createTweet?: (id: string, element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLElement>
      }
    }
  }
}

export function SocialProof() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(6)
  const [scriptReady, setScriptReady] = useState(false)
  const tweets = useMemo(
    () => [
      { url: "https://x.com/therno/status/2014216984267780431", handle: "@therno" },
      { url: "https://x.com/danpeguine/status/2014760164113477700", handle: "@danpeguine" },
      { url: "https://x.com/nateliason/status/2013725082850414592", handle: "@nateliason" },
      { url: "https://x.com/markjaquith/status/2010430366944055433", handle: "@markjaquith" },
      { url: "https://x.com/AryehDubois/status/2011742378655432791", handle: "@AryehDubois" },
      { url: "https://x.com/jonahships_/status/2010605025844723765", handle: "@jonahships_" },
      { url: "https://x.com/nickvasiles/status/2014790519529095447", handle: "@nickvasiles" },
      { url: "https://x.com/nathanclark_/status/2014647048612773912", handle: "@nathanclark_" },
      { url: "https://x.com/lycfyi/status/2014513697557758002", handle: "@lycfyi" },
      { url: "https://x.com/davemorin/status/2013723700668096605", handle: "@davemorin" },
      { url: "https://x.com/cnakazawa/status/2014145277465432519", handle: "@cnakazawa" },
      { url: "https://x.com/christinetyip/status/2010776377931575569", handle: "@christinetyip" },
      { url: "https://x.com/jdrhyne/status/2010155191731950036", handle: "@jdrhyne" },
      { url: "https://x.com/AlbertMoral/status/2010288787885064227", handle: "@AlbertMoral" },
      { url: "https://x.com/jakubkrcmar/status/2011186102367814135", handle: "@jakubkrcmar" },
      { url: "https://x.com/darrwalk/status/2010426677730660603", handle: "@darrwalk" },
      { url: "https://x.com/KrauseFx/status/2008531076487246176", handle: "@KrauseFx" },
      { url: "https://x.com/Hormold/status/2011133394764382583", handle: "@Hormold" },
      { url: "https://x.com/KKaWSB/status/2015445691532001624", handle: "@KKaWSB" },
    ],
    []
  )

  const visibleTweets = useMemo(() => tweets.slice(0, visibleCount), [tweets, visibleCount])

  const [loadedIds, setLoadedIds] = useState<Record<string, boolean>>({})

  const getTweetId = (url: string) => {
    const parts = url.split("/")
    const last = parts[parts.length - 1] || ""
    return last.split("?")[0]
  }

  const pendingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!scriptReady || typeof window === "undefined") return
    const twttr = window.twttr
    if (!twttr?.widgets?.createTweet || !containerRef.current) return
    const createTweet = twttr.widgets.createTweet

    visibleTweets.forEach((tweet) => {
      const id = getTweetId(tweet.url)
      if (!id || loadedIds[id] || pendingRef.current.has(id)) return
      const container = document.getElementById(`tweet-${id}`)
      if (!container || container.childElementCount > 0) return

      pendingRef.current.add(id)
      createTweet(id, container, { dnt: true, theme: "light", conversation: "none" })
        .then(() => {
          setLoadedIds((prev) => ({ ...prev, [id]: true }))
        })
        .catch(() => {
          // Keep fallback if embed fails
        })
        .finally(() => {
          pendingRef.current.delete(id)
        })
    })
  }, [scriptReady, visibleTweets, loadedIds])

  return (
    <section id="social-proof" className="relative py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="type-h2 mb-4">
            People are already running serious work with OpenClaw
          </h2>
          <p className="type-body mx-auto max-w-2xl">
            Real posts. Linked to source. Fast to scan.
          </p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleTweets.map((tweet, index) => {
            const id = getTweetId(tweet.url)
            return (
              <div
                key={`${tweet.url}-${index}`}
                className="rounded-xl border border-border/50 bg-secondary/40 p-3 overflow-hidden"
              >
                <div id={`tweet-${id}`} />
                {!loadedIds[id] && (
                  <div className="type-nav py-4 text-muted-foreground">
                    <a
                      href={tweet.url.replace("https://x.com/", "https://twitter.com/")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      View post by {tweet.handle}
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {visibleCount < tweets.length && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + 6, tweets.length))}
              className="type-nav rounded-lg border border-border bg-background px-4 py-2 text-foreground transition-colors hover:bg-muted"
            >
              Load more posts
            </button>
          </div>
        )}
      </div>
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptReady(true)
        }}
      />
    </section>
  )
}
