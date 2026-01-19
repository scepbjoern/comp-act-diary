/**
 * Search button component for the header/navbar.
 * Displays a compact search icon that opens the search overlay on click.
 */
'use client';

import { IconSearch } from '@tabler/icons-react';

interface SearchButtonProps {
  onClick: () => void;
  className?: string;
}

export function SearchButton({ onClick, className = '' }: SearchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn-ghost btn-circle btn-sm ${className}`}
      title="Suche öffnen"
      aria-label="Suche öffnen"
    >
      <IconSearch size={20} />
    </button>
  );
}
