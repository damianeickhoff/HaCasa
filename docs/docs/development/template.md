---
title: Template design
layout: page
parent: Development
nav_order: 1
---

# Template Design
Designing a template can be done in many ways and is made possible thanks to the `custom:button-card` intergration. Its difficult to explain everything in detail, but we can give a few guidelines to how you can create a custom template that suites the HaCasa style.

## Building your own template
- Create a new folder in de `custom_template` folder, based on our [naming convention](#naming-convention) like *hc_custom_temperature_card_damian*. You can find this folder underneath `dashboard/HaCasa/templates`.
- Create a new `README.md` file where you describe your card like variables.
- Create a `.yaml` file inside your new folder with the same name as your folder so in this case *hc_custom_temperature_card_damian.yaml*. This is important otherwise the template won't be included!
- Open the new file and start creating your template. We already defined a prefered structure for the file [here](#order).
- You can use an internal template already available to have a base. Just enter the desired template in the `template:` value. This is not mandatory as long as you follow our guidelines.
**Note:** Don't use a `custom_template` for your new template since its possible a user has not that template installed. If its needed, make sure you specify that in the `README.md`.
- To test your new card, add it to a view and *refresh* your dashboard. If everything went good, you should see your new card.
- When you're finished with your new template and the corresponding `RADME.md` you can publish it to the custom-cards section in [Discord]((https://discord.com/invite/9uMs9zCT7d)) ór make a [Pull Request on Github](https://github.com/damianeickhoff/HaCasa/pulls).

## Naming convention
To make it easier to see which templates are custom and which are not, you have to use a certain naming convention.

The folder and card will need the following:
- Custom_ prefix
- Developer name (like Damian)
- Name describing your card

Eventually, it should look like this:
`hc_custom_temperature_card_damian/hc_custom_temperature_card_damian.yaml`

and the folder structure like this:

```tree
templates/custom_templates
└── hc_custom_temperature_card_damian
   └── hc_custom_temperature_card_damian.yaml
   └── readme.md
```

## Order
To make everything easier to understand we use a structure for all our templates. You can leave parts out of it if not needed, but the structure has to be the same.

**Note:** Its important that the first line is the exact same name as the template. So in this case, the name would be `hc_custom_temperature_card_damian`.

```yaml
hc_custom_temperature_card_damian:
  template:
  variables:
  tap_action/hold action/...:
  triggers_update:
  show_icon:
  show_label:
  show_name:
  show_state:
  icon:
  label:
  name:
  state:
  entity:
  styles:
    icon:
    label:
    name:
    state:
    img_cell:
    grid:
    card:
  custom_fields:
    item1:
      card:
        type:
        template:

```
