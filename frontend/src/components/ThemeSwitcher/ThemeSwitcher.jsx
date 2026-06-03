import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './ThemeSwitcher.css';

export default function ThemeSwitcher() {
  const { themeId, setTheme, themes, currentTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const rect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const gap = 80;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const belowSpace = viewportHeight - rect.bottom - gap;
      const aboveSpace = rect.top - gap;
      const shouldOpenAbove = aboveSpace >= menuRect.height && belowSpace < menuRect.height;

      const style = {
        minWidth: '260px',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: '80vh',
        overflowY: 'auto',
        right: 0,
        left: 'auto',
      };

      if (shouldOpenAbove) {
        style.bottom = `${rect.height + gap}px`;
        style.top = 'auto';
      } else {
        style.top = `${rect.height + gap}px`;
        style.bottom = 'auto';
      }

      if (rect.left + menuRect.width > viewportWidth - 16) {
        style.left = 'auto';
        style.right = 0;
      } else {
        style.left = 0;
        style.right = 'auto';
      }

      setMenuStyle(style);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, themes.length]);

  return (
    <div className="theme-switcher" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className="theme-switcher-trigger btn-icon"
        onClick={() => setOpen(v => !v)}
        title="Change theme"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Palette size={18} />
        <span className="theme-switcher-label">{currentTheme.name}</span>
      </button>

      {open && (
        <div
        ref={menuRef}
        className="theme-switcher-menu glass-panel"
        role="listbox"
        aria-label="Select theme"
        style={menuStyle}
      >
          <p className="theme-switcher-heading">Appearance</p>
          {themes.map(theme => (
            <button
              key={theme.id}
              type="button"
              role="option"
              aria-selected={themeId === theme.id}
              className={`theme-option${themeId === theme.id ? ' is-active' : ''}`}
              onClick={() => {
                setTheme(theme.id);
                setOpen(false);
              }}
            >
              <span className="theme-option-swatches">
                {theme.swatch.map(color => (
                  <span key={color} className="theme-swatch" style={{ background: color }} />
                ))}
              </span>
              <span className="theme-option-text">
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </span>
              {themeId === theme.id && <Check size={16} className="theme-option-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
