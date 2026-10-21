import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import ts from 'typescript';

const BASELINE = '8d9f71e7551ac5c51352c4a3b33876fc109febdd';
const adaptationFile = 'scripts/employer-method-adaptations.json';
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const parse = (file, source) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
// Compare syntax trees, not pretty-printing: parentheses, quote style and
// comments may change during formatting, but literal contents are significant.
function syntax(node) {
  if (!node) return null;
  if (ts.isParenthesizedExpression(node)) return syntax(node.expression);
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node) || ts.isNumericLiteral(node))
    return [node.kind, node.text];
  const children = [];
  ts.forEachChild(node, (child) => {
    children.push(syntax(child));
  });
  return [node.kind, ...children];
}
const encoded = (node) => JSON.stringify(syntax(node));
const hash = (node) => crypto.createHash('sha256').update(encoded(node)).digest('hex');
const methodName = (node) =>
  ts.isConstructorDeclaration(node) ? 'constructor' : node.name.getText();
const signature = (node) =>
  JSON.stringify({
    name: methodName(node),
    kind: node.kind,
    parameters: node.parameters.map(syntax),
    typeParameters: node.typeParameters?.map(syntax) || [],
    returnType: syntax(node.type),
    modifiers: node.modifiers?.map(syntax) || [],
    optional: !!node.questionToken,
    generator: !!node.asteriskToken,
  });
const methods = (node) =>
  node.members.filter(
    (member) => ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member),
  );
