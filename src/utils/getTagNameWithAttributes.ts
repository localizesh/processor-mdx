import type { MdxJsxAttribute } from "mdast-util-mdx";

export function getTagNameWithAttributes(node: any): string {
  const attrs: string[] = node.attributes.map((attr: MdxJsxAttribute): string => `${attr.name}="${attr.value}"`);
  const stringOfAttrs: string = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";

  return `<${node.name}${stringOfAttrs}>`;
}
