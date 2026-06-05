import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("app favicon is a valid multi-size ICO derived from BuckParts source", () => {
  const root = process.cwd();
  const icoPath = join(root, "src/app/favicon.ico");
  const jpegPath = join(root, "buckparts-favicon-48.jpeg");

  const ico = readFileSync(icoPath);
  const jpeg = readFileSync(jpegPath);

  assert.ok(ico.length > 0, "favicon.ico must exist");
  assert.notDeepEqual(ico, jpeg, "favicon.ico must not be a renamed JPEG");
  assert.equal(ico.subarray(0, 4).toString("hex"), "00000100", "ICO magic header");

  const entryCount = ico.readUInt16LE(4);
  assert.equal(entryCount, 3, "expected 16/32/48 ICO entries");

  const sizes: number[] = [];
  let offset = 6;
  for (let i = 0; i < entryCount; i += 1) {
    const widthByte = ico[offset];
    const heightByte = ico[offset + 1];
    const width = widthByte === 0 ? 256 : widthByte;
    const height = heightByte === 0 ? 256 : heightByte;
    assert.equal(width, height, "ICO entries should be square");
    sizes.push(width);
    offset += 16;
  }
  assert.deepEqual(sizes.sort((a, b) => a - b), [16, 32, 48]);
});
