import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const sourceRoot = path.resolve('src/app');
function scan(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? scan(file) : [file];
  });
}
const files = new Map(
  scan(sourceRoot)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
    .map((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return [file, ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)];
    }),
);
const errors = [];
const injectableServices = new Map();
const injectionConsumers = new Map();
const functionalConsumers = new Set();
function isStaticConfiguration(node, aliases) {
  if (!node) return false;
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node))
    return isStaticConfiguration(node.expression, aliases);
  if (ts.isArrayLiteralExpression(node))
    return (
      node.elements.length > 0 &&
      node.elements.every((item) => isStaticConfiguration(item, aliases))
    );
  if (ts.isObjectLiteralExpression(node))
    return (
      node.properties.length > 0 &&
      node.properties.every((item) =>
        ts.isPropertyAssignment(item)
          ? isStaticConfiguration(item.initializer, aliases)
          : ts.isSpreadAssignment(item) && isStaticConfiguration(item.expression, aliases),
      )
    );
  if (ts.isSpreadElement(node)) return isStaticConfiguration(node.expression, aliases);
  if (ts.isIdentifier(node)) return aliases.has(node.text);
  if (ts.isPrefixUnaryExpression(node)) return isStaticConfiguration(node.operand, aliases);
  return (
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node) ||
    [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(
      node.kind,
    )
  );
}

const components = new Map();
const owners = new Map();
let services = 0;
const decorators = (node) => (ts.canHaveDecorators(node) ? ts.getDecorators(node) || [] : []);
const decorator = (node, name) =>
  decorators(node).find(
    (item) => ts.isCallExpression(item.expression) && item.expression.expression.getText() === name,
  );
const resolve = (file, specifier) =>
  specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier + '.ts') : null;
