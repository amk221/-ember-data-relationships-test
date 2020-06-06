import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import Pretender from "pretender";

module("rollback", function (hooks) {
  setupTest(hooks);

  test("it works", async function (assert) {
    const store = this.owner.lookup("service:store");
    const server = new Pretender();

    server.get("/foos/1", () => [200, {}, '{"foo":{"id":"1","bar":"1"}}']);
    server.get("/bars/1", () => [200, {}, '{"bar":{"id":"1"}}']);
    server.get("/bars/2", () => [200, {}, '{"bar":{"id":"2"}}']);
    server.put("/foos/1", () => [500, {}, "{}"]);

    const bar1 = await store.findRecord("bar", 1); // Comment this out to get test to pass
    const bar2 = await store.findRecord("bar", 2);
    const foo1 = await store.findRecord("foo", 1);

    assert.deepEqual(foo1.serialize({ includeId: true }), { id: "1", bar: "1", },
      'precondition: foo has bar 1 as relationship');

    const originalBar = foo1.get("bar");

    foo1.set("bar", bar2);

    assert.deepEqual(foo1.serialize({ includeId: true }), { id: "1", bar: "2", },
      'foo has bar 2 as relationship');

    async function attemptSave() {
      try {
        await foo1.save()
      } catch(error) {
        foo1.set("bar", originalBar);
      }
    }

    await attemptSave();

    assert.deepEqual(foo1.serialize({ includeId: true }), { id: "1", bar: "1", },
      "foo's bar relationship is rolled back if saving fails");
  });
});
