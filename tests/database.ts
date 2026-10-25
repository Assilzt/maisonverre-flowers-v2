import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { setTestDatabase, sql } from "../backend/repositories/connection";
export async function testDatabase() {
  const db = new PGlite();
  for (const file of (
    await readdir(new URL("../database/migrations/", import.meta.url))
  )
    .filter(f => f.endsWith(".sql"))
    .sort())
    await db.exec(
      await readFile(
        new URL("../database/migrations/" + file, import.meta.url),
        "utf8"
      )
    );
  let queue = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>) => {
    const next = queue.then(fn);
    queue = next.then(
      () => {},
      () => {}
    );
    return next;
  };
  const statement = (text: string, values: unknown[]) => {
    let promise: Promise<unknown> | undefined;
    return {
      _query: { text, values },
      then(
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown
      ) {
        promise ??= exclusive(async () => (await db.query(text, values)).rows);
        return promise.then(resolve, reject);
      },
    };
  };
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    const params: unknown[] = [];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v && typeof v === "object" && "raw" in v) text += String(v.raw);
      else {
        params.push(v);
        text += "$" + params.length;
      }
      text += strings[i + 1];
    }
    return statement(text, params);
  };
  tag.unsafe = (raw: string) => ({ raw });
  tag.query = statement;
  tag.transaction = (
    items: Array<{ _query: { text: string; values: unknown[] } }>
  ) =>
    exclusive(async () => {
      await db.exec("BEGIN");
      try {
        const results = [];
        for (const item of items)
          results.push(
            (await db.query(item._query.text, item._query.values)).rows
          );
        await db.exec("COMMIT");
        return results;
      } catch (e) {
        await db.exec("ROLLBACK");
        throw e;
      }
    });
  setTestDatabase(tag as unknown as NonNullable<typeof sql>);
  return db;
}
