"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, ChevronLeft, ChevronRight, Cloud, Clock, Globe2, Link2, Zap } from "lucide-react"

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ClawContainer,
  ClawIconFrame,
  ClawSection,
  ClawSectionIntro,
  ClawSurface,
} from "@/components/ui/clawpilot"

const features = [
  {
    icon: Cloud,
    title: "Your own private instance",
    description:
      "A dedicated OpenClaw server, fully isolated. Your data, your keys, your rules. Nothing shared.",
  },
  {
    icon: Clock,
    title: "Always on",
    description:
      "Runs 24/7 in the cloud. No laptop to keep open, no Raspberry Pi to babysit. It just works.",
  },
  {
    icon: Zap,
    title: "Minutes, not days",
    description:
      "Skip the VPS, Docker, Node.js, and config files. Sign up, and your OpenClaw is live.",
  },
]

type OpenClawResourceArticle = {
  title: string
  description: string
  url: string
}

const openClawResourceArticles: OpenClawResourceArticle[] = [
  {
    title: "OpenClaw: The complete guide to building, training, and living with your personal AI agent",
    description:
      "I built a team of 9 AI agents that run my work and life. Here's how you can too.",
    url: "https://www.lennysnewsletter.com/p/openclaw-the-complete-guide-to-building",
  },
  {
    title: "Full Tutorial: Use OpenClaw to Build a Business That Runs Itself | Nat Eliason",
    description:
      "How Nat set up his OpenClaw bot to run its $4,000/week business, including memory, multi-threaded chats, and security practices.",
    url: "https://creatoreconomy.so/p/use-openclaw-to-build-a-business-that-runs-itself-nat-eliason",
  },
  {
    title: "OpenClaw use cases: 25 ways to automate work and life",
    description:
      "A practical list covering everyday admin, developer workflows, and long-running jobs that OpenClaw can handle for you.",
    url: "https://www.hostinger.com/tutorials/openclaw-use-cases",
  },
  {
    title: "OpenClaw Use Cases: 35+ Real Ways People Are Running Their Lives (and Businesses) With It",
    description:
      "A verified playbook covering everything from morning briefings to multi-agent business councils.",
    url: "https://sidsaladi.substack.com/p/openclaw-use-cases-35-real-ways-people",
  },
  {
    title: "How OpenClaw Changed My Workflow",
    description:
      "A firsthand account of using OpenClaw in Telegram with real tools to help ship work end-to-end.",
    url: "https://safeti.medium.com/how-openclaw-changed-my-workflow-e27b4a03e432",
  },
  {
    title: "11 Insane Use Cases of OpenClaw AI",
    description:
      "What happens when you give an AI agent access to your entire digital life.",
    url: "https://medium.com/the-ai-studio/11-insane-use-cases-of-openclaw-ai-a341e997a57f",
  },
]

function getArticleDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "")
  } catch {
    return url
  }
}

function buildArticleFaviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(getArticleDomain(url))}&sz=64`
}

export function Features() {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [failedFaviconUrls, setFailedFaviconUrls] = useState<string[]>([])
  const [pressedCardUrl, setPressedCardUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!carouselApi) {
      return
    }

    const updateScrollState = () => {
      setCanScrollPrev(carouselApi.canScrollPrev())
      setCanScrollNext(carouselApi.canScrollNext())
    }

    updateScrollState()
    carouselApi.on("select", updateScrollState)
    carouselApi.on("reInit", updateScrollState)

    return () => {
      carouselApi.off("select", updateScrollState)
      carouselApi.off("reInit", updateScrollState)
    }
  }, [carouselApi])

  return (
    <>
      <section className="relative overflow-hidden px-4 py-14 md:px-6 md:py-20">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto max-w-[22rem] text-center md:max-w-4xl">
            <h2 className="text-balance font-sans text-[1.62rem] font-medium leading-[1.04] tracking-tight text-[#141414] md:text-[3.45rem]">
              Not sure if you need OpenClaw?
            </h2>
            <p className="mt-3 text-balance text-[1.15rem] font-medium leading-[1.08] tracking-tight text-[#737373] md:mt-2 md:text-[3.45rem]">
              Heres what people are{" "}
              <span className="inline-block whitespace-nowrap underline decoration-current decoration-[1.5px] underline-offset-[0.18em]">
                doing with it
              </span>
            </p>
          </div>

          <div className="relative mt-12 h-[380px] md:mt-20 md:h-[630px]">
            <div className="pointer-events-none absolute left-1/2 top-[1.35rem] z-30 -translate-x-1/2 md:top-[2.58rem]">
              <div className="relative h-[34px] w-[112px] overflow-hidden md:h-[52px] md:w-[172px]">
                <img
                  src="/site-images/openclaw-peeking-mascot.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute left-[1.89%] top-[-50.35%] h-[325%] w-full max-w-none"
                />
              </div>
            </div>

            <div className="absolute left-1/2 top-[3.8rem] z-10 h-[272px] w-full max-w-[980px] -translate-x-1/2 overflow-hidden rounded-[28px] border-2 border-[#ebebeb] bg-[#fdfdfd] shadow-[0_18px_44px_rgba(0,0,0,0.035)] md:top-[5.9rem] md:h-[500px] md:rounded-[38px] md:max-w-[1120px]">
              <div className="pointer-events-none absolute left-[7.5%] top-[9%] h-[188%] w-[85%] md:left-[6.3%] md:top-[7.1%] md:h-[207.2%] md:w-[87%]">
                <div className="absolute left-1/2 top-1/2 h-[68%] w-[66%] -translate-x-1/2 -translate-y-1/2 rotate-[45.76deg] rounded-[19px] bg-[rgba(230,230,230,0.28)]" />
              </div>
              <Carousel
                className="relative h-full px-4 pt-4 pb-4 md:px-14 md:pt-11 md:pb-10"
                opts={{
                  align: "start",
                  dragFree: false,
                  loop: true,
                  skipSnaps: false,
                }}
                setApi={setCarouselApi}
              >
                <div className="flex h-full flex-col">
                  <CarouselContent className="items-stretch">
                    {openClawResourceArticles.map((article) => {
                    const domain = getArticleDomain(article.url)
                    const isPressed = pressedCardUrl === article.url
                    const cardInteractionHandlers = {
                      onPointerDown: () => setPressedCardUrl(article.url),
                      onPointerUp: () =>
                        setPressedCardUrl((current) =>
                          current === article.url ? null : current,
                        ),
                      onPointerLeave: () =>
                        setPressedCardUrl((current) =>
                          current === article.url ? null : current,
                        ),
                      onPointerCancel: () =>
                        setPressedCardUrl((current) =>
                          current === article.url ? null : current,
                        ),
                      onBlur: () =>
                        setPressedCardUrl((current) =>
                          current === article.url ? null : current,
                        ),
                    }

                    return (
                      <CarouselItem
                        key={article.url}
                        className="basis-[90%] sm:basis-[344px] md:basis-[320px] lg:basis-[328px]"
                      >
                        <article
                          className={cn(
                            "group relative h-[144px] select-none overflow-hidden rounded-[22px] bg-[#2d2d2d] px-3.5 py-3.5 text-white transition-all duration-200 ease-out md:h-[182px] md:rounded-[28px] md:px-[18px] md:py-[17px]",
                            isPressed
                              ? "bg-[#2a2a2a] shadow-[0_10px_22px_rgba(0,0,0,0.16)]"
                              : "shadow-[0_12px_28px_rgba(0,0,0,0.18)] hover:bg-[#303030] hover:shadow-[0_14px_30px_rgba(0,0,0,0.2)] focus-within:bg-[#303030] focus-within:shadow-[0_14px_30px_rgba(0,0,0,0.2)]",
                          )}
                        >
                          <div className="flex h-full flex-col pb-6 md:pb-8">
                            <div className="flex items-start gap-2.5 md:gap-3.5">
                              <div className="mt-0.5 flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] bg-white p-[4px] md:h-[36px] md:w-[36px] md:rounded-[10px] md:p-[6px]">
                                {failedFaviconUrls.includes(article.url) ? (
                                  <Globe2
                                    aria-hidden="true"
                                    className="h-full w-full text-[#7b7b7b]"
                                    strokeWidth={2}
                                  />
                                ) : (
                                  <img
                                    src={buildArticleFaviconUrl(article.url)}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-full w-full rounded-[4px] object-contain md:rounded-[6px]"
                                    onError={() =>
                                      setFailedFaviconUrls((current) =>
                                        current.includes(article.url)
                                          ? current
                                          : [...current, article.url],
                                      )
                                    }
                                  />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="text-[14px] font-medium leading-[1.12] tracking-tight text-white md:text-[19px]">
                                  <span className="[display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                    <Link
                                      href={article.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="outline-none transition-colors duration-200 hover:text-white/92 focus-visible:text-white/92"
                                      {...cardInteractionHandlers}
                                    >
                                      {article.title}
                                    </Link>
                                  </span>
                                </h3>

                                <p className="mt-2 pr-1 text-[10px] leading-[1.36] text-[#e8e8e8] md:mt-3 md:text-[11.5px]">
                                  <span className="[display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:3] md:[-webkit-line-clamp:2]">
                                    {article.description}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                          <Link
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute bottom-3.5 right-3.5 flex max-w-[78%] items-center gap-1.5 text-[9px] text-[#e8e8e8] opacity-100 transition-opacity duration-200 ease-out md:bottom-[17px] md:right-[18px] md:max-w-none md:gap-2.5 md:text-[10.5px] md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                            {...cardInteractionHandlers}
                          >
                            <Link2
                              aria-hidden="true"
                              className="h-3 w-3 shrink-0 text-[#d9d9d9] md:h-[15px] md:w-[15px]"
                              strokeWidth={2}
                            />
                            <span className="truncate">{`https://${domain}`}</span>
                          </Link>
                        </article>
                      </CarouselItem>
                    )
                    })}
                  </CarouselContent>

                  <div className="mt-auto flex items-center justify-between pt-3 md:pt-8">
                    <button
                      type="button"
                      aria-label="Scroll articles left"
                      onClick={() => carouselApi?.scrollPrev()}
                      disabled={!canScrollPrev}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#ececec] text-[#7c7c7c] transition-colors hover:bg-[#e2e2e2] disabled:cursor-not-allowed disabled:opacity-50 md:h-[72px] md:w-[72px]"
                    >
                      <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                    </button>

                    <button
                      type="button"
                      aria-label="Scroll articles right"
                      onClick={() => carouselApi?.scrollNext()}
                      disabled={!canScrollNext}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#ececec] text-[#7c7c7c] transition-colors hover:bg-[#e2e2e2] disabled:cursor-not-allowed disabled:opacity-50 md:h-[72px] md:w-[72px]"
                    >
                      <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                  </div>
                </div>
              </Carousel>
            </div>
          </div>

          <div className="mt-8 flex justify-center md:mt-16">
            <Button asChild className="group" size="hero" variant="brand">
              <Link href="/dashboard/chat">
                Go to Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <ClawSection id="why-clawpilot">
        <ClawContainer size="lg">
          <ClawSectionIntro
            description="All the power of OpenClaw. None of the server work."
            title="Why ClawPilot"
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <ClawSurface key={feature.title} className="h-full">
                <ClawIconFrame>
                  <feature.icon className="h-5 w-5 text-foreground/70" />
                </ClawIconFrame>
                <h3 className="type-h4 mt-4">{feature.title}</h3>
                <p className="type-body-sm mt-2">{feature.description}</p>
              </ClawSurface>
            ))}
          </div>
        </ClawContainer>
      </ClawSection>
    </>
  )
}
