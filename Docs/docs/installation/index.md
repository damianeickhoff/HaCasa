---
title: Installation
layout: page
nav_order: 1
---

# Installation

The installation of HaCasa is, for now, only possible via a manual installation. While this may seem a bit daunting at first, rest assured that we have created a detailed guide to help you through the process step by step. 
{: .fs-6 .fw-300 }

Our ultimate goal is to make HaCasa more accessible by integrating it into HACS (Home Assistant Community Store) or even providing it as a native integration. This would allow users to install and configure HaCasa directly through the Home Assistant UI, making the process much simpler and more user-friendly.

Unfortunately, due to current limitations, HaCasa relies on YAML configuration, which requires manual editing of your Home Assistant files. This is because Home Assistant's UI editor does not yet support the use of include directives, which are essential for HaCasa and many other advanced dashboards. However, we are optimistic about the future. There is an active feature request in the Home Assistant community to enable this functionality in the UI editor. If you'd like to support this effort, consider voting for [this thread](https://community.home-assistant.io/t/ability-to-use-include-directives-in-ui-editor/336167?u=paddy0174).

In the meantime, we encourage you to follow our guide carefully. With a little patience and attention to detail, you'll have HaCasa up and running in no time, unlocking a powerful and customizable dashboard experience for your Home Assistant setup.

## But can I add it to the raw config?
Yes but please... **don't**. Home Assistant only allows you to include files in yaml-mode and because HaCasa (and many other dashboards) make use of this function we can only support the yaml mode.

There is a feature request at the Home Assistant forum, if you’d like to see this function available in UI-mode, too, you might want to give your vote in [this thread](https://community.home-assistant.io/t/ability-to-use-include-directives-in-ui-editor/336167?u=paddy0174).