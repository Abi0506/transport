const fs = require('fs');
let css = fs.readFileSync('client/src/index.css', 'utf8');

// Replace Root Variables
const varRegex = /:root\s*\{[\s\S]*?\}/m;
const newVars = `:root {
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-card: #ffffff;
  --bg-glass: rgba(255, 255, 255, 0.9);
  --border-glass: rgba(0, 0, 0, 0.08);
  --border-color: #eaeaea;
  --text-primary: #111111;
  --text-secondary: #666666;
  --text-muted: #888888;
  --text-light: #aaaaaa;
  
  --accent-primary: #111111;
  --accent-secondary: #333333;
  
  --accent-blue: #0070f3;
  --accent-emerald: #0070f3;
  --accent-amber: #f5a623;
  --accent-danger: #ee0000;
  --accent-purple: #0070f3;
  --accent-cyan: #0070f3;
  
  --gradient-primary: none;
  --gradient-success: none;
  --gradient-danger: none;
  
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.12);
  --shadow-glow: none;
  --shadow-focus: 0 0 0 2px rgba(0, 112, 243, 0.2);
  
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  
  --transition: all 0.15s ease;
}`;

css = css.replace(varRegex, newVars);

// Fix AI gradients
css = css.replace(/background: radial-gradient[^;]+;/g, 'background: var(--bg-secondary);');
css = css.replace(/-webkit-text-fill-color: transparent;/g, 'color: var(--accent-blue);');
css = css.replace(/-webkit-background-clip: text;/g, '');
css = css.replace(/background: var\(--gradient-primary\);/g, 'color: var(--accent-blue);');

css = css.replace(/body \{[^}]+\}/, `body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.01em;
}`);

fs.writeFileSync('client/src/index.css', css);
console.log('CSS Fixed');
