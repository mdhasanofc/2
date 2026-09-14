# Hire A Wifey Booking Experience

Custom WordPress booking-request plugin for Hire A Wifey.

## What it includes

- Mobile-first 8-step guided flow plus confirmation screen
- Wifey Time cards: 2h / 3h / 4h / 5h with dynamic pricing
- Multi-select “Build Your Wifey To-Do List” experience
- #1 priority selection from chosen tasks only
- Frequency, preferred day/time and customer/property details
- Server-side price validation — price is based only on Wifey Time
- Stored enquiries in WordPress admin under **Wifey Requests**
- Customer and admin email notifications
- Nonce + honeypot + basic rate-limit spam protection
- Google Analytics / Tag Manager `dataLayer` events and Meta Pixel hooks
- Settings screen at **Settings → Wifey Booking** for pricing, tasks and key wording
- No payment collection

## Install

1. Upload this folder as a plugin or copy it to `/wp-content/plugins/hire-a-wifey-booking/`.
2. Activate **Hire A Wifey Booking Experience**.
3. Activation creates and publishes `/book-a-wifey/` with the shortcode `[hire_a_wifey_booking]` and makes it the front page for demo convenience.
4. Adjust pricing / tasks / wording under **Settings → Wifey Booking**.

## Analytics events

- `haw_form_step` — fired as customers move through the experience.
- `haw_booking_request` — fired after a successful request. If `fbq` exists, the plugin also triggers a Meta `Lead` event.

## Production notes

For a live Hire A Wifey website, keep the existing GA/Meta scripts on the site, replace the activation-time front-page behavior if required, and style the plugin alongside the production WordPress theme. Email deliverability should use the website’s SMTP/mail provider.
