import { describe, it, expect } from 'vitest';
import eol from "eol";

import fs from "fs";
import path from "path";

import MdxProcessor from "../src/processor.js";

const processor = new MdxProcessor();

function processAndCompare(filename: string) {
  const inDoc = fs.readFileSync(path.join('test', 'fixtures', filename), {encoding: 'utf-8'});

  const doc = processor.parse(inDoc);
  const docStr = JSON.stringify(doc);

  const outDoc = processor.stringify(doc);
  const outDocStructure = processor.parse(outDoc);
  const outDocStructureStr = JSON.stringify(outDocStructure);

  expect(outDocStructureStr).toBe(docStr);
  console.log(filename);
}


function processAndCompareWithExpected(filename: string) {
  const inDoc = eol.lf(fs.readFileSync(path.join('test', 'fixtures', filename), {encoding: 'utf-8'}));
  const inDocExpected = eol.lf(fs.readFileSync(path.join('test', 'expected', filename), {encoding: 'utf-8'}));


  const doc = processor.parse(inDoc);
  const outDoc = processor.stringify(doc);

  expect(outDoc).toBe(inDocExpected);
  console.log(filename);
}

describe('MdxProcessorTest', () => {
  it('documents should be equal', () => {
    // Timeout is configured in vitest.config.ts
    processAndCompareWithExpected('blockquotes.mdx');
    processAndCompareWithExpected('1index.mdx');
    processAndCompareWithExpected('using-mdx.mdx');
    processAndCompare('edge.mdx');
    processAndCompare('15.10.mdx');
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
