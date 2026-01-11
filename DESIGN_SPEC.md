# Sentric Design System Specification

## Color Palette

### Primary Colors

- **Background**: `#0A0A0D` (RGB: 10, 10, 13)

  - Main background color for all pages
  - Very dark blue-black

- **Text Primary**: `#FFFFFF` (RGB: 255, 255, 255)

  - Primary text color for headings and important content

- **Text Secondary**: `#B3B3BF` (RGB: 179, 179, 191)
  - Secondary text color for body text, labels, and less important content
  - Used for opacity variations (30%, 40%, 50%, 60%, 70%, 80%)

### Accent Colors

- **Accent (Blue)**: `#93C5FD` (RGB: 147, 197, 253)

  - Primary accent color for links, buttons, highlights
  - Tailwind: `blue-300`

- **Accent Hover**: `#60A5FA` (RGB: 96, 165, 250)
  - Hover state for accent elements
  - Tailwind: `blue-400`

### Semantic Colors

- **Error/Red**: `#F87171` (RGB: 248, 113, 113) or `#EF4444` (RGB: 239, 68, 68)

  - Used for errors, warnings, destructive actions
  - Tailwind: `red-400` or `red-500`
  - Background variant: `rgba(248, 113, 113, 0.15)` (15% opacity)

- **Success/Green**: `#4ADE80` (RGB: 74, 222, 128)

  - Used for success states
  - Tailwind: `green-400`

- **Warning/Purple**: `#D8B4FE` (RGB: 216, 180, 254)
  - Used for special highlights
  - Tailwind: `purple-300`

### Overlay & Transparency Patterns

White overlays with varying opacity (commonly used):

- `bg-white/5` - 5% opacity (subtle backgrounds)
- `bg-white/10` - 10% opacity (cards, panels)
- `bg-white/15` - 15% opacity (inputs, focused states)
- `bg-white/20` - 20% opacity (borders, highlights)
- `bg-white/30` - 30% opacity (interactive elements)
- `bg-white/[0.02]` - 2% opacity (very subtle backgrounds)
- `bg-white/[0.03]` - 3% opacity (metric cards)
- `bg-white/[0.07]` - 7% opacity (hover states)

Border overlays:

- `border-white/5` - 5% opacity (subtle borders)
- `border-white/10` - 10% opacity (standard borders)
- `border-white/20` - 20% opacity (prominent borders)
- `border-white/30` - 30% opacity (focused borders)

### Dark Background Variants

- **Card Background**: `#121216` (RGB: 18, 18, 22)
  - Used for tooltips and overlays
- **Menu Background**: `#1A1A23` (RGB: 26, 26, 35)
  - Used for dropdown menus
- **Sidebar Background**: `#1A1A1E` (RGB: 26, 26, 30)
  - Used for sidebar elements

## Typography

### Font Families

#### Primary Font: Manrope

- **Family**: `Manrope` (Google Fonts)
- **Type**: Sans-serif
- **Weights**: 200, 300, 400, 500, 600, 700, 800
- **Usage**: Primary body text, UI elements, buttons, labels
- **CSS Variable**: `--font-manrope`
- **Classes**: `font-sans`, `font-serif`, `font-display` (all map to Manrope)

#### Logo Font: Playfair Display

- **Family**: `Playfair Display` (Google Fonts)
- **Type**: Serif
- **Weights**: 400, 500, 600
- **Usage**: Logo, brand name, major headings (when using `font-logo` class)
- **CSS Variable**: `--font-playfair-display`
- **Class**: `font-logo`

#### Monospace Font: JetBrains Mono

- **Family**: `JetBrains Mono`
- **Type**: Monospace
- **Usage**: Code blocks, run IDs, technical identifiers
- **Class**: `font-mono` or `.mono`

### Font Sizes

- **Base**: `15px` (0.9375rem)
- **XS**: `0.75rem` (12px) / Custom: `11px`, `10px`
- **SM**: `0.875rem` (14px) / Custom: `13px`, `15px`
- **Base**: `1rem` (16px)
- **LG**: `1.125rem` (18px)
- **XL**: `1.25rem` (20px)
- **2XL**: `1.5rem` (24px)
- **3XL**: `1.875rem` (30px)
- **4XL**: `2.25rem` (36px)

