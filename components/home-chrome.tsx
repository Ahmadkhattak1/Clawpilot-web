"use client"

import { useState } from "react"

import { AnnouncementBanner } from "@/components/announcement-banner"
import { Header } from "@/components/header"

export function HomeChrome() {
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true)

  return (
    <>
      <AnnouncementBanner onDismiss={() => setIsAnnouncementVisible(false)} />
      <Header hasAnnouncementOffset={isAnnouncementVisible} />
    </>
  )
}
