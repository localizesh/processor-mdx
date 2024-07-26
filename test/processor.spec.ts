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

  assert.equal(outDocStructureStr, docStr);
  console.log(filename);
}


function processAndCompareWithExpected(filename: string) {
  const inDoc = fs.readFileSync(path.join('test', 'fixtures', filename), { encoding: 'utf-8' });
  const inDocExpected = fs.readFileSync(path.join('test', 'expected', filename), { encoding: 'utf-8' });


  const doc = processor.parse(inDoc);
  const outDoc = processor.stringify(doc);

  assert.equal(outDoc, inDocExpected);
  console.log(filename);
}

describe('MdxProcessorTest', function() {
  it('documents should be equal', function() {
    this.timeout(10000);
    // processAndCompareWithExpected('blockquotes.mdx');
    // processAndCompareWithExpected('1index.mdx');
    // processAndCompareWithExpected('using-mdx.mdx');
    // processAndCompare('15.10.mdx');
    processAndCompare('docs_style.mdx');
    processAndCompare('headings.mdx');
    processAndCompare('markdown-cheat-sheet.mdx');
    processAndCompare('overview.mdx');
    processAndCompare('test2.mdx');
    processAndCompare('tff_for_research.mdx');
    processAndCompare('sigs.mdx');
    processAndCompare('mdx-simple-test.mdx');
    processAndCompare('exports.mdx');
    processAndCompare('extending-mdx.mdx');
    processAndCompare('index.mdx');
  });
});



