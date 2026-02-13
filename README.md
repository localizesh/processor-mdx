# Localize.sh MDX Processor

MDX processor for the localize.sh ecosystem. Built on top of `@localizesh/processor-md`, this package extends Markdown processing with MDX support — parsing MDX files into a localization-friendly AST (Abstract Syntax Tree) and stringifying them back, preserving structure while allowing content extraction.

## Installation

```bash
npm install @localizesh/processor-mdx
```

## Usage

```typescript
import MdxProcessor from "@localizesh/processor-mdx";

const processor = new MdxProcessor();

const mdxContent = '# Hello world';
// Parse into a Document (AST + Segments)
const document = processor.parse(mdxContent);

// ... modify document segments ...

// Stringify back to MDX
const newMdxContent = processor.stringify(document);
```

## Features

- **MDX Support**: Handles JSX components, imports, and exports within Markdown.
- **Structure Preservation**: Maintains the original structure of the MDX document.
- **Round-trip**: Ensures that parsing and then stringifying results in the original MDX structure, preserving as much formatting as possible.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## License

[Apache-2.0](LICENSE)
