import {assert} from "chai";

import fs from "fs";
import path from "path";

import MdxProcessor from "../src/processor.js";

const processor = new MdxProcessor();

function processAndCompare(filename: string) {
  const inDoc = fs.readFileSync(path.join('test', 'fixtures', filename), { encoding: 'utf-8' });

  const doc = processor.parse(inDoc);
  const docStr = JSON.stringify(doc);

  const outDoc = processor.stringify(doc);
  const outDocStructure = processor.parse(outDoc);
  const outDocStructureStr = JSON.stringify(outDocStructure);

  assert.equal(outDoc, inDoc);
  // assert.equal(outDocStructureStr, docStr);
  console.log(filename);
}

describe('MdProcessorTest', function() {
  it('documents should be equal', function() {
    // processAndCompare('15.10.mdx');
    // processAndCompare('create_cover_page.mdx');
    // processAndCompare('docs.mdx');

    // processAndCompare('code.mdx');
    // processAndCompare('complex.mdx');

    processAndCompare('deck2.mdx');

    // processAndCompare('docs_style.mdx');
    processAndCompare('headings.mdx');
    processAndCompare('images.mdx');
    processAndCompare('Lindex.mdx');
    processAndCompare('links.mdx');
    processAndCompare('markdown-cheat-sheet.mdx');
    processAndCompare('misc.mdx');
    processAndCompare('overview.mdx');
    processAndCompare('tables.mdx');
    processAndCompare('test2.mdx');
    processAndCompare('tff_for_research.mdx');
    processAndCompare('mdx-simple-test.mdx');
    processAndCompare('exports.mdx');
    processAndCompare('extending-mdx.mdx');
    processAndCompare('index.mdx');
    processAndCompare('using-mdx.mdx');
  });
});



