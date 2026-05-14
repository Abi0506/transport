const fs = require('fs');
let css = fs.readFileSync('client/src/index.css', 'utf8');

// Replace dates table headers
css = css.replace(/background: rgba\(49, 130, 206, 0.08\);/g, 'background: var(--bg-secondary); border-bottom: 2px solid var(--border-color);');
css = css.replace(/color: var\(--accent-primary\);/g, 'color: var(--text-primary);');
css = css.replace(/background: rgba\(59,130,246,0.1\);/g, 'background: var(--bg-secondary); border-bottom: 2px solid var(--border-color);');
css = css.replace(/color: var\(--accent-blue\);/g, 'color: var(--text-primary);');
css = css.replace(/var\(--border-glass\)/g, 'var(--border-color)');
css = css.replace(/var\(--border-light\)/g, 'var(--border-color)');

fs.writeFileSync('client/src/index.css', css);
console.log('CSS Tables Fixed');
