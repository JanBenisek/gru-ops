MODEL (
  name migros.raw_kassenbons,
  kind FULL,
  cron '@daily',
  grain (Datum, Kassennummer, Artikel),
  -- audits (assert_positive_order_ids),
);

select
	* 
from read_csv('/Users/janbenisek/Downloads/20230101_20231231.csv')
union all
select
	*
from read_csv('/Users/janbenisek/Downloads/20240101_20241231.csv')
union all
select
	*
from read_csv('/Users/janbenisek/Downloads/20250101_20251231.csv')