### Font Weights

- **Light**: 200, 300
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700
- **Extra Bold**: 800

### Typography Styles

#### Headings

- **H1**: `text-4xl`, `font-semibold`, `font-display` or `font-logo`
- **H2**: `text-2xl`, `font-semibold`, `font-display`
- **H3**: `text-xl`, `font-semibold`, `font-display`
- **Section Headers**: `text-xs`, `font-serif`, `uppercase`, `tracking-widest`

#### Body Text

- **Primary**: `text-sm` or `text-base`, `font-serif` (Manrope)
- **Secondary**: `text-sm` or `text-xs`, `text-textSecondary`
- **Line Height**: `leading-relaxed` (1.625) for body text

#### Special Text Styles

- **Uppercase Labels**: `uppercase`, `tracking-wider` or `tracking-widest`
- **Tight Tracking**: `tracking-tight` (-0.025em) for large headings
- **Italic**: Used for placeholder text, captions

## Spacing

### Standard Tailwind Spacing Scale

Based on 4px base unit (0.25rem):

- **1**: 4px (0.25rem)
- **2**: 8px (0.5rem)
- **3**: 12px (0.75rem)
- **4**: 16px (1rem)
- **5**: 20px (1.25rem)
- **6**: 24px (1.5rem)
- **8**: 32px (2rem)
- **10**: 40px (2.5rem)
- **12**: 48px (3rem)

### Common Padding Patterns

- Cards: `p-6`, `p-8`, `p-10`
- Buttons: `px-4 py-2`, `px-5 py-2.5`, `px-6 py-3`
- Inputs: `px-4 py-3`, `px-5 py-3.5`
- Sections: `py-10`, `py-12`

### Common Gap Patterns

- Small: `gap-2`, `gap-2.5`
- Medium: `gap-3`, `gap-4`
- Large: `gap-6`, `gap-8`

## Border Radius

### Standard Values

- **SM**: `rounded-lg` - 8px (0.5rem)
- **MD**: `rounded-xl` - 12px (0.75rem)
- **LG**: `rounded-2xl` - 16px (1rem)
- **XL**: `rounded-3xl` - 24px (1.5rem)
- **Full**: `rounded-full` - 50% (circles)

### Custom Values

- **Logo**: `rounded-[10px]` - 10px
- **Small Pills**: `rounded-md` - 6px

### Common Usage

- Cards: `rounded-2xl`, `rounded-3xl`
- Buttons: `rounded-lg`, `rounded-xl`, `rounded-2xl`
- Inputs: `rounded-lg`, `rounded-xl`
- Badges/Pills: `rounded-full`, `rounded-lg`

## Shadows

### Elevation Levels

- **SM**: `shadow-sm` - Subtle elevation
- **MD**: `shadow-lg` - Medium elevation
- **LG**: `shadow-xl` - Large elevation
- **XL**: `shadow-2xl` - Maximum elevation
- **Inner**: `shadow-inner` - Inset shadow

### Colored Shadows

- **Accent Shadow**: `shadow-accent/20` - 20% opacity accent color
- Used on buttons and interactive elements

## Effects & Animations

### Backdrop Blur

- `backdrop-blur-sm` - Used on glass-morphism cards and overlays

### Transitions

- **Standard**: `transition-all`
- **Colors**: `transition-colors`
- **Duration**: Default or `duration-300`
- **Easing**: Default or `ease-out`

### Transforms

- **Hover Lift**: `hover:-translate-y-0.5` or `hover:-translate-y-1`
- **Active Scale**: `active:scale-95` or `active:scale-[0.99]`
- **Group Hover**: Used with `group` classes

### Animation

- **Spin**: `animate-spin` - Loading spinners
- **Pulse**: `animate-pulse` - Status indicators
- **Fade In**: `animate-in fade-in zoom-in-95` - Dropdown menus

## Components

### Buttons

#### Primary Button

```
bg-white text-background
px-6 py-3
rounded-xl
font-medium font-serif
hover:opacity-90
active:scale-95
transition-all
```

#### Secondary Button

