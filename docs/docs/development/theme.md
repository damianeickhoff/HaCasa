---
title: Theme design
layout: page
parent: Development
nav_order: 0
---

# Theme Design
This code is part of a theming system where many of the styles are internal and should not be modified directly to avoid unintended consequences. However, a set of predefined variables has been provided to allow for 
customization within templates. These variables can be safely used to adjust the appearance while maintaining the integrity of the overall theme.

Its important to follow this guidelines, otherwise your template won't be accepted as internal template or custom template but we are open for discussion or feedback.

## Colors

Every color mentioned in this document will be visible in this tabel.

| Color value    | Variables   |
|:---------------|:---------------------|:-------------------------|
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-peach"></span> `var(--primary-color)` | `#ffa08a` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-green"></span> `var(--color-green)` | `#93d385` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-red"></span> `var(--color-red)` | `#f06767` | 
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-blue"></span> `var(--color-blue)` | `#67b0f0` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-yellow"></span> `var(--color-yellow)` | `#f0d467` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-purple"></span> `var(--color-purple)` | `#b785d3` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-orange"></span> `var(--color-orange)` | `#f0b467` |
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-gold"></span> `var(--color-gold)` | `#ddae7b` | 
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-gray-blue"></span> `var(--icon-color)` `var(--subtext-color)` | `#cccfd9` | 
| <span class="d-inline-block p-2 mr-1 v-align-middle bg-black"></span> `var(--primary-text-color)` | `#48506f` | 

## Text

Text is a important part for your dashboard, that's why we defined a few aspects to make sure everything looks good on every view.

### Font
HaCasa uses the font [Montserrat](https://fonts.google.com/specimen/Montserrat)

### Color
For all our texts we use the color <span class="d-inline-block p-2 mr-1 v-align-middle bg-black"></span> `#48506f` even within the Home Assistant configuration itself. You don't have to define this in the template since its defined in the theme file.

When using a subtext, you use the variable <span class="d-inline-block p-2 mr-1 v-align-middle bg-gray-blue"></span>`var(--subtext-color)`.

### Size and weight

| Font value    | Size   |
|:---------------|:---------------------|
| var(--font-size-primary) | `14px` |
| var(--font-size-secondary) | `12px` |
| var(--font-weight-primary) | `700` |
| var(--font-weight-primary) | `500` |

