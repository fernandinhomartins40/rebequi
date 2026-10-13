-- CreateTable
CREATE TABLE "product_unit_policies" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "requestKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "commercialUnit" TEXT NOT NULL,
    "stockUnit" TEXT NOT NULL,
    "stockPerCommercialUnit" DECIMAL(12,3) NOT NULL,
    "quantityStep" DECIMAL(12,3) NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_unit_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_unit_policies_requestKey_key" ON "product_unit_policies"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "product_unit_policies_productId_version_key" ON "product_unit_policies"("productId", "version");

-- AddForeignKey
ALTER TABLE "product_unit_policies" ADD CONSTRAINT "product_unit_policies_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE product_unit_policies ADD CONSTRAINT product_unit_policy_bounds CHECK (
 version>0 AND length(reason) BETWEEN 3 AND 300
 AND "commercialUnit" IN ('UNIT','PACKAGE','BAG','BOX','KG','TONNE','M','M2','M3','L')
 AND "stockUnit" IN ('UNIT','PACKAGE','BAG','BOX','KG','TONNE','M','M2','M3','L')
 AND "stockPerCommercialUnit">0 AND "quantityStep">0
 AND ("commercialUnit"<>"stockUnit" OR "stockPerCommercialUnit"=1)
 AND ("commercialUnit" NOT IN ('UNIT','PACKAGE','BAG','BOX') OR "quantityStep"=trunc("quantityStep"))
 AND "stockPerCommercialUnit"*"quantityStep"*1000=trunc("stockPerCommercialUnit"*"quantityStep"*1000)
);
CREATE TRIGGER product_unit_policy_immutable BEFORE UPDATE OR DELETE ON product_unit_policies FOR EACH ROW EXECUTE FUNCTION rebequi_guard_financial_snapshot();
CREATE FUNCTION rebequi_guard_product_unit_policy_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM products WHERE id=NEW."productId" FOR UPDATE;
 IF NEW.version<>(SELECT COALESCE(max(version),0)+1 FROM product_unit_policies WHERE "productId"=NEW."productId") THEN
  RAISE EXCEPTION 'Unit policy version must follow the previous recorded version';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER product_unit_policy_version_guard BEFORE INSERT ON product_unit_policies FOR EACH ROW EXECUTE FUNCTION rebequi_guard_product_unit_policy_version();

