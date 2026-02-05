"use client"

import Script from "next/script"
import { useEffect, useRef } from "react"

declare global {
  interface Window {
    twttr?: { widgets?: { load: (element?: HTMLElement) => void } }
  }
}

export function SocialProof() {
  const containerRef = useRef<HTMLDivElement>(null)
  const tweets = [
    { url: "https://x.com/blakeurmos/status/2018880632370192763", handle: "@blakeurmos" },
    { url: "https://x.com/theguti/status/2015116359458336872", handle: "@theguti" },
    { url: "https://x.com/Thomas_jebarsan/status/2017529705931681795", handle: "@Thomas_jebarsan" },
    { url: "https://x.com/cailynyongyong/status/2015974075215314976", handle: "@cailynyongyong" },
    { url: "https://x.com/Mach_500/status/2018103568130089009", handle: "@Mach_500" },
    { url: "https://x.com/ayushtweetshere/status/2018322592810287572", handle: "@ayushtweetshere" },
    { url: "https://x.com/bobtabor/status/2015148501332562005", handle: "@bobtabor" },
    { url: "https://x.com/corpojozef/status/2017482546976854093", handle: "@corpojozef" },
    { url: "https://x.com/kevu_sol/status/2018556250355577038", handle: "@kevu_sol" },
    { url: "https://x.com/miratisu_ps/status/2017961097513611645", handle: "@miratisu_ps" },
    { url: "https://x.com/emigal/status/2018089526124486973", handle: "@emigal" },
    { url: "https://x.com/kyrvag/status/2017983811577880753", handle: "@kyrvag" },
    { url: "https://x.com/pbteja1998/status/2017495026230775832", handle: "@pbteja1998" },
    { url: "https://x.com/tengyanAI/status/2019168098415440059", handle: "@tengyanAI" },
    { url: "https://x.com/GreatUGB/status/2019074825449599349", handle: "@GreatUGB" },
    { url: "https://x.com/aleph_im/status/2018986621043872013", handle: "@aleph_im" },
    { url: "https://x.com/tolibear_/status/2019475860605010221", handle: "@tolibear_" },
    { url: "https://x.com/jcdenton/status/2017547717384503706", handle: "@jcdenton" },
    { url: "https://x.com/HelloBenWhite/status/2019466934740206030", handle: "@HelloBenWhite" },
    { url: "https://x.com/AIBuzzNews/status/2019448468146692498", handle: "@AIBuzzNews" },
    { url: "https://x.com/danpeguine/status/2014760164113477700", handle: "@danpeguine" },
    { url: "https://x.com/KKaWSB/status/2015445691532001624", handle: "@KKaWSB" },
    { url: "https://x.com/Italianclownz/status/2019197499366600846", handle: "@Italianclownz" },
    { url: "https://x.com/SethiPoW_Asia/status/2019320191239573862", handle: "@SethiPoW_Asia" },
    { url: "https://x.com/NicolasZu/status/2015644177602679240", handle: "@NicolasZu" },
    { url: "https://x.com/davidtab/status/2018168237557416234", handle: "@davidtab" },
    { url: "https://x.com/convex/status/2019470415991644634", handle: "@convex" },
    { url: "https://x.com/davemorin/status/2019293290617794721", handle: "@davemorin" },
    { url: "https://x.com/yuri_namikawa/status/2019281013055320526", handle: "@yuri_namikawa" },
    { url: "https://x.com/kjoh94/status/2018291103217443000", handle: "@kjoh94" },
    { url: "https://x.com/dashwizzle/status/2019015619920703853", handle: "@dashwizzle" },
    { url: "https://x.com/alexbuilds91/status/2018594395529056746", handle: "@alexbuilds91" },
    { url: "https://x.com/Muzzy5150/status/2019387356944760956", handle: "@Muzzy5150" },
  ]

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.twttr?.widgets?.load && containerRef.current) {
      window.twttr.widgets.load(containerRef.current)
    }
  }, [])

  return (
    <section id="social-proof" className="relative py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
            What people are saying about OpenClaw
          </h2>
          <p className="text-muted-foreground text-[15px]">
            Real posts from the community, linked to the original source.
          </p>
        </div>

        <div ref={containerRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tweets.map((tweet, index) => (
            <div
              key={`${tweet.url}-${index}`}
              className="rounded-xl border border-border/50 bg-secondary/40 p-4"
            >
              <blockquote className="twitter-tweet" data-dnt="true">
                <a href={tweet.url}>View post by {tweet.handle}</a>
              </blockquote>
            </div>
          ))}
        </div>
      </div>
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.twttr?.widgets?.load && containerRef.current) {
            window.twttr.widgets.load(containerRef.current)
          }
        }}
      />
    </section>
  )
}
