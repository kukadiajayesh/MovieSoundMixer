// FFmpeg Audio Manager — App Logic

class AudioManager {
  constructor() {
    this.currentScreen = 'extract';
    this.theme = localStorage.getItem('theme') || 'dark';
    this.init();
  }

  init() {
    this.setupTheme();
    this.setupNavigation();
    this.setupThemeToggle();
    this.setupKeyboardShortcuts();
    this.setupTableInteractions();
  }

  setupTheme() {
    const html = document.documentElement;
    if (this.theme === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      html.removeAttribute('data-theme');
    }
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const screen = item.dataset.screen;
        this.switchScreen(screen);

        // Update active state
        navItems.forEach(ni => ni.classList.remove('nav-item--active'));
        item.classList.add('nav-item--active');
      });
    });
  }

  switchScreen(screenName) {
    this.currentScreen = screenName;

    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('screen--active'));

    // Show selected screen
    const selectedScreen = document.getElementById(`screen-${screenName}`);
    if (selectedScreen) {
      selectedScreen.classList.add('screen--active');
    }
  }

  setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', this.theme);
      this.setupTheme();
      this.updateThemeIcon();
    });

    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const themeBtn = document.getElementById('theme-toggle');
    const svg = themeBtn.querySelector('svg');

    if (this.theme === 'light') {
      // Sun icon
      svg.innerHTML = `<circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    } else {
      // Moon icon
      svg.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  setupTableInteractions() {
    // File table interactions
    const checkboxes = document.querySelectorAll('.table-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateTableSelection();
      });
    });

    // Stream selector
    const streamSelectors = document.querySelectorAll('.stream-selector');
    streamSelectors.forEach(selector => {
      selector.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showStreamMenu(selector);
      });
    });

    // Table rows
    const rows = document.querySelectorAll('.table-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        this.selectTableRow(row);
      });

      // Right-click context menu
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, row);
      });
    });
  }

  updateTableSelection() {
    const checkboxes = document.querySelectorAll('.table-checkbox:checked');
    const removeBtn = document.querySelector('.button[disabled]');
    if (removeBtn) {
      removeBtn.disabled = checkboxes.length === 0;
    }
  }

  selectTableRow(row) {
    const rows = row.parentElement.querySelectorAll('.table-row');
    rows.forEach(r => r.classList.remove('table-row--selected'));
    row.classList.add('table-row--selected');

    const checkbox = row.querySelector('.table-checkbox');
    if (checkbox) {
      checkbox.checked = true;
      this.updateTableSelection();
    }
  }

  showStreamMenu(selector) {
    // Create a simple menu for stream selection
    const menu = document.createElement('div');
    menu.className = 'stream-menu';
    menu.innerHTML = `
      <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 6px; padding: 8px 0; min-width: 300px; position: absolute; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
        <div style="padding: 8px 12px; font-size: 12px; color: var(--fg-1); font-family: var(--font-mono);">a:0 · EAC3 · 6ch · RUS (default)</div>
        <div style="padding: 8px 12px; font-size: 12px; color: var(--fg-2); font-family: var(--font-mono); border-top: 1px solid var(--line);">a:1 · AAC · 2ch · ENG</div>
      </div>
    `;

    document.body.appendChild(menu);

    // Close when clicking outside
    const close = () => {
      menu.remove();
      document.removeEventListener('click', close);
    };

    setTimeout(() => {
      document.addEventListener('click', close);
    }, 100);
  }

  showContextMenu(e, row) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div style="background: var(--bg-2); border: 1px solid var(--line); border-radius: 6px; padding: 4px 0; min-width: 200px; position: fixed; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.15); left: ${e.pageX}px; top: ${e.pageY}px;">
        <button style="display: block; width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; color: var(--fg-0); font-size: 13px; cursor: pointer;">Open in Finder</button>
        <button style="display: block; width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; color: var(--fg-0); font-size: 13px; cursor: pointer; border-top: 1px solid var(--line);">Probe streams again</button>
        <button style="display: block; width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; color: var(--fg-0); font-size: 13px; cursor: pointer; border-top: 1px solid var(--line);">Remove</button>
        <button style="display: block; width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; color: var(--fg-0); font-size: 13px; cursor: pointer; border-top: 1px solid var(--line);">Copy filename</button>
      </div>
    `;

    document.body.appendChild(menu);

    // Close when clicking outside
    const close = () => {
      menu.remove();
      document.removeEventListener('click', close);
    };

    setTimeout(() => {
      document.addEventListener('click', close);
    }, 100);
  }

  closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
      modal.remove();
    }
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
        <div class="toast-body">${message}</div>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-dismiss
    const timeout = type === 'error' ? 0 : 6000;
    if (timeout > 0) {
      setTimeout(() => {
        toast.remove();
      }, timeout);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new AudioManager();

  // Button interactions
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      // Visual feedback
      if (!btn.classList.contains('nav-item') && !btn.classList.contains('icon-button')) {
        btn.style.transform = 'scale(0.96)';
      }
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });
  });

  // Setup drag and drop
  const fileTable = document.querySelector('.file-table');
  if (fileTable) {
    fileTable.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileTable.style.borderColor = 'var(--accent)';
      fileTable.style.backgroundColor = 'var(--bg-3)';
    });

    fileTable.addEventListener('dragleave', () => {
      fileTable.style.borderColor = 'var(--line)';
      fileTable.style.backgroundColor = 'var(--bg-1)';
    });

    fileTable.addEventListener('drop', (e) => {
      e.preventDefault();
      fileTable.style.borderColor = 'var(--line)';
      fileTable.style.backgroundColor = 'var(--bg-1)';
      console.log('Files dropped:', e.dataTransfer.files);
    });
  }

  // CTA button interactions
  const ctaBtn = document.querySelector('.button--cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      const app = new AudioManager();
      if (app.currentScreen === 'extract') {
        app.showToast('Extracting audio from 1 file...', 'success');
      } else if (app.currentScreen === 'merge') {
        app.showToast('Merging audio into 1 file...', 'success');
      }
    });
  }
});
