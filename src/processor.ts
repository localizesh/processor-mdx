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

class MdxProcessor extends MdProcessor {
    parseMarkdownToMdast(doc: string): MdastRoot {
        return unified()
            .use(parse)
            .use(mdx)
            .use(remarkFrontmatter, ["yaml"])
            .use(gfm)
            .parse(doc);
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

    public parse(doc: string, ctx?: Context): Document {
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

        return super.parse(doc, ctx);
    }

    public stringify(data: Document, ctx?: Context): string {
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
        
        return super.stringify(data, ctx);
    }

    getElementFromConvertHastToSegment(node: LayoutNode, isNoConvertNode: boolean, convertNode: any): any {
        if ((node.type === "element" ||
            node.type === "yaml" ||
            node.type === "mdxjsEsm" ||
            node.type === "mdxJsxFlowElement" ||
            node.type === "mdxFlowExpression" ||
            node.type === "mdxTextExpression") && !isNoConvertNode) {

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