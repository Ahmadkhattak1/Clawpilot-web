# ClawPilot Design System

ClawPilot uses a restrained, product-first visual language:

- Monochrome base with soft contrast instead of loud gradients
- Rounded surfaces with light borders and shallow elevation
- Tight editorial typography and generous whitespace
- High-contrast primary actions with minimal ornament

## Core Tokens

The base tokens live in [`app/globals.css`](../app/globals.css) and flow through Tailwind semantic colors in [`tailwind.config.ts`](../tailwind.config.ts).

- `--background`, `--foreground`: main page contrast pair
- `--card`, `--secondary`, `--muted`: surface and supporting layers
- `--border`, `--input`, `--ring`: structure and interaction states
- `--radius`: global rounding baseline

Typography utilities in `app/globals.css` define the default text system:

- `.type-h1` to `.type-h4`
- `.type-body`, `.type-body-sm`
- `.type-nav`, `.type-brand`, `.type-eyebrow`
- `.type-stat-value`, `.type-stat-label`

## Reusable Primitives

The reusable homepage primitives live in [`components/ui/clawpilot.tsx`](../components/ui/clawpilot.tsx).

- `ClawSection`: semantic vertical rhythm for page sections
- `ClawContainer`: standard content widths (`sm`, `md`, `lg`, `xl`)
- `ClawSectionIntro`: title and copy block with left/center alignment
- `ClawSurface`: standard card container for panels and list items
- `clawSurfaceClassName(...)`: same surface system for non-`div` elements like `Link`
- `ClawIconFrame`: standard icon shell
- `ClawStat`: compact metric pair used in proof and overview rows

## Action Patterns

Primary CTA styles are standardized in [`components/ui/button.tsx`](../components/ui/button.tsx):

- `variant="brand"`: black-on-white ClawPilot action button
- `size="nav"`: compact header action
- `size="hero"`: main landing-page CTA

Use `Button asChild` for links so action styling stays consistent between `button` and `a`.

## Usage Rules

- Prefer semantic tokens like `bg-card`, `text-muted-foreground`, and `border-border` over raw color classes.
- Prefer `ClawSection` + `ClawContainer` before introducing custom section spacing.
- Prefer `ClawSurface` for marketing cards instead of rebuilding `rounded-* border bg-* p-*` class stacks.
- Prefer typography utility classes before inline font-size and tracking values.
- Add a new primitive only when the pattern repeats in at least two places.

## Example

```tsx
import { Button } from "@/components/ui/button"
import {
  ClawContainer,
  ClawSection,
  ClawSectionIntro,
  ClawSurface,
} from "@/components/ui/clawpilot"

export function ExampleSection() {
  return (
    <ClawSection>
      <ClawContainer size="lg">
        <ClawSectionIntro
          title="Section title"
          description="Support copy that stays inside the existing ClawPilot rhythm."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <ClawSurface>
            <h3 className="type-h4">Reusable card</h3>
            <p className="type-body-sm mt-2">
              This card inherits the same shape, border, and padding as the rest
              of the landing system.
            </p>
          </ClawSurface>
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="brand" size="hero">
            Get Started
          </Button>
        </div>
      </ClawContainer>
    </ClawSection>
  )
}
```