```
bg-white/5 border border-white/10 text-white
px-6 py-3
rounded-xl
font-medium font-serif
hover:bg-white/10
transition-all
```

#### Accent Button

```
bg-accent hover:bg-accentHover
text-background
px-6 py-3
rounded-xl
font-semibold font-serif
uppercase tracking-wide
hover:-translate-y-0.5
shadow-lg shadow-accent/20
transition-all duration-300
```

#### Destructive Button

```
bg-red-500/10 border border-red-500/20
text-red-400
hover:bg-red-500/20 hover:border-red-500/30
```

### Cards

#### Standard Card

```
bg-white/5 border border-white/10
rounded-2xl
p-6 or p-8
hover:bg-white/[0.07] hover:border-white/20
transition-all
```

#### Metric Card

```
bg-white/[0.03] border border-white/5
rounded-2xl
p-8
shadow-xl
```

#### Glass Card

```
bg-white/10 backdrop-blur-sm
border border-white/20
rounded-2xl
p-10
```

### Inputs

#### Standard Input

```
bg-white/15 backdrop-blur-sm
border border-white/30
rounded-lg or rounded-xl
px-4 py-3 or px-5 py-3.5
text-textPrimary
placeholder:text-textSecondary/30
focus:outline-none
focus:border-accent
focus:ring-1 focus:ring-accent
transition-all
```

### Tables

#### Table Header

```
text-[10px] or text-xs
text-textSecondary
font-serif
uppercase
tracking-widest
opacity-50
border-b border-white/5
```

#### Table Row

```
hover:bg-white/[0.02]
transition-colors
cursor-pointer (if clickable)
```

## Icon System

- **Library**: Lucide React
- **Sizes**: Typically `14px`, `16px`, `20px`, `24px`
- **Color**: Inherits text color, or explicit `text-accent`, `text-textSecondary`

## Scrollbar

### Webkit Scrollbar

- **Width**: 8px
- **Track**: `rgba(10, 10, 13, 0.5)`
- **Thumb**: `rgba(179, 179, 191, 0.3)`
- **Thumb Hover**: `rgba(179, 179, 191, 0.5)`
- **Border Radius**: 4px

## Selection

- **Background**: `rgba(147, 197, 253, 0.2)` (20% accent blue)
- **Text Color**: `#93c5fd` (accent blue)

## Accessibility

### Font Smoothing

- **Webkit**: `-webkit-font-smoothing: antialiased`
- **Firefox**: `-moz-osx-font-smoothing: grayscale`

### Text Size Adjustment

- **Webkit**: `-webkit-text-size-adjust: 100%`
- **Standard**: `text-size-adjust: 100%`

## Breakpoints

Standard Tailwind breakpoints:

- **SM**: 640px
- **MD**: 768px
- **LG**: 1024px
- **XL**: 1280px
- **2XL**: 1536px

## Design Principles

1. **Dark Theme First**: All interfaces use dark background (#0A0A0D)
2. **Glass Morphism**: Use backdrop blur and transparency for depth
3. **Subtle Borders**: Low opacity white borders for definition
4. **Accent as Action**: Blue accent color indicates interactivity
5. **Typography Hierarchy**: Clear size and weight distinctions
6. **Smooth Transitions**: All interactive elements have transitions
7. **Consistent Spacing**: Use standard Tailwind spacing scale
8. **Rounded Corners**: Generous border radius for modern feel
9. **High Contrast**: White text on dark background for readability
10. **Minimal Color Palette**: Primarily monochrome with blue accent

## Example Usage

### Dashboard Card

```jsx
<div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 shadow-xl">
  <h3 className="text-xl font-semibold text-textPrimary font-display mb-2">
    Card Title
  </h3>
  <p className="text-sm text-textSecondary font-serif">Card description</p>
</div>
```

### Primary Button

```jsx
<button className="px-6 py-3 bg-white text-background rounded-xl font-medium font-serif hover:opacity-90 active:scale-95 transition-all">
  Click Me
</button>
```

### Input Field

```jsx
<input
  className="w-full px-5 py-3.5 bg-white/15 backdrop-blur-sm border border-white/30 rounded-xl text-textPrimary font-serif placeholder:text-textSecondary/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
  placeholder="Enter text..."
/>
```
