try {
  const theme = localStorage.getItem('scholarship-theme');
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
} catch { document.documentElement.dataset.theme = 'light'; }
