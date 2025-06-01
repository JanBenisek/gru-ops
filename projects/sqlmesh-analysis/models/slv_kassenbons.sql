
MODEL (
  name migros.slv_kassenbons,
  kind FULL,
  cron '@daily',
  grain (Datum, Kassennummer, Artikel),
  -- audits (assert_positive_order_ids),
);
select
	Datum,
	Zeit,
	Filiale,
	Kassennummer,
	Transaktionsnummer,
	Artikel,
	Menge,
	Aktion,
	Umsatz,
	(Umsatz + abs(Aktion/Menge)) as sku_price

from migros.raw_kassenbons
where Filiale == 'MM Adliswil'
-- lost about 364 records
	and Artikel not like '%Bonus-Coupon%'
	and Artikel not like '%CUM%'
	and Artikel not like '%Cumulus%'

