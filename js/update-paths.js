const fs = require('fs');
const path = require('path');
const glob = require('fs').readdirSync || ((d) => { const r = []; 
  function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory() && !f.startsWith('.')) walk(fp);
      else if (f.endsWith('.js')) r.push(fp);
    });
  }
  walk(d); return r;
});

const srcDir = path.resolve(__dirname, 'src');
const files = [];
(function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(e => {
    const fp = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.')) walk(fp);
    else if (e.isFile() && e.name.endsWith('.js')) files.push(fp);
  });
})(srcDir);

const mappings = {
  "'flarum/extend'": "'flarum/common/extend'",
  "'flarum/app'": "'flarum/common/app'",
  "'flarum/Application'": "'flarum/common/Application'",
  "'flarum/Component'": "'flarum/common/Component'",
  "'flarum/Model'": "'flarum/common/Model'",
  "'flarum/models/User'": "'flarum/common/models/User'",
  "'flarum/models/Group'": "'flarum/common/models/Group'",
  "'flarum/components/Link'": "'flarum/common/components/Link'",
  "'flarum/components/LoadingIndicator'": "'flarum/common/components/LoadingIndicator'",
  "'flarum/components/Button'": "'flarum/common/components/Button'",
  "'flarum/components/Dropdown'": "'flarum/common/components/Dropdown'",
  "'flarum/components/Modal'": "'flarum/common/components/Modal'",
  "'flarum/components/Separator'": "'flarum/common/components/Separator'",
  "'flarum/components/IndexPage'": "'flarum/forum/components/IndexPage'",
  "'flarum/components/PermissionGrid'": "'flarum/admin/components/PermissionGrid'",
  "'flarum/components/Page'": "'flarum/common/components/Page'",
  "'flarum/utils/classList'": "'flarum/common/utils/classList'",
  "'flarum/utils/computed'": "'flarum/common/utils/computed'",
  "'flarum/utils/Stream'": "'flarum/common/utils/Stream'",
  "'flarum/utils/throttleDebounce'": "'flarum/common/utils/throttleDebounce'",
  "'flarum/utils/extractText'": "'flarum/common/utils/extractText'",
  "'flarum/utils/ItemList'": "'flarum/common/utils/ItemList'",
  "'flarum/utils/SubtreeRetainer'": "'flarum/common/utils/SubtreeRetainer'",
  "'flarum/utils/humanTime'": "'flarum/common/helpers/humanTime'",
  "'flarum/helpers/fullTime'": "'flarum/common/helpers/fullTime'",
  "'flarum/helpers/username'": "'flarum/common/helpers/username'",
  "'flarum/helpers/listItems'": "'flarum/common/helpers/listItems'",
  "'flarum/helpers/highlight'": "'flarum/common/helpers/highlight'",
};

let totalChanges = 0;

files.forEach(fp => {
  const rel = path.relative(srcDir, fp);
  let content = fs.readFileSync(fp, 'utf-8');
  let changed = false;

  Object.entries(mappings).forEach(([oldPath, newPath]) => {
    const oldStr = `from ${oldPath}`;
    const newStr = `from ${newPath}`;
    if (content.includes(oldStr)) {
      content = content.split(oldStr).join(newStr);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(fp, content, 'utf-8');
    totalChanges++;
  }
});

console.log(`Done. Updated ${totalChanges} files.`);
