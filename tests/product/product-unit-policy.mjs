import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
export async function validateProductUnitPolicy({ admin, owner, guest, baseURL, data, db, product }) {
  const path = `/api/products/admin/${product.id}/unit-policy`; const headers = { Origin: baseURL };
  const before = JSON.parse(db(`console.log(JSON.stringify(await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}},select:{stock:true,reservedStock:true,price:true}})));`).trim());
  assert.deepEqual(await data(await admin.get(path)), { policy: null, operational: false });
  const input = { requestKey: randomUUID(), expectedVersion: 0, policy: { commercialUnit: 'M3', stockUnit: 'M3', stockPerCommercialUnit: '1', quantityStep: '0.125', confirmed: true }, reason: 'Unidades conferidas no teste isolado' };
  assert.equal((await owner.put(path, { headers, data: input })).status(), 403);
  assert.equal((await guest.put(path, { headers, data: input })).status(), 403);
  assert.equal((await admin.put(path, { data: input })).status(), 403);
  const replies = await Promise.all([admin.put(path, { headers, data: input }), admin.put(path, { headers, data: input })]);
  const first = await data(replies[0]); assert.deepEqual(await data(replies[1]), first); assert.equal(first.policy.version, 1); assert.equal(first.operational, false);
  assert.equal((await admin.put(path, { headers, data: { ...input, reason: 'Outra intenção com a mesma chave' } })).status(), 409);
  assert.equal((await admin.put(path, { headers, data: { ...input, requestKey: randomUUID() } })).status(), 409);
  const second = await data(await admin.put(path, { headers, data: { ...input, requestKey: randomUUID(), expectedVersion: 1, policy: { ...input.policy, quantityStep: '0.25' } } }));
  assert.equal(second.policy.version, 2); assert.equal((await data(await admin.get(path))).policy.id, second.policy.id);
  assert.deepEqual(await data(await admin.put(path, { headers, data: input })), first);
  const immutable = JSON.parse(db(`let blocked=false;try{await prisma.productUnitPolicy.update({where:{id:${JSON.stringify(first.policy.id)}},data:{quantityStep:'0.5'}});}catch{blocked=true;}console.log(JSON.stringify({blocked}));`).trim().split('\n').at(-1)); assert.equal(immutable.blocked, true);
  assert.equal(Number(db(`console.log(await prisma.productUnitPolicy.count({where:{productId:${JSON.stringify(product.id)}}}));`).trim()), 2);
  assert.deepEqual(JSON.parse(db(`console.log(JSON.stringify(await prisma.product.findUniqueOrThrow({where:{id:${JSON.stringify(product.id)}},select:{stock:true,reservedStock:true,price:true}})));`).trim()), before);
}
