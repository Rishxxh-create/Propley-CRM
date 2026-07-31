# Propley Design Style Guide - Sera Edition

This document outlines the premium, minimalist "Sera" design language. Characterized by high-contrast layout, architectural typography (Space Grotesk), and precise geometric components.

## 1. Design Philosophy
- **Geometric Precision**: Usage of proportional rounded corners based on the global `8px` radius.
- **IMPORTANT RULE**: DO NOT USE SHADOWS. Maintain flat depth.
- **Minimalist Depth**: Inputs utilize bottom-border only (`border-b`) for a clean, architectural look.
- **Rhythmic Typography**: High-tracking uppercase labels paired with bold, low-leading headings.

## 2. Color Palette
| Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Ivory** | `#FFFFFF` | Primary backgrounds, cards. |
| **Stone** | `#FBFBFA` | Page backgrounds, subtle depth. |
| **Ink** | `#1A1A1A` | Primary text, main buttons. |
| **Gold** | `#8B6B3F` | Accents, active states, focus rings. |

## 3. Typography
### Primary Font: **Space Grotesk**
- **Usage**: Everything.
- **Headings**: Bold (700), Uppercase, tracking `0.02em`.
- **Labels**: Bold (700), Uppercase, tracking `0.2em` to `0.4em`.
- **Body**: Regular (400) or Medium (500).

## 4. UI Components
- **Buttons**: Proportional corners (`rounded-md`), heavy padding, uppercase bold text.
- **Inputs**: Bottom-border only (`border-b-stone-alt`), no background or very subtle stone background on focus.
- **Cards**: Flat white, proportional corners (`rounded-xl` or `rounded-lg`), absolutely NO shadows.

## 5. Layout Constants
- **Padding**: Generous (`p-8` to `p-16`).
- **Dividers**: Thin `1px` lines in `stone-alt`.
