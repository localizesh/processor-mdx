import MdProcessor from "@localizesh/processor-md";
import parse from "remark-parse";
import stringify from "remark-stringify";
import {Document, LayoutElement} from "@localizesh/sdk";
import {State as H} from "hast-util-to-mdast";
import {Parents as HastParents} from "hast";
import {State} from "mdast-util-to-hast";
import {unified} from "unified";
import mdx from "remark-mdx";
import remarkFrontmatter from "remark-frontmatter";
import gfm from "remark-gfm";
import {MdastRoot} from "rehype-remark/lib";
import {visitParents} from "unist-util-visit-parents";
import {deleteFields} from "./utils/deleteFields.js";
import {getTagNameWithAttributes} from "./utils/getTagNameWithAttributes.js";
import {getFlatChildren} from "./utils/getFlatChildren.js";
type MdastNodes = import('mdast').Nodes;

const HTML_SIMPLE_TAG: string[] = ["html", "aside", "blockquote", "body", "dl", "details", "div", "figure", "footer", "head", "header", "iframe", "noscript", "object", "ol", "q", "ruby", "samp", "script", "section", "style", "table", "template", "ul"];
const AVOID_HTML_TYPE: string = "html!";
const AVOID_HTML_TAGS: string[] = ["iframe", "html"];

let replaceMap: any = {}
let count: number = 1

const findEmptyStringIndices = (array: string[], errorIndex: number, isTagError: boolean) => {
    let endIndex = -1;
    let startIndex = -1;
    let tempEndIndex = -1;
    let tempStartIndex = -1;
    const codeLineRegex = /^ {4,}|^$/;

    for (let i = errorIndex; i < array.length; i++) {
        const searchRule = isTagError ? array[i] === "" : !codeLineRegex.test(array[i]);
        if (searchRule) {
            tempEndIndex = i - 1;
            break;
        }
    }

    if(tempEndIndex <= 0){
        tempEndIndex = array.length - 1
    }

    for (let i = errorIndex - 1; i >= 0; i--) {
        const searchRule = isTagError ? array[i] === "" : !codeLineRegex.test(array[i]);
        if (searchRule) {
            tempStartIndex = i + 1;
            break;
        }
    }

    for (let i = tempStartIndex; i < array.length; i++) {
        if (array[i]) {
            startIndex = i;
            break;
        }
    }

    for (let i = tempEndIndex; i >= 0; i--) {
        if (array[i]) {
            endIndex = i;
            break;
        }
    }

    return { startIndex, endIndex };
}

const errorHandler = (e: any, doc: string) => {
    const errorIndex = e.line -1
    const docArr = doc.split(/\r\n|\r|\n/)
    const placeholder = "incorrect_syntax_" + count
    const lineValue = docArr[errorIndex]?.trim()

    if(e.ruleId === "unexpected-eof"){
        const {startIndex, endIndex} = findEmptyStringIndices(docArr, errorIndex, false)
        docArr.splice(startIndex, 0, "```");
        docArr.splice(endIndex + 2, 0, "```");
    }

    if(e.ruleId === "acorn"){
        const {startIndex, endIndex} = findEmptyStringIndices(docArr, errorIndex, false)
        const deleteCount = endIndex - startIndex + 1
        replaceMap[placeholder] = docArr.splice(startIndex, deleteCount <= 0 ? 1 : deleteCount, placeholder).join("\n");
        count++;
    }

    if(e.ruleId === "unexpected-closing-slash" || e.ruleId === "end-tag-mismatch"){
        const {startIndex, endIndex} = findEmptyStringIndices(docArr, errorIndex, true)
        const deleteCount = endIndex - startIndex + 1
        replaceMap[placeholder] = docArr.splice(startIndex, deleteCount <= 0 ? 1 : deleteCount, placeholder).join("\n");
        count++;
    }

    if(e.ruleId === "unexpected-character"){
        replaceMap[placeholder] = docArr[errorIndex]
        docArr[errorIndex] = docArr[errorIndex].replace(lineValue, placeholder)
        count++;
    }

    return docArr.join("\n")
}