function definition(file, name, seen = new Set()) {
  const key = `${file}#${name}`;
  if (seen.has(key) || !files.has(file)) return null;
  seen.add(key);
  for (const statement of files.get(file).statements) {
    if (statement.name?.getText() === name) return { file, node: statement };
    if (ts.isVariableStatement(statement)) {
      const item = statement.declarationList.declarations.find(
        (item) => item.name.getText() === name,
      );
      if (item) return { file, node: item };
    }
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      const item = statement.importClause.namedBindings.elements.find(
        (item) => item.name.text === name,
      );
      if (item)
        return definition(
          resolve(file, statement.moduleSpecifier.text),
          item.propertyName?.text || name,
          seen,
        );
    }
  }
  return null;
}
function declarations(file, expression) {
  if (!expression) return [];
  if (ts.isArrayLiteralExpression(expression))
    return expression.elements.flatMap((item) => declarations(file, item));
  if (ts.isSpreadElement(expression)) return declarations(file, expression.expression);
  if (ts.isIdentifier(expression)) {
    const found = definition(file, expression.text);
    if (found && ts.isVariableDeclaration(found.node))
      return declarations(found.file, found.node.initializer);
    if (found) return [`${found.file}#${found.node.name.text}`];
  }
  return [];
}
for (const [file, ast] of files) {
  const constantAliases = new Set(
    ast.statements
      .filter(ts.isImportDeclaration)
      .filter((item) => item.moduleSpecifier.text.includes('/constants/'))
      .flatMap((item) =>
        item.importClause?.namedBindings && ts.isNamedImports(item.importClause.namedBindings)
          ? item.importClause.namedBindings.elements.map((binding) => binding.name.text)
          : [],
      ),
  );
  for (const node of ast.statements) {
    if (ts.isInterfaceDeclaration(node) && !file.includes('/infrastructure/interfaces/'))
      errors.push(`${file}: interface outside infrastructure/interfaces`);
    if (
      (ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) &&
      !file.includes('/infrastructure/types/')
    )
      errors.push(`${file}: type outside infrastructure/types`);
    if (
      ts.isVariableStatement(node) &&
      !file.endsWith('.module.ts') &&
      !file.includes('/infrastructure/constants/') &&
      !file.includes('/infrastructure/tokens/') &&
      !file.includes('/infrastructure/utils/')
    )
      errors.push(`${file}: top-level value outside constants/utils/tokens`);
    if (!ts.isClassDeclaration(node)) continue;
    for (const member of node.members) {
      if (
        ts.isPropertyDeclaration(member) &&
        member.initializer &&
        member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) &&
        decorators(member).length === 0 &&
        !ts.isIdentifier(member.initializer) &&
        isStaticConfiguration(member.initializer, constantAliases)
      )
        errors.push(
          `${file}: static configuration ${member.name.getText()} must be in infrastructure/constants`,
        );
    }
    const component = decorator(node, 'Component');
    if (component) {
      const meta = component.expression.arguments[0];
      const property = (name) =>
        meta.properties.find((item) => item.name?.getText() === name)?.initializer;
      if (property('standalone')?.kind !== ts.SyntaxKind.FalseKeyword)
        errors.push(`${file}: standalone must be false`);
      if (property('changeDetection')?.getText() !== 'ChangeDetectionStrategy.OnPush')
        errors.push(`${file}: component must use OnPush`);
      if (property('imports')) errors.push(`${file}: component imports must be in its NgModule`);
      for (const resource of [
        property('templateUrl'),
        property('styleUrl'),
        ...(property('styleUrls')?.elements || []),
      ].filter(Boolean)) {
        if (!fs.existsSync(path.resolve(path.dirname(file), resource.text)))
          errors.push(`${file}: missing resource ${resource.text}`);
      }
      components.set(`${file}#${node.name.text}`, file);
    }
    if (decorator(node, 'Injectable')) {
      services++;
      injectableServices.set(`${file}#${node.name.text}`, { file, node });
      if (!file.includes('/infrastructure/services/'))
        errors.push(`${file}: service outside infrastructure/services`);
    }
    const module = decorator(node, 'NgModule');
    if (module) {
      const declared = module.expression.arguments[0]?.properties.find(
        (item) => item.name?.getText() === 'declarations',
      );
      for (const key of declarations(file, declared?.initializer))
        owners.set(key, [...(owners.get(key) || []), node.name.text]);
    }
  }
}
// Component-owned services must be provided by their component, including when
// the original shared module also exposes a provider for compatibility.
for (const [file, ast] of files) {
  // Functional interceptors/guards share root services with components.
  function visitFunction(item) {
    if (ts.isClassDeclaration(item)) return;
    if (
      ts.isCallExpression(item) &&
      item.expression.getText() === 'inject' &&
      ts.isIdentifier(item.arguments[0])
    ) {
      const service = definition(file, item.arguments[0].text);
      if (service && ts.isClassDeclaration(service.node))
        functionalConsumers.add(`${service.file}#${service.node.name.text}`);
    }
    ts.forEachChild(item, visitFunction);
  }
  visitFunction(ast);
  for (const node of ast.statements.filter(ts.isClassDeclaration)) {
    const component = decorator(node, 'Component');
    function visit(item) {
      if (
        ts.isCallExpression(item) &&
        item.expression.getText() === 'inject' &&
        ts.isIdentifier(item.arguments[0])
      ) {
        const service = definition(file, item.arguments[0].text);
        if (service && ts.isClassDeclaration(service.node)) {
          const key = `${service.file}#${service.node.name.text}`;
          if (injectableServices.has(key))
            injectionConsumers.set(key, [
              ...(injectionConsumers.get(key) || []),
              { component, file, node },
            ]);
        }
      }
      ts.forEachChild(item, visit);
    }
    visit(node);
  }
}
for (const [key, consumers] of injectionConsumers) {
  if (functionalConsumers.has(key)) continue;
  const owners = new Map(
    consumers.map((consumer) => [`${consumer.file}#${consumer.node.name.text}`, consumer]),
  );
  if (owners.size !== 1) continue;
  const owner = [...owners.values()][0];
  if (!owner.component) continue;
  const service = injectableServices.get(key);
  const providers = owner.component.expression.arguments[0].properties.find(
    (item) => item.name?.getText() === 'providers',
  );
  const hasLocalProvider =
    providers && declarations(owner.file, providers.initializer).includes(key);
  if (!hasLocalProvider)
    errors.push(
      `${service.file}: service used only by ${owner.node.name.text} must be in that component's providers`,
    );
  const injectable = decorator(service.node, 'Injectable');
  const root = injectable.expression.arguments[0]?.properties?.find(
    (item) => item.name?.getText() === 'providedIn',
  )?.initializer;
  if (root?.text === 'root')
    errors.push(`${service.file}: component-owned service must not use providedIn:root`);
}
const directories = new Map();
for (const [key, file] of components) {
  if (owners.get(key)?.length !== 1)
    errors.push(
      `${file}: requires exactly one declaring NgModule, found ${(owners.get(key) || []).join(', ') || 'none'}`,
    );
  const directory = path.dirname(file);
  directories.set(directory, (directories.get(directory) || 0) + 1);
}
for (const [directory, count] of directories)
  if (count !== 1) errors.push(`${directory}: contains ${count} components`);
if (errors.length) {
  console.error(errors.map((error) => path.relative(process.cwd(), error)).join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Architecture verified: ${components.size} components, standalone:false, OnPush, one declaring NgModule each; ${services} services in infrastructure/services.`,
  );
