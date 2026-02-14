# ACTIFY Brand Kit (Palette B)

## Palette

- Primary Blue: `#2563EB`
- Secondary Mint/Seafoam: `#2DD4BF`
- Accent Coral: `#FB7185`
- Warm Background: `#FFF7ED`
- Surface: `#FFFFFF`
- Text: `#111827`
- Borders: `#E5E7EB`

## Gradients

```css
/* Brand */
linear-gradient(135deg, #2563EB 0%, #2DD4BF 100%);

/* Hype */
linear-gradient(135deg, #2563EB 0%, #FB7185 100%);

/* Warm Accent */
linear-gradient(135deg, #2DD4BF 0%, #FB7185 100%);

/* Dashboard background */
radial-gradient(900px circle at 20% 10%, rgba(45, 212, 191, 0.20), transparent 60%),
radial-gradient(900px circle at 80% 20%, rgba(37, 99, 235, 0.18), transparent 55%),
#FFF7ED;
```

## Usage

```tsx
import { ActifyLogo } from "@/components/ActifyLogo";

<ActifyLogo variant="icon" size={48} />
<ActifyLogo variant="lockup" size={40} />
<ActifyLogo variant="stacked" size={56} />
```

Tailwind utilities:

- Colors: `bg-actifyBlue`, `bg-actifyMint`, `bg-actifyCoral`, `bg-actifyWarm`
- Gradients: `bg-actify-brand`, `bg-actify-hype`, `bg-actify-warm`
- Dashboard background class: `bg-actify-dashboard`

Example CTA:

```tsx
<Button className="bg-actify-brand text-white hover:opacity-95">Primary CTA</Button>
```
