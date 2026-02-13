"use client"

import * as React from "react"
import { motion, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface FeatureHighlightProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  features: React.ReactNode[]
  footer?: React.ReactNode
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
}

const FeatureHighlight = React.forwardRef<HTMLDivElement, FeatureHighlightProps>(
  ({ className, icon, title, features, footer, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "flex max-w-lg flex-col items-start space-y-4 p-8 text-left",
          className
        )}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        {...props}
      >
        {icon && <motion.div variants={itemVariants}>{icon}</motion.div>}

        <motion.h2
          variants={itemVariants}
          className="type-h2 text-foreground"
        >
          {title}
        </motion.h2>

        <div className="flex flex-col space-y-2">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="text-xl leading-relaxed text-muted-foreground md:text-2xl"
            >
              {feature}
            </motion.div>
          ))}
        </div>

        {footer && <motion.div variants={itemVariants}>{footer}</motion.div>}
      </motion.div>
    )
  }
)

FeatureHighlight.displayName = "FeatureHighlight"

export { FeatureHighlight }
