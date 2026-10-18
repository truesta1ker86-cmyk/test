import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';

const files = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
const errors = [];
let controls = 0,
  tables = 0;
const sections = new Set();
const filterAreas =
  /(?:^|\s)(?:catalog-filters|catalog-filter-dialog|mapping-filter-dialog|operational-filters|filter-bar|stock-filter-grid|profit-filters|finance-filters|finance-extra-filters|promo-toolbar|plan-filters)(?:\s|$)/;
for (const file of files('src/app/pages').filter((file) => file.endsWith('.component.ts'))) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const component = source.statements.find(ts.isClassDeclaration);
  const metadata =
    component &&
    ts.getDecorators(component)?.find((d) => d.expression.expression?.getText() === 'Component')
      ?.expression.arguments[0];
  if (!metadata) continue;
  const property = (name) =>
    metadata.properties.find((item) => item.name?.getText() === name)?.initializer;
  const templateFile = property('templateUrl');
  const template = templateFile
    ? fs.readFileSync(path.resolve(path.dirname(file), templateFile.text), 'utf8')
    : property('template')?.text || '';
  const tree = parseTemplate(template, file);
  if (tree.errors?.length) errors.push(...tree.errors.map((error) => String(error)));
  let directControls = 0;
  function visit(nodes, ancestors = []) {
    for (const node of nodes) {
      if (node.name === 'table' || node.name === 'p-table' || node.name === 'app-stock-choice')
        errors.push(`${file}:${node.sourceSpan.start.line + 1}: custom table/filter renderer`);
      if (node.name === 'app-data-table') tables++;
      if (
        /^app-filter-(text|number|select|multiselect|date|daterange|boolean|slider|color)$/.test(
          node.name || '',
        )
      ) {
        directControls++;
        if (
          !node.attributes.some((a) => a.name === 'key') &&
          !node.inputs.some((a) => a.name === 'key')
        )
          errors.push(`${file}: filter without key`);
        if (node.inputs.some((a) => a.name === 'key' && /\+\s*field$/.test(a.value.source)))
          errors.push(`${file}: facet object used as a key`);
        if (node.inputs.some((a) => a.name === 'ngModel' && /facetValues\(/.test(a.value.source)))
          errors.push(
            `${file}: decoded array recreated inside ngModel; use the pure API conversion pipe`,
          );
      }
      if (['input', 'select', 'textarea'].includes(node.name)) {
        const attr = (name) => node.attributes.find((a) => a.name === name)?.value;
        const area =
          /filter/.test(path.basename(file)) ||
          ancestors.some(
            (parent) =>
              filterAreas.test(parent.attributes?.find((a) => a.name === 'class')?.value || '') ||
              parent.outputs?.some(
                (event) =>
                  event.name === 'ngSubmit' &&
                  /^(navigate|applyFilters)\(\)$/.test(event.handler.source),
              ),
          );
        if (area || attr('type') === 'search')
          errors.push(
            `${file}:${node.sourceSpan.start.line + 1}: native ${node.name} used for filtering`,
          );
      }
      if (node.children) visit(node.children, [...ancestors, node]);
      if (node.branches) for (const branch of node.branches) visit(branch.children, ancestors);
      if (node.cases) for (const branch of node.cases) visit(branch.children, ancestors);
      if (node.groups) for (const branch of node.groups) visit(branch.children, ancestors);
    }
  }
  visit(tree.nodes);
  if (directControls) {
    sections.add(file.split('/')[3]);
    controls += directControls;
    if (
      !property('providers')
        ?.getText(source)
        .match(/\bFilterService\b/)
    )
      errors.push(`${file}: original filter controls need a component-scoped FilterService`);
  }
}
const required = {
  'src/app/pages/orders/components/orders/orders.component.html': [
    'app-order-filter',
    'app-order-bulk-actions',
    'app-order-list',
  ],
  'src/app/pages/stocks/components/stocks-page/stocks-page.component.html': [
    'app-inventory-filter',
    'app-inventory-reconciliation',
    'app-inventory-detail',
    'app-allocation-matrix',
  ],
  'src/app/pages/stocks/components/allocation/allocation-matrix/allocation-matrix.component.html': [
    'app-warehouse-picker',
    'app-data-table',
  ],
};
for (const [file, selectors] of Object.entries(required)) {
  const template = fs.readFileSync(file, 'utf8');
  for (const selector of selectors)
    if (!template.includes('<' + selector))
      errors.push(`${file}: original section component ${selector} is disconnected`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Original filters verified: ${controls} control declarations in ${sections.size} sections, scoped FilterService, ${tables} original DataTable declarations, original orders/inventory/allocation components connected.`,
  );
