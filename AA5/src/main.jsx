(() => {
  const originalCreateRoot = ReactDOM.createRoot;
  ReactDOM.createRoot = function(container) {
    if (window.__rendered) {
      return { render: () => {} };
    }
    return originalCreateRoot(container);
  };
  const mount = () => {
    if (window.__rendered) return;
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(window.App));
    window.__rendered = true;
  };
  if (window.App) {
    mount();
  } else {
    const timer = setInterval(() => {
      if (window.App) { clearInterval(timer); mount(); }
    }, 50);
    window.addEventListener('load', () => {
      if (window.App) { clearInterval(timer); mount(); }
    });
  }
})();