class MdxProcessor extends MdProcessor {
    parseMarkdownToMdast(doc: string): { mdast: MdastRoot, newDoc: string } {
        let mdast: MdastRoot

        try {
            mdast = unified()
                .use(parse)
                .use(mdx)
                .use(remarkFrontmatter, ["yaml", "toml"])
                .use(gfm)
                .parse(doc);
        } catch (e: any) {
            const newDoc: string = errorHandler(e, doc)

            return this.parseMarkdownToMdast(newDoc)
        }

        const replacePlaceholders = (): void => {
            visitParents(mdast, (node: any) => node.type === "text", (node: any, parent: any)=> {
                const keys = Object.keys(replaceMap)

                keys.forEach((key)=>{
                    if(node.value.includes(key)){
                        const source = replaceMap[key]
                        const lengthDiff: number = source.length - key.length

                        node.value = node.value.replace(key, source)
                        doc = doc.replace(key, source)

                        visitParents(mdast, (child: any) => "position" in child, (child: any, _: any)=> {
                            if (child.position.start.offset >= node.position.end.offset) {
                                child.position.start.offset += lengthDiff
                                child.position.end.offset += lengthDiff
                            }
                        })

                        delete replaceMap[key]
                    }
                })
            })
        }

        while (Object.keys(replaceMap).length > 0) {
            replacePlaceholders()
        }

        return { mdast, newDoc: doc }
    }

    parseMdastToMarkdown(mdast: MdastRoot): string {
        return unified()
            .use(mdx)
            .use(gfm)
            .use(stringify, {
                handlers: super.getMdastToStringHandlers(),
            })
            .stringify(mdast) as string;
    }

    public parse(doc: string): Document {
        const mdxHandler = (h: State, node: MdastNodes) => ({
            ...node,
            children: h.all(node)
        });

        const mdxParagraphHandler = (h: State, node: any) => {
            visitParents(node, { type: "mdxJsxTextElement" }, (child: any, parent) => {
                const tag: string = getTagNameWithAttributes(child);

                if (HTML_SIMPLE_TAG.includes(child.name)) {
                    node.type = AVOID_HTML_TAGS.includes(child.name) ? AVOID_HTML_TYPE : "raw";
                    child.value = `${tag}${child.children[0].value}</${child.name}>`;

                    delete child.attributes;
                    delete child.name;
                    delete child.type;
                } else {
                    child.children = [{
                        type: "html",
                        marker: "html",
                        value: `${tag}`
                    }, ...child.children, {
                        type: "html",
                        marker: "html",
                        value: `</${child.name}>`
                    }];

                    delete child.attributes;
                    delete child.name;
                }
            });

            if (node.type === AVOID_HTML_TYPE || node.type === "raw") {
                node.value = node.children.map((child: any) => child.value).join("");
                delete node.children;

                return node;
            } else {
                node.children = getFlatChildren(node.children).flat(Infinity);

                return this.mdParagraphHandler(h, node, this.mdast);
            }
        };

        const jsxFlowElementHandler = (h: H, node: HastParents) => {

          return {
            type: "element",
            tagName: "p",
            properties: {},
            children: [
              {
                type: "text",
                value: this.parseMdastToMarkdown(
                  {type: "root", children: [node]} as MdastRoot
                )
              }
            ]
          };
        };
        //@ts-ignore
        this.addMdastToHastHandler({}, {
            mdxjsEsm: mdxHandler,
            mdxJsxFlowElement: jsxFlowElementHandler,
            mdxFlowExpression: mdxHandler,
            mdxTextExpression: mdxHandler,
            paragraph: mdxParagraphHandler,
            heading: mdxParagraphHandler
        });
        this.addPassThroughTypes(["mdxJsxFlowElement", "mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"])

        return super.parse(doc);
    }

    public stringify(data: Document): string {
        const mdxHandler = (h: H, node: HastParents) => ({
            ...node,
            children: h.all(node),
        });

        //@ts-ignore
        this.addHastToMdastHandler({}, {
            mdxjsEsm: mdxHandler,
            mdxJsxFlowElement: mdxHandler,
            mdxFlowExpression: mdxHandler,
            mdxTextExpression: mdxHandler,
        });

        return super.stringify(data);
    }

    getElementFromConvertHastToSegment(node: LayoutElement, isNodeList: boolean, convertNode: any): any {
        if (node.type === "element" ||
            node.type === "mdxjsEsm" ||
            node.type === "mdxJsxFlowElement" ||
            node.type === "mdxFlowExpression" ||
            node.type === "mdxTextExpression") {

            deleteFields(node)
            const children = node.children.map(convertNode);

            return {
                ...node,
                children: children,
            };
        }
    }

    segmentsToHast(data: Document): any {
        const layout = super.segmentsToHast(data);

        visitParents(layout, { tagName: "mdxTextExpression" }, (node: any, parent) => {
            node.type = node.tagName
            node.value = node.children[0].value
            node.data = node.properties.data

            delete node.children;
            delete node.properties;
            delete node.tagName;
        });

        return layout
    }
}

export default MdxProcessor
