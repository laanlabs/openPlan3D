import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { customModelMessages } from '$lib/i18n/customModelMessages';

it('covers every fixed diagnostic emitted by the controlled GLB and custom-model pipeline', () => {
  const files = ['localGLB', 'localGLBResources', 'localGLBScene', 'localGLBAccessors', 'localGLBGeometry',
    'localGLBRepack', 'localGLBMaterials', 'localGLBExtensions', 'localGLBImages', 'customModelDefinitions']
    .map(name => `src/lib/utils/${name}.ts`)
    .concat(['customModelLoader', 'customModelSource', 'customModelImport', 'customModels'].map(name => `src/lib/services/${name}.ts`));
  const diagnostics = new Set<string>();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const prefix = source.match(/new Error\(`(.*?)\$\{message\}`\)/)?.[1] ?? '';
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === 'fail' && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        diagnostics.add(prefix + node.arguments[0].text);
      }
      if (ts.isNewExpression(node) && node.expression.getText(ast) === 'Error' && node.arguments?.[0] && ts.isStringLiteralLike(node.arguments[0])) {
        diagnostics.add(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  expect(diagnostics.size).toBeGreaterThan(100);
  expect([...diagnostics].filter(message => !Object.hasOwn(customModelMessages, message))).toEqual([]);
});
