
MODEL (
  name migros.kassenbons,
  kind FULL,
  cron '@daily',
  grain (purchase_date, branch, cash_register_number, item),
  -- audits (assert_positive_order_ids),
);

select
	to_date(purchase_date, 'DD.MM.YYYY') as purchase_date,
	purchase_time,
	branch,
	cash_register_number,
	transaction_number,
	item,
	quantity,
	discount,
	total,
	(total/quantity) as sku_price_paid,
	((total+abs(discount))/quantity) as sku_price_full

from migros.raw_kassenbons
where branch = 'MM Adliswil'
-- lost about 364 records
	and item not like '%Bonus-Coupon%'
	and item not like '%CUM%'
	and item not like '%Cumulus%';
