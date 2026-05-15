const fs = require('fs');
let code = fs.readFileSync('client/src/pages/Registration.jsx', 'utf8');

const oldCode = `              {routes.flatMap(route => 
                route.stops
                  .filter(stop => stop.name.toLowerCase().includes(searchStop.toLowerCase()))
                  .map(stop => (
                  <div 
                    key={\`\${route.routeId}-\${stop.name}\`}
                    className={\`route-option \${selectedStop?.name === stop.name ? 'selected' : ''}\`}
                    onClick={() => selectStop(stop, route.routeId)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedStop?.name === stop.name ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: selectedStop?.name === stop.name ? 'white' : 'var(--text-primary)',
                      transition: 'all 0.2s ease',
                      border: selectedStop?.name === stop.name ? '2px solid var(--accent-blue)' : '1px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedStop?.name !== stop.name) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedStop?.name !== stop.name) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                      }
                    }}
                  >
                    <span style={{ flex: 1, fontWeight: 500 }}>{stop.name}</span>
                    <span style={{ 
                      textAlign: 'right', 
                      display: 'flex', 
                      gap: '1rem',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: 600, minWidth: '80px' }}>₹ {stop.fees}</span>
                      <span style={{ fontWeight: 600, minWidth: '60px' }}>{stop.time}</span>
                    </span>
                  </div>
                ))
              )}`;

const newCode = `              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-secondary)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)' }}>Stop Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Annual Fee</th>
                    <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.flatMap(route => 
                    route.stops
                      .filter(stop => stop.name.toLowerCase().includes(searchStop.toLowerCase()))
                      .map(stop => (
                        <tr 
                          key={\`\${route.routeId}-\${stop.name}\`}
                          onClick={() => selectStop(stop, route.routeId)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: selectedStop?.name === stop.name ? 'var(--accent-blue)' : 'inherit',
                            color: selectedStop?.name === stop.name ? 'white' : 'var(--text-primary)',
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedStop?.name !== stop.name) {
                              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedStop?.name !== stop.name) {
                              e.currentTarget.style.backgroundColor = 'inherit';
                            }
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>{stop.name}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>₹ {stop.fees.toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{stop.time}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('client/src/pages/Registration.jsx', code);
