/**
 * Component tests for SearchButton.
 * Tests rendering and click handling.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchButton } from '@/components/SearchButton';

describe('SearchButton', () => {
  it('should render search icon button', () => {
    const onClick = vi.fn();
    render(<SearchButton onClick={onClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Suche öffnen');
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SearchButton onClick={onClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should have accessible label', () => {
    const onClick = vi.fn();
    render(<SearchButton onClick={onClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Suche öffnen');
  });

  it('should accept custom className', () => {
    const onClick = vi.fn();
    render(<SearchButton onClick={onClick} className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });
});
