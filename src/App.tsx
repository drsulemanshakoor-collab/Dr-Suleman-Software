/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { BmrPage } from './pages/BmrPage';
import { AdminImportPage } from './pages/AdminImportPage';
import { NewEntryPage } from './pages/NewEntryPage';
import { DatabaseStatus, SearchResponse } from './types';
import { api } from './services/api';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'home' | 'search' | 'bmr' | 'admin' | 'new-entry'>('home');
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Sync route and query from URL on initial load and popstate
  useEffect(() => {
    const parseUrl = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('q');
      const tagsParam = searchParams.get('tags');
      const parsedTags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];

      if (path === '/bmr') {
        setCurrentRoute('bmr');
      } else if (path === '/admin' || path === '/admin/import') {
        setCurrentRoute('admin');
      } else if (path === '/admin/new-entry' || path === '/new-entry') {
        setCurrentRoute('new-entry');
      } else if (q || parsedTags.length > 0) {
        setCurrentRoute('search');
        setSearchQuery(q || '');
        setSearchTags(parsedTags);
        executeSearch(q || '', { tags: parsedTags });
      } else {
        setCurrentRoute('home');
      }
    };

    parseUrl();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, []);

  // Fetch initial database status
  const fetchStatus = () => {
    api
      .getStatus()
      .then((data) => setStatus(data))
      .catch((err) => console.warn('Database status check failed:', err));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleNavigate = (route: 'home' | 'search' | 'bmr' | 'admin' | 'new-entry') => {
    setCurrentRoute(route);
    if (route === 'home') {
      window.history.pushState({}, '', '/');
    } else if (route === 'bmr') {
      window.history.pushState({}, '', '/bmr');
    } else if (route === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else if (route === 'new-entry') {
      window.history.pushState({}, '', '/admin/new-entry');
    } else if (route === 'search') {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (searchTags.length > 0) params.set('tags', searchTags.join(','));
      window.history.pushState({}, '', `/?${params.toString()}`);
    }
  };

  const executeSearch = async (
    query: string,
    options: { tags?: string[]; useAi?: boolean } = {}
  ) => {
    const trimmed = query.trim();
    const activeTags = options.tags || searchTags;

    if (!trimmed && activeTags.length === 0) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchQuery(trimmed);
    setSearchTags(activeTags);
    setCurrentRoute('search');

    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    if (activeTags.length > 0) params.set('tags', activeTags.join(','));
    window.history.pushState({}, '', `/?${params.toString()}`);

    try {
      const response = await api.search(trimmed, {
        tags: activeTags,
        useAi: options.useAi,
      });
      setSearchResponse(response);
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Unable to perform search');
      setSearchResponse(null);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      <Header
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        compactLogo={currentRoute === 'search'}
        totalRecords={status?.totalRecords}
      />

      <main>
        {currentRoute === 'home' && (
          <HomePage
            onSearch={executeSearch}
            onNavigate={handleNavigate}
            status={status}
            isLoading={searchLoading}
          />
        )}

        {currentRoute === 'search' && (
          <SearchResultsPage
            searchResponse={searchResponse}
            query={searchQuery}
            tags={searchTags}
            onSearch={executeSearch}
            onNavigate={handleNavigate}
            isLoading={searchLoading}
            error={searchError}
            onRecordUpdated={() => {
              fetchStatus();
              executeSearch(searchQuery, { tags: searchTags });
            }}
          />
        )}

        {currentRoute === 'bmr' && <BmrPage onNavigate={handleNavigate} />}

        {currentRoute === 'admin' && (
          <AdminImportPage
            status={status}
            onRefreshStatus={fetchStatus}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'new-entry' && (
          <NewEntryPage
            onNavigate={handleNavigate}
            onRecordCreated={() => {
              fetchStatus();
            }}
          />
        )}
      </main>
    </div>
  );
}
