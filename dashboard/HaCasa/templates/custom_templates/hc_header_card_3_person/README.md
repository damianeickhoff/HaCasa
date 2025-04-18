Added a New 3-Person Header Card

Features:
Supports up to 3 people instead of the default 1. 
Can be scaled from 3-person down to a 1 person.
Inspired by the Header Card by MD3VIX i added the location icon for each person displayed.

Variables:
  person_entity1:
  person_entity2:
  person_entity3:

- type: custom:button-card
  template: hc_header_card_3_person
  entity: weather.forecast_home
  variables:
    person_entity1: person.sebastian
    person_entity2: person.rune
    person_entity3: person.cybele

<img width="408" alt="Screenshot 2025-04-18 at 17 55 24" src="https://github.com/user-attachments/assets/1f81fd53-d73f-42c4-a3ec-f3669fb8c641" />
<img width="398" alt="Screenshot 2025-04-18 at 17 55 35" src="https://github.com/user-attachments/assets/d90efa7e-5808-405a-abd1-81b125c16072" />
