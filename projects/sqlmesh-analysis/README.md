# SQLMESH project

## Commands sqlmesh
- `sqlmesh plan` - runs stuff


## Migros analysis
Columns
- Datum (purchase_date) = date of purchase
- Zeit (purchase_time) = time of purchase
- Filiale (branch) = location of the store, remove some (like "MICASA")
- Kassennummer (cash_register_number) = number of the checkout
- Transaktionsnummer (transaction_number) = like purchase number, groups all items into one visit
- Artikel (article) = name of the item
- menge (quantity) = quantity
- Aktion (discount) = discount, amount saved
- umsatz (total) = total amount paid for item(s)

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

## SQL
```sql
create table migros.raw_kassenbons  (
    purchase_date text,
    purchase_time text,
    branch text,
    cash_register_number text,
    transaction_number int,
    article text,
    quanitity float,
    discount float,
    total float
);
```