const sourceCache = new Map();
function resolveConstant(node, source, visited = new Set()) {
  if (!node || !ts.isIdentifier(node)) return node;
  const key = `${source.fileName}#${node.text}`;
  if (visited.has(key)) return node;
  visited.add(key);
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find(
        (item) => item.name.getText() === node.text,
      );
      if (declaration?.initializer)
        return resolveConstant(declaration.initializer, source, visited);
    }
    if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier.text.startsWith('.'))
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const binding = bindings.elements.find((item) => item.name.text === node.text);
    if (!binding) continue;
    const file = path.normalize(
      path.join(path.dirname(source.fileName), statement.moduleSpecifier.text + '.ts'),
    );
    if (!fs.existsSync(file)) continue;
    if (!sourceCache.has(file)) sourceCache.set(file, parse(file, fs.readFileSync(file, 'utf8')));
    const target = sourceCache.get(file);
    const name = binding.propertyName?.text || binding.name.text;
    for (const item of target.statements.filter(ts.isVariableStatement)) {
      const declaration = item.declarationList.declarations.find(
        (item) => item.name.getText() === name,
      );
      if (declaration?.initializer)
        return resolveConstant(declaration.initializer, target, visited);
    }
  }
  return node;
}
const current = new Map();
for (const file of files('src/app').filter(
  (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'),
)) {
  const source = parse(file, fs.readFileSync(file, 'utf8'));
  for (const node of source.statements.filter(ts.isClassDeclaration)) {
    sourceCache.set(file, source);
    current.set(node.name.text, [...(current.get(node.name.text) || []), { file, node }]);
  }
}
const sourceFiles = cp
  .execFileSync('git', ['ls-tree', '-r', '--name-only', BASELINE, 'src/app/shared'], {
    encoding: 'utf8',
  })
  .trim()
  .split('\n')
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'));
const score = (a, b) => {
  const left = a.split('/'),
    right = b.split('/');
  let count = 0;
  while (left[count] && left[count] === right[count]) count++;
  return count;
};
const report = { baseline: BASELINE, classes: [], errors: [] };
for (const file of sourceFiles) {
  const source = parse(
    file,
    cp.execFileSync('git', ['show', `${BASELINE}:${file}`], { encoding: 'utf8' }),
  );
  for (const node of source.statements.filter(ts.isClassDeclaration)) {
    const candidates = (current.get(node.name.text) || []).sort(
      (a, b) => score(file, b.file) - score(file, a.file),
    );
    const live = candidates[0];
    if (!live || (candidates[1] && score(file, candidates[1].file) === score(file, live.file))) {
      report.errors.push(`Missing or ambiguous original class ${node.name.text} (${file})`);
      continue;
    }
    const row = {
      name: node.name.text,
      original: file,
      current: live.file,
      methods: [],
      addedMethods: [],
      memberChanges: [],
      initializerChanges: [],
    };
    const originalMethods = methods(node),
      liveMethods = methods(live.node);
    for (const original of originalMethods) {
      const name = methodName(original);
      const match = liveMethods.find(
        (member) =>
          methodName(member) === name &&
          signature(member) === signature(original) &&
          !!member.body === !!original.body,
      );
      if (!match) {
        report.errors.push(`Missing or incompatible method ${node.name.text}.${name}`);
        continue;
      }
      row.methods.push({
        name,
        signatureSame: true,
        bodySame: encoded(original.body) === encoded(match.body),
        originalHash: hash(original.body),
        currentHash: hash(match.body),
      });
    }
    for (const method of liveMethods)
      if (!originalMethods.some((original) => methodName(original) === methodName(method)))
        row.addedMethods.push({ name: methodName(method), hash: hash(method.body) });
    const namedMembers = (members) =>
      members
        .filter((member) => member.name)
        .map((member) => ({
          name: member.name.getText(),
          kind: ts.SyntaxKind[member.kind],
          hash: member.body ? hash(member.body) : undefined,
        }));
    for (const member of namedMembers(node.members)) {
      const liveMember = namedMembers(live.node.members).find((item) => item.name === member.name);
      if (!liveMember)
        report.errors.push(`Missing original member ${node.name.text}.${member.name}`);
      else if (liveMember.kind !== member.kind)
        row.memberChanges.push({
          name: member.name,
          originalKind: member.kind,
          currentKind: liveMember.kind,
          hash: liveMember.hash,
        });
    }
    for (const property of node.members.filter(ts.isPropertyDeclaration)) {
      const counterpart = live.node.members.find(
        (member) =>
          ts.isPropertyDeclaration(member) && member.name.getText() === property.name.getText(),
      );
      if (!counterpart || encoded(property.initializer) === encoded(counterpart.initializer))
        continue;
      const currentInitializer = resolveConstant(
        counterpart.initializer,
        counterpart.getSourceFile(),
      );
      if (encoded(property.initializer) !== encoded(currentInitializer)) {
        row.initializerChanges.push({
          name: property.name.getText(),
          originalHash: hash(property.initializer),
          currentHash: hash(currentInitializer),
        });
      }
    }
    report.classes.push(row);
  }
}
const changes = report.classes.flatMap((row) =>
  row.methods
    .filter((method) => !method.bodySame)
    .map((method) => ({ key: `${row.name}.${method.name}`, hash: method.currentHash })),
);
const additions = report.classes.flatMap((row) =>
  row.addedMethods.map((method) => ({ key: `${row.name}.${method.name}`, hash: method.hash })),
);
report.summary = {
  classes: report.classes.length,
  methods: report.classes.reduce((count, row) => count + row.methods.length, 0),
  unchangedBodies: report.classes.reduce(
    (count, row) => count + row.methods.filter((method) => method.bodySame).length,
    0,
  ),
  adaptedBodies: changes.length,
  addedMethods: additions.length,
};
const auditOnly = process.argv.includes('--audit');
if (!auditOnly) {
  const documented = JSON.parse(fs.readFileSync(adaptationFile, 'utf8'));
  if (documented.baseline !== BASELINE)
    report.errors.push('Adaptation baseline does not match the original repository');
  for (const change of [...changes, ...additions]) {
    const adaptation = documented.methods[change.key];
    if (!adaptation?.reason || adaptation.hash !== change.hash)
      report.errors.push(`Undocumented method change: ${change.key}`);
  }
  const memberChanges = report.classes.flatMap((row) =>
    row.memberChanges.map((member) => ({ key: `${row.name}.${member.name}`, ...member })),
  );
  for (const change of memberChanges) {
    const adaptation = documented.members[change.key];
    if (
      !adaptation?.reason ||
      adaptation.hash !== change.hash ||
      adaptation.originalKind !== change.originalKind ||
      adaptation.currentKind !== change.currentKind
    )
      report.errors.push(`Undocumented member change: ${change.key}`);
  }
  const initializerChanges = report.classes.flatMap((row) =>
    row.initializerChanges.map((member) => ({ key: `${row.name}.${member.name}`, ...member })),
  );
  for (const change of initializerChanges) {
    const adaptation = documented.initializers?.[change.key];
    if (!adaptation?.reason || adaptation.hash !== change.currentHash)
      report.errors.push(`Undocumented initializer change: ${change.key}`);
  }
  const actual = new Set([...changes, ...additions].map((change) => change.key));
  for (const name of Object.keys(documented.methods))
    if (!actual.has(name)) report.errors.push(`Stale method adaptation: ${name}`);
}
// These presentation adapters must use the employer's controls and scoped state.
for (const file of [
  'src/app/pages/stocks/components/inventory/inventory-filter/inventory-filter.component.ts',
  'src/app/pages/stocks/components/allocation/warehouse-picker/warehouse-picker.component.ts',
]) {
  const source = parse(file, fs.readFileSync(file, 'utf8'));
  const component = source.statements.find(ts.isClassDeclaration);
  const metadata = ts
    .getDecorators(component)
    ?.find((item) => item.expression.expression?.getText() === 'Component')?.expression
    .arguments[0];
  const providers = metadata.properties.find(
    (item) => item.name?.getText() === 'providers',
  )?.initializer;
  if (!providers?.elements?.some((item) => item.getText() === 'FilterService'))
    report.errors.push(`${file}: missing local employer FilterService`);
  const html = metadata.properties.find(
    (item) => item.name?.getText() === 'templateUrl',
  )?.initializer;
  const template = html
    ? fs.readFileSync(path.resolve(path.dirname(file), html.text), 'utf8')
    : metadata.properties.find((item) => item.name?.getText() === 'template')?.initializer.text ||
      '';
  if (!template.includes('app-filter-multiselect'))
    report.errors.push(`${file}: missing employer multiselect control`);
  if (/type\s*=\s*["']checkbox["']/.test(template))
    report.errors.push(`${file}: custom checkbox list replaces the employer multiselect`);
}
// Table-column filters intentionally use the shared checkbox popup requested
// for V1 parity. Other facet controls retain the original multiselect guard.
const sharedFilterFile =
  'src/app/shared/data-table-filter/components/data-table-filter/data-table-filter.component.ts';
const sharedFilterSource = fs.readFileSync(sharedFilterFile, 'utf8');
const sharedFilterTemplate = fs.readFileSync(sharedFilterFile.replace('.ts', '.html'), 'utf8');
if (!/providers:\s*\[FilterService,\s*DataTableFilterState\]/.test(sharedFilterSource))
  report.errors.push('Shared table filter must keep its own FilterService and draft state');
for (const control of ['app-filter-text', 'app-filter-select'])
  if (!sharedFilterTemplate.includes('<' + control))
    report.errors.push(`Shared table filter misses ${control}`);
const pricingFilterTemplate = fs.readFileSync(
  'src/app/pages/pricing/components/pricing-column-filter/pricing-column-filter.component.html',
  'utf8',
);
if (
  !pricingFilterTemplate.includes('<app-data-table-filter') ||
  /type\s*=\s*["']checkbox["']/.test(pricingFilterTemplate)
)
  report.errors.push(
    'Pricing must adapt the shared table filter without a second checkbox renderer',
  );
const tableTemplate = fs.readFileSync(
  'src/app/shared/data-table/components/data-table/data-table.component.html',
  'utf8',
);
const rendererAdaptations = JSON.parse(fs.readFileSync(adaptationFile, 'utf8')).renderer || {};
for (const binding of [
  '<p-table',
  '[value]="data"',
  '[headerTemplate]',
  'cellTemplate',
  'getValue(rowData, col.field)',
]) {
  const required = binding === '[headerTemplate]' ? '[ngTemplateOutlet]="headerTemplate"' : binding;
  const replacement = rendererAdaptations[required];
  if (
    !tableTemplate.includes(required) &&
    !(replacement?.reason && tableTemplate.includes(replacement.binding))
  )
    report.errors.push(`Original DataTable renderer connection is missing: ${required}`);
}
if (tableTemplate.includes('<ng-content'))
  report.errors.push(
    'Original DataTable must render PrimeNG rows instead of projecting a custom table',
  );
const multiselectTemplate = fs.readFileSync(
  'src/app/shared/directives/filter-panel/components/filter-multiselect/filter-multiselect.component.html',
  'utf8',
);
if (
  !multiselectTemplate.includes('<p-select') ||
  !multiselectTemplate.includes('[multiple]="true"')
)
  report.errors.push('Original multiselect must use the employer p-select in multiple mode');
fs.mkdirSync('.tmp', { recursive: true });
fs.writeFileSync('.tmp/employer-api-comparison.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      summary: report.summary,
      changedMethods: changes,
      addedMethods: additions,
      memberChanges: report.classes
        .filter((row) => row.memberChanges.length)
        .map((row) => ({ class: row.name, changes: row.memberChanges })),
      initializerChanges: report.classes.flatMap((row) =>
        row.initializerChanges.map((member) => ({ class: row.name, ...member })),
      ),
      errors: report.errors,
    },
    null,
    2,
  ),
);
if (report.errors.length) process.exitCode = 1;
