import {assert} from "chai";

import fs from "fs";
import path from "path";

import MdxProcessor from "../src/processor.js";

const processor = new MdxProcessor("test");

function processAndCompare(filename: string) {
  const inDoc = fs.readFileSync(path.join('test', 'fixtures', filename), { encoding: 'utf-8' });

  const doc = processor.parse(inDoc);
  const docStr = JSON.stringify(doc);

  const outDoc = processor.stringify(doc);
  const outDocStructure = processor.parse(outDoc);
  const outDocStructureStr = JSON.stringify(outDocStructure);

  assert.equal(outDocStructureStr, docStr);
  console.log(filename);
}

describe('MdProcessorTest', function() {
  it('documents should be equal', function() {
    processAndCompare('mdx-simple-test.mdx');
    processAndCompare('exports.mdx');
    processAndCompare('extending-mdx.mdx');
    processAndCompare('index.mdx');
    processAndCompare('using-mdx.mdx');
  });
});



