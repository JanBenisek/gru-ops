
MODEL (
  name migros.kassenbons,
  kind FULL,
  cron '@daily',
  grain (datum, kassennummer, artikel),
  -- audits (assert_positive_order_ids),
);
select
	to_date(Datum, 'DD.MM.YYYY') as datum,
	Zeit as zeit,
	Filiale as filiale,
	Kassennummer as kassennummer,
	Transaktionsnummer as transaktionnummer,
	Artikel as artikel,
	Menge as menge,
	Aktion as aktion,
	Umsatz as umsatz,
	(Umsatz + abs(Aktion/Menge)) as sku_price

from migros.raw_kassenbons
where Filiale == 'MM Adliswil'
-- lost about 364 records
	and Artikel not like '%Bonus-Coupon%'
	and Artikel not like '%CUM%'
	and Artikel not like '%Cumulus%'

