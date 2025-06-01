# SQLMESH project

## Commands sqlmesh
- `sqlmesh plan` - runs stuff

## Commands DuckDB
- `show all tables`
- `copy migros.slv_kassenbons to '/Users/janbenisek/Desktop/migros.csv' (header, delimiter ',');`

## Migros analysis
Columns
- Datum = date of purchase
- Zeit = time of purchase
- Filiale = location of the store, remove some (like "MICASA")
- Kassennummer = number of the checkout
- Transaktionsnummer = like purchase number, groups all items into one visit
- Artikel = name of the item
- menge = quantity
- Aktion = discount, amount saved
- umsatz = total amount paid for item(s)

example:
`banen menge: 1.413, umsatz 3.25, so price per kg is 3.25/1.413=2.3`

Notes
- some rows start with "CUM", which are cumulus points, ignore
  - some give further discount. I ignore those, but the total then will not be 100% correct
  - some rows start with "Bonus-Coupon", bonus coupons, remove

Sample:
```shell
  Datum;Zeit;Filiale;Kassennummer;Transaktionsnummer;Artikel;Menge;Aktion;Umsatz
  29.11.2021;09:07:19;MM Adliswil;252;10;Die Butter;1;0.00;3.40
  29.11.2021;09:07:19;MM Adliswil;252;10;Total Oxi Booster whit;1;0.00;12.90
  29.11.2021;09:07:19;MM Adliswil;252;10;Kartoffelbrot Nuss;1;0.00;2.70
```

