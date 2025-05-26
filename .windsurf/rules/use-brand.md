App Name: 7awel (حوّل) 
Purpose: A non-custodial crypto wallet application focusing on security and ease of use 
Vision: Providing a seamless, secure, and trustworthy crypto experience with a focus on modern design.

Brand Identity Elements

- Logo System
Wordmark (Black): Location: /public/brand/7awel - wordmark - black.svg
Wordmark (White): Location: /public/brand/7awel - wordmark - white.svg
Lettermark: Location: /public/brand/7awel - lettermark.svg (used for nav icon, favicon)

- Typography
Primary Font: Poppins (imported via next/font)
Usage: All headings, buttons, and body text

- Color Palette
Primary Gradient: #5e3aff (Violet) to #73bbff (Blue)
Used for hero sections, CTAs, and primary accents
Applied as bg-gradient-to-br from-violet-600 to-blue-400

Text Colors:
Light Mode Text: #131d27
Dark Mode Text: #FFFFFF (or near white)
Muted Text: Slightly transparent primary color (text-primary/80)

Background Colors:
Light Mode Background: Off-white (#f9fafb or bg-gray-50)
Dark Mode Background: #161618
Card Background: White (#ffffff)

Accent Colors:
Primary: Purple/blue from the gradient
Success: Green (for positive transactions)
Error: Red (for errors and negative transactions)

UI Components
Card Design: White background with subtle rounding (rounded-xl)
Subtle shadows (shadow-sm)
Clean content organization with consistent padding
See components/ui/content-card.tsx
Buttons & Interactive Elements:
Rounded corners using CSS variable (--radius), default 0.5rem
Primary actions use gradient background
Secondary actions use transparent backgrounds with primary text

Icons:
Streamlined, minimal line icons
Located in components/icons/
Categories: finance-icons, navigation-icons, ui-icons

Layout Patterns
Header Design: Minimalist with avatar in corner
Hero Section: Gradient background with key information (balance)
Content Organization: Card-based interface for content grouping
Bottom Navigation: 3-tab navigation (Home, History, Cash-out)

Design Influence
Design Inspiration: Revolut - characterized by:
Clean, contrasted inputs
Card-based content organization
Thoughtful spacing and visual hierarchy
Support for both light and dark modes

Localization Support
Bilingual: English and Arabic
RTL support for Arabic interface
Culturally appropriate imagery and metaphors

Implementation Notes
When creating new pages, use the existing components from components/ui/ to maintain consistency
For new icons, add them to the appropriate category in components/icons/
The color gradient is a key brand element and should be used consistently
Always implement both light and dark mode versions of new UI elements
Ensure all text is properly localized using the translation system
This wallet application combines modern crypto functionality with an accessible, clean interface inspired by the best financial apps while maintaining its own distinct identity.