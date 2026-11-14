import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../reader.mjs';

const token = 'x'.repeat(48);
const handler = (method, path, provided, hasDb = true) => {
  let reads = 0;
  const db = {
    prepare(sql) {
      reads++;
      assert.match(sql, /^SELECT /);
      return {
        async first() { return { revision:0, updated_at:'1970-01-01T00:00:00.000Z' }; },
        async all() { return { results:[] }; },
      };
    },
  };
  const request = new Request('https://example.workers.dev' + path, {
    method,
    headers: provided ? { Authorization:'Bearer ' + provided } : {},
  });
  const env = { ORBIT_PRIORITIES_TOKEN:token, PRIORITIES_DB:hasDb ? db : null };
  return { response:worker.fetch(request,env), reads:()=>reads };
};

test('unauthenticated callers cannot read D1', async () => {
  const call = handler('GET','/v1/priorities',null);
  const r = await call.response;
  assert.equal(r.status,401);
  assert.equal(call.reads(),0);
});
test('invalid token cannot read D1', async () => {
  const call = handler('GET','/v1/priorities','y'.repeat(48));
  assert.equal((await call.response).status,401);
  assert.equal(call.reads(),0);
});
test('reader rejects POST', async () => {
  const call = handler('POST','/v1/priorities',token);
  assert.equal((await call.response).status,405);
  assert.equal(call.reads(),0);
});
test('reader rejects unexpected paths and queries', async () => {
  for(const path of ['/v1/anything','/v1/priorities?debug=1']){
    const call = handler('GET',path,token);
    assert.equal((await call.response).status,404);
    assert.equal(call.reads(),0);
  }
});
test('reader returns revision zero and no data in new D1', async () => {
  const call = handler('GET','/v1/priorities',token);
  const r=await call.response;
  assert.equal(r.status,200);
  assert.equal(r.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(await r.json(), {
    source:'orbit-d1',revision:0,updated_at:'1970-01-01T00:00:00.000Z',
    priorities:[],has_more:false
  });
  assert.equal(call.reads(),2);
});
test('missing database does not return data', async () => {
  const call=handler('GET','/v1/priorities',token,false);
  assert.equal((await call.response).status,503);
});
