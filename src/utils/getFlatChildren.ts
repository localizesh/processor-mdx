export function getFlatChildren(children: any) {
  return children.map((child: any) => {
    if (child.type === "mdxJsxTextElement") {
      return getFlatChildren(child.children);
    } else {
      return child;
    }
  })
}
