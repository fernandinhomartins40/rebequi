import assert from 'node:assert/strict';

export function validateCommercialConsistency(db) {
  const result = db(`
    const assert = (await import('node:assert/strict')).default;
    const {randomUUID} = await import('node:crypto');
    const {SaleRepository} = await import('./apps/backend/dist/repositories/sale.repository.js');
    const {runIntegrationJobs} = await import('./apps/backend/dist/services/integration-outbox.service.js');
    const category = await prisma.category.findFirstOrThrow();
    const key = randomUUID();
    const p = await prisma.product.create({data:{name:'Concurrency validation',slug:key,price:10,stock:1,categoryId:category.id}});
    const repo = new SaleRepository();
    let channel;
    try {
      channel = await prisma.channel.create({data:{type:'MANUAL',name:'Integration validation '+key}});
      await prisma.channelListing.create({data:{channelId:channel.id,productId:p.id,syncStatus:'SYNCED'}});
      const create = () => repo.createSaleWithStock({sale:{referenceCode:randomUUID(),status:'PAID',paymentMethod:'PIX',subtotal:10,total:10,items:{create:[{productId:p.id,productNameSnapshot:p.name,quantity:1,unitPrice:10}]}},stockDecrements:[{productId:p.id,quantity:1,stockBefore:999,reason:'validation'}]});
      const concurrent = await Promise.allSettled([create(),create()]);
      assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
      assert.equal((await prisma.product.findUniqueOrThrow({where:{id:p.id}})).stock,0);
      assert.equal(await prisma.saleItem.count({where:{productId:p.id}}),1);
      const sale = concurrent.find(r=>r.status==='fulfilled').value;
      const movement = await prisma.stockMovement.findFirstOrThrow({where:{productId:p.id,type:'SALE'}});
      assert.equal(movement.stockBefore,1); assert.equal(movement.stockAfter,0);
      assert.equal((await prisma.channelListing.findFirstOrThrow({where:{productId:p.id}})).syncStatus,'OUT_OF_SYNC');
      assert.equal(await prisma.integrationJob.count({where:{productId:p.id}}),1);
      await Promise.all([repo.transitionStatus(sale.id,'CANCELED'),repo.transitionStatus(sale.id,'CANCELED')]);
      assert.equal((await prisma.product.findUniqueOrThrow({where:{id:p.id}})).stock,1);
      assert.equal(await prisma.stockMovement.count({where:{productId:p.id,type:'RETURN'}}),1);
      await assert.rejects(()=>repo.transitionStatus(sale.id,'PAID'));
      const pending = await prisma.integrationJob.findFirstOrThrow({where:{productId:p.id}});
      await prisma.integrationJob.update({where:{id:pending.id},data:{status:'RUNNING',leaseToken:'expired-worker',leaseUntil:new Date(0)}});
      await runIntegrationJobs();
      assert.equal(await prisma.integrationJob.count({where:{productId:p.id,status:'COMPLETED'}}),2);
      await runIntegrationJobs();
      assert.equal((await prisma.product.findUniqueOrThrow({where:{id:p.id}})).stock,1);
      const {getChannelAdapter}=await import('./apps/backend/dist/services/channels/index.js');
      for(const provider of ['SHOPEE','AMAZON']) assert.equal((await getChannelAdapter(provider).testConnection({})).ok,false);
      const {ChannelService}=await import('./apps/backend/dist/services/channel.service.js');
      await new ChannelService().deleteChannel(channel.id);
      assert.equal((await prisma.channel.findUniqueOrThrow({where:{id:channel.id}})).isActive,false);
      assert.equal(await prisma.channelListing.count({where:{channelId:channel.id}}),1);
      console.log('COMMERCIAL_CONSISTENCY_OK');
    } finally {
      await prisma.integrationJob.deleteMany({where:{productId:p.id}});
      const items=await prisma.saleItem.findMany({where:{productId:p.id},select:{saleId:true}});
      await prisma.stockMovement.deleteMany({where:{productId:p.id}});
      await prisma.sale.deleteMany({where:{id:{in:items.map(i=>i.saleId)}}});
      if(channel) await prisma.channel.delete({where:{id:channel.id}});
      await prisma.product.delete({where:{id:p.id}});
    }
  `);
  assert.ok(result.includes('COMMERCIAL_CONSISTENCY_OK'), result);
}
