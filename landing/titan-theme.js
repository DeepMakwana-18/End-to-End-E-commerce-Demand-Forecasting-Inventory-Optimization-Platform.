/**
 * ============================================================================
 * TITAN AI — THEME SHARED COMPONENT SCRIPTS
 * ============================================================================
 * PillToggle: Reusable, accessible tablist / toggle matching the hero behavior.
 * Implements WAI-ARIA Tabs Design Pattern with full keyboard navigation:
 * - ArrowRight / ArrowDown: Next tab (circular)
 * - ArrowLeft / ArrowUp: Previous tab (circular)
 * - Home: First tab
 * - End: Last tab
 * - Click / Enter / Space: Select tab
 * ============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TitanTheme = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Initializes keyboard accessibility and state management for a PillToggle container.
   *
   * @param {HTMLElement} container - The pill-toggle container element
   * @param {Object} [options] - Configuration options
   * @param {Function} [options.onChange] - Callback when active tab changes
   * @returns {Object} Controller object with destroy and setActive methods
   */
  function initPillToggle(container, options) {
    if (!container || container.__titanPillToggleInitialized) {
      return null;
    }

    const opts = options || {};
    const tabs = Array.from(
      container.querySelectorAll('[role="tab"], .pill-toggle__tab, button')
    );

    if (tabs.length === 0) return null;

    container.__titanPillToggleInitialized = true;
    container.setAttribute('role', 'tablist');

    // Ensure tabs have proper role and initial tabIndex
    tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      const isSelected = tab.getAttribute('aria-selected') === 'true' ||
                         tab.classList.contains('is-active') ||
                         index === 0 && !tabs.some(t => t.getAttribute('aria-selected') === 'true');

      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tab.tabIndex = isSelected ? 0 : -1;
      if (isSelected) {
        tab.classList.add('is-active');
      } else {
        tab.classList.remove('is-active');
      }
    });

    function setActiveTab(index, shouldFocus) {
      if (index < 0 || index >= tabs.length) return;

      tabs.forEach((tab, i) => {
        const isCurrent = i === index;
        tab.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        tab.tabIndex = isCurrent ? 0 : -1;
        if (isCurrent) {
          tab.classList.add('is-active');
          if (shouldFocus) {
            tab.focus();
          }
        } else {
          tab.classList.remove('is-active');
        }

        // Manage associated panels if specified via aria-controls
        const panelId = tab.getAttribute('aria-controls');
        if (panelId) {
          const panel = document.getElementById(panelId);
          if (panel) {
            panel.hidden = !isCurrent;
            panel.setAttribute('aria-hidden', isCurrent ? 'false' : 'true');
            if (isCurrent) {
              panel.removeAttribute('hidden');
            }
          }
        }
      });

      const activeTab = tabs[index];
      const detail = {
        index: index,
        tab: activeTab,
        value: activeTab.getAttribute('data-value') || activeTab.textContent.trim(),
        container: container
      };

      // Dispatch custom event
      const event = new CustomEvent('pill-toggle:change', {
        bubbles: true,
        detail: detail
      });
      container.dispatchEvent(event);

      if (typeof opts.onChange === 'function') {
        opts.onChange(detail);
      }
    }

    function handleKeydown(e) {
      const currentTab = e.target.closest('[role="tab"], .pill-toggle__tab, button');
      if (!currentTab) return;

      const currentIndex = tabs.indexOf(currentTab);
      if (currentIndex === -1) return;

      let nextIndex = null;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      setActiveTab(nextIndex, true);
    }

    function handleClick(e) {
      const clickedTab = e.target.closest('[role="tab"], .pill-toggle__tab, button');
      if (!clickedTab) return;

      const index = tabs.indexOf(clickedTab);
      if (index !== -1) {
        setActiveTab(index, false);
      }
    }

    container.addEventListener('keydown', handleKeydown);
    container.addEventListener('click', handleClick);

    return {
      setActive: function (index) {
        setActiveTab(index, false);
      },
      destroy: function () {
        container.removeEventListener('keydown', handleKeydown);
        container.removeEventListener('click', handleClick);
        delete container.__titanPillToggleInitialized;
      }
    };
  }

  /**
   * Automatically initializes all PillToggles on the page except the hero (which has its own script).
   *
   * @param {HTMLElement|Document} [root=document]
   */
  function initAllPillToggles(root) {
    const scope = root || document;
    // Exclude the hero element #top to prevent any modification to the hero
    const toggles = scope.querySelectorAll(
      '.pill-toggle:not(#top *), [data-component="pill-toggle"]:not(#top *)'
    );
    toggles.forEach(toggle => {
      initPillToggle(toggle);
    });
  }

  // Auto-init on DOMContentLoaded if running in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        initAllPillToggles();
      });
    } else {
      initAllPillToggles();
    }
  }

  return {
    initPillToggle: initPillToggle,
    initAllPillToggles: initAllPillToggles
  };
});
