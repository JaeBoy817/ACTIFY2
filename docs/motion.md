# ACTIFY Motion System

## Foundation

- Stack: Next.js App Router + Tailwind + global CSS animations
- Reduced motion: `useReducedMotion` (`/lib/use-reduced-motion.ts`) and `@media (prefers-reduced-motion: reduce)` fallbacks in `/app/globals.css`
- Timing tokens: `/lib/motion.ts` and CSS variables (`--motion-quick`, `--motion-base`, `--motion-slow`)
- Reusable classes: `.enter-fade-up`, `.enter-stagger`, `.hover-lift`, `.hover-specular`, `.shimmer`, `.ripple`, `.orb-drift`

## 12 Implemented Animations

1. Route transitions (fade + slight slide)  
   Files: `/components/motion/RouteTransition.tsx`, applied in `/app/(marketing)/layout.tsx` and `/app/app/layout.tsx`

2. Hero headline mask reveal + short cursor blink  
   Files: `/components/motion/HeroHeadline.tsx`, used in `/app/(marketing)/page.tsx`

3. Glass specular hover sweep  
   Files: `/app/globals.css` (`.glass-hover`, `glass-shimmer`), used across glass cards/panels

4. Magnetic CTA buttons  
   File: `/components/glass/GlassButton.tsx` (`magnetic` prop), used on Home/Dashboard primary CTAs

5. Tilt/parallax depth on selected tiles  
   File: `/components/motion/TiltSurface.tsx`, used on hero workflow and feature/stat cards

6. Staggered feature entrance with IntersectionObserver  
   File: `/components/motion/Reveal.tsx`, used across Home and Dashboard sections/cards

7. Animated KPI counters with snap/pop  
   File: `/components/motion/CountUpValue.tsx`, used in `/app/app/page.tsx`

8. Skeleton loaders with shimmer  
   File: `/app/app/loading.tsx` + `.shimmer` styles in `/app/globals.css`

9. Scroll reveal + breathing background  
   Files: `Reveal` usage + `/components/glass/LiquidOrbs.tsx` drift animations

10. Toast enter/exit + icon bounce  
   Files: `/components/ui/toast.tsx`, `/components/ui/toaster.tsx`, toast keyframes in `/app/globals.css`

11. Calendar hover trail + click ripple  
   Files: `/components/app/calendar-day-cell.tsx`, integrated in `/app/app/calendar/page.tsx`

12. Minimal “adult confetti” milestone burst  
   File: `/components/app/milestone-action.tsx`, used on Dashboard milestone action

## Reduced Motion Behavior

- Route, reveal, shimmer, cursor blink, confetti, ripple, toast bounce, and magnetic/tilt effects are disabled or simplified.
- Counters render final values without counting animation.
- Hover and glass styles remain functional without movement.
