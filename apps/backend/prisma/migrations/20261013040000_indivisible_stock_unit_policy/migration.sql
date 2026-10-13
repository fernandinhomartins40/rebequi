-- Preserve immutable historical policies; enforce this invariant on new versions.
-- Existing policies remain preparatory and cannot activate fractional stock.
ALTER TABLE product_unit_policies
ADD CONSTRAINT product_unit_policy_indivisible_stock CHECK (
  "stockUnit" NOT IN ('UNIT', 'PACKAGE', 'BAG', 'BOX')
  OR "stockPerCommercialUnit" * "quantityStep" = trunc("stockPerCommercialUnit" * "quantityStep")
) NOT VALID;
