export function getFlatChildren(children: any) {
  return children.map((child: any) => {
    if (child.type === "mdxJsxTextElement") {
      return getFlatChildren(child.children);
    } else if(child.type === "mdxTextExpression") {
      return {type: "text", value: "{" + child.value + "}"};
    } else {
      return child;
    }
  })
}
