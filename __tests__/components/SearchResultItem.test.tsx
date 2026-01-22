/**
 * Component tests for SearchResultItem.
 * Tests rendering, highlighting, and navigation.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResultItem } from '@/components/features/search/SearchResultItem';
import type { SearchResultItem as SearchResultItemType } from '@/types/search';

const { push, refresh } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe('SearchResultItem', () => {
  const mockItem: SearchResultItemType = {
    id: 'test-123',
    type: 'journal_entry',
    title: 'Test Entry',
    snippet: 'This is a <mark>test</mark> snippet',
    url: '/?date=2024-12-13&entry=test-123',
    date: '2024-12-13',
    rank: 0.85,
  };

  it('should render item title', () => {
    render(<SearchResultItem item={mockItem} />);
    expect(screen.getByText('Test Entry')).toBeInTheDocument();
  });

  it('should render snippet with highlighting', () => {
    render(<SearchResultItem item={mockItem} />);
    
    // The snippet should be rendered (contains mark tags)
    const snippetElement = screen.getByText(/This is a/);
    expect(snippetElement).toBeInTheDocument();
  });

  it('should render formatted date', () => {
    render(<SearchResultItem item={mockItem} />);
    // Date format: DD.MM.YYYY for de-CH
    expect(screen.getByText('13.12.2024')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SearchResultItem item={mockItem} onClick={onClick} />);
    const title = screen.getByText('Test Entry');
    const content = title.closest('div');
    const container = content?.parentElement;
    expect(container).toBeTruthy();
    fireEvent.click(container!);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/?date=2024-12-13&entry=test-123');
    expect(refresh).toHaveBeenCalled();
  });

  it('should render without date if not provided', () => {
    const itemWithoutDate: SearchResultItemType = {
      ...mockItem,
      date: undefined,
    };
    
    render(<SearchResultItem item={itemWithoutDate} />);
    expect(screen.queryByText('13.12.2024')).not.toBeInTheDocument();
  });

  it('should render contact type correctly', () => {
    const contactItem: SearchResultItemType = {
      id: 'contact-123',
      type: 'contact',
      title: 'Anna Müller',
      snippet: '<mark>Anna</mark> Müller - Kollegin',
      url: '/prm/anna-mueller',
      rank: 0.9,
    };
    
    render(<SearchResultItem item={contactItem} />);
    expect(screen.getByText('Anna Müller')).toBeInTheDocument();
  });
});
