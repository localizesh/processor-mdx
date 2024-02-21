import MdProcessor from "@localizeio/md";
import parse from "remark-parse";
import stringify from "remark-stringify";
import {Context, Document, LayoutNode} from "@localizeio/lib";
import {all as toMdastAll, H, Node} from "hast-util-to-mdast/lib/all.js";
import {State} from "mdast-util-to-hast/lib/state";
import {unified} from "unified";
import mdx from "remark-mdx";
import remarkFrontmatter from "remark-frontmatter";
import gfm from "remark-gfm";
import {MdastRoot} from "rehype-remark/lib";
import {visitParents} from "unist-util-visit-parents";
import {deleteFields} from "./utils/deleteFields.js";
type MdastNodes = import('mdast').Nodes;

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
    constructor(context: Context) {
        super(context)
    }

    parseMarkdownToMdast(doc: string): MdastRoot {
        let mdast: MdastRoot

        try {
            mdast = unified()
                .use(parse)
                .use(mdx)
                .use(remarkFrontmatter, ["yaml"])
                .use(gfm)
                .parse(doc);
        } catch (e: any) {
            const newDoc = errorHandler(e, doc)

            mdast = this.parseMarkdownToMdast(newDoc)
        }

        visitParents(mdast, (node: any) => node.type === "text", (node: any, parent: any)=> {
            const value = node.value
            const keys = Object.keys(replaceMap)

            keys.forEach((key)=>{
                if(value.includes(key)){
                    const source = replaceMap[key]
                    node.value = value.replace(key, source)
                }
            })
        })

        return mdast
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

        this.addMdastToHastHandler({
            mdxjsEsm: mdxHandler,
            mdxJsxFlowElement: mdxHandler,
            mdxFlowExpression: mdxHandler,
            mdxTextExpression: mdxHandler
        });
        this.addPassThroughTypes(["mdxJsxFlowElement", "mdxjsEsm", "mdxFlowExpression", "mdxTextExpression"])

        return super.parse(doc);
    }

    public stringify(data: Document): string {
        const mdxHandler = (h: H, node: Node) => ({
            ...node,
            children: toMdastAll(h, node),
        });

        this.addHastToMdastHandler({
            mdxjsEsm: mdxHandler,
            mdxJsxFlowElement: mdxHandler,
            mdxFlowExpression: mdxHandler,
            mdxTextExpression: mdxHandler,
        });
        
        return super.stringify(data);
    }

    getElementFromConvertHastToSegment(node: LayoutNode, isNodeList: boolean, convertNode: any): any {
        if (node.type === "element" ||
            // node.type === "yaml" ||
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