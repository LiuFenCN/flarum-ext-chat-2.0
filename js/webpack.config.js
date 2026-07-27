const path = require('path');

/**
 * Custom Babel plugin (v2 — matches official fof/* extension output):
 * Transforms `import X from 'flarum/<path>'` / `import {Y} from 'flarum/<path>'`
 * into EAGER `flarum.reg.get("core", "<path>")` calls at module-eval time,
 * with __esModule unwrapping for default imports.
 *
 * Why eager (NOT Proxy lazy):
 * - Verified against live vendor/fof/(gamification|geoip|oauth)/js/dist/forum.js:
 *   they all do `const k = flarum.reg.get("core","common/components/Modal")`
 *   at eval time and work — core registers all its modules before extension
 *   modules evaluate in the combined bundle.
 * - The previous Proxy approach was fatally broken:
 *   1) `class X extends ProxyObj` reads `.prototype` at CLASS-DEFINITION time
 *      (module eval), which the lazy premise can't survive anyway;
 *   2) the get trap read `m.p` (literal property "p") instead of `m[p]`,
 *      so EVERY property access (incl. `prototype`) returned undefined →
 *      "undefined is not an object or null" crash killing the whole extension.
 */
function flarumImportPlugin({ types: t }) {
  const REMAP = {
    'extend': 'common/extend',
    'app': 'common/app',
    'Application': 'common/Application',
    'Model': 'common/Model',
    'Component': 'common/Component',
  };

  function normalize(modPath) {
    if (REMAP[modPath]) return REMAP[modPath];
    for (const prefix of ['models/', 'utils/', 'helpers/', 'components/']) {
      if (modPath.startsWith(prefix)) return 'common/' + modPath;
    }
    return modPath;
  }

  function buildGetCall(modPath) {
    return t.callExpression(
      t.memberExpression(
        t.memberExpression(t.identifier('flarum'), t.identifier('reg')),
        t.identifier('get')
      ),
      [t.stringLiteral('core'), t.stringLiteral(modPath)]
    );
  }

  return {
    visitor: {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (!source.startsWith('flarum/')) return;

        const modPath = normalize(source.slice('flarum/'.length));
        const nsId = path.scope.generateUidIdentifier('flmod');
        const nodes = [
          // var _flmod = flarum.reg.get("core", "<path>");
          t.variableDeclaration('var', [
            t.variableDeclarator(nsId, buildGetCall(modPath)),
          ]),
        ];

        for (const spec of path.node.specifiers) {
          if (spec.type === 'ImportDefaultSpecifier') {
            // var X = _flmod && _flmod.__esModule ? _flmod.default : _flmod;
            nodes.push(
              t.variableDeclaration('var', [
                t.variableDeclarator(
                  spec.local,
                  t.conditionalExpression(
                    t.logicalExpression(
                      '&&',
                      nsId,
                      t.memberExpression(nsId, t.identifier('__esModule'))
                    ),
                    t.memberExpression(nsId, t.identifier('default')),
                    nsId
                  )
                ),
              ])
            );
          } else if (spec.type === 'ImportSpecifier') {
            // var Y = _flmod && _flmod.Y;
            nodes.push(
              t.variableDeclaration('var', [
                t.variableDeclarator(
                  spec.local,
                  t.logicalExpression(
                    '&&',
                    nsId,
                    t.memberExpression(nsId, t.identifier(spec.imported.name))
                  )
                ),
              ])
            );
          } else if (spec.type === 'ImportNamespaceSpecifier') {
            nodes.push(
              t.variableDeclaration('var', [
                t.variableDeclarator(spec.local, nsId),
              ])
            );
          }
        }

        path.replaceWithMultiple(nodes);
      },
    },
  };
}

module.exports = {
  target: 'web',
  entry: {
    forum: './src/forum/index.js',
    admin: './src/admin/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    // Flarum 2.0 loads each extension's dist as a self-contained IIFE and
    // captures its `module.exports` into the extension map that bootExtensions
    // iterates (r = t[extId]; it reads r.extend). WITHOUT a library target the
    // bundle never sets module.exports, so Flarum captures `undefined` and
    // bootExtensions throws "can't access property extend, r is undefined".
    // commonjs2 emits a bundle-level `module.exports = <entry exports>` (with
    // `extend` as a getter) — exactly what fof/* extensions do, and it is NOT
    // subject to the harmony `t.hmd` ESM guard (that only wraps intra-module
    // `module.exports =` assignments, not the bundle-level one).
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.js'],
  },
  externals: [],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              ['@babel/plugin-transform-react-jsx', {
                pragma: 'm',
                pragmaFrag: 'm.fragment',
                runtime: 'classic',
              }],
              flarumImportPlugin,
            ],
          },
        },
      },
    ],
  },
};
