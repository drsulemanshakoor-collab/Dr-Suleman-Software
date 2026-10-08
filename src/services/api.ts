import {
  DatabaseStatus,
  SearchResponse,
  MaterialDetailRecord,
  ImportPreviewResponse,
  ImportResult,
} from '../types';

export const api = {
  async getStatus(): Promise<DatabaseStatus> {
    const res = await fetch('/api/status');
    if (!res.ok) {
      throw new Error('Failed to fetch database status');
    }
    return res.json();
  },

  async search(
    query: string,
    options: { tags?: string[]; useAi?: boolean } = {}
  ): Promise<SearchResponse> {
    const params = new URLSearchParams();
    if (query) {
      params.append('q', query);
    }
    if (options.useAi) {
      params.append('ai', 'true');
    }
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','));
    }

    const res = await fetch(`/api/search?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Search request failed');
    }
    return res.json();
  },

  async getMaterial(id: number): Promise<MaterialDetailRecord> {
    const res = await fetch(`/api/material/${id}`);
    if (!res.ok) {
      throw new Error('Failed to retrieve material record');
    }
    return res.json();
  },

  async createMaterial(data: any): Promise<MaterialDetailRecord> {
    const res = await fetch('/api/material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create record');
    }
    return res.json();
  },

  async updateMaterial(id: number, data: any): Promise<MaterialDetailRecord> {
    const res = await fetch(`/api/material/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update record');
    }
    return res.json();
  },

  async deleteMaterial(id: number): Promise<void> {
    const res = await fetch(`/api/material/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete record');
    }
  },

  async previewImport(file: File): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/import/preview', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to preview Excel workbook');
    }
    return res.json();
  },

  async commitImport(file: File, mode: 'replace' | 'merge'): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    const res = await fetch('/api/import', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to import workbook');
    }
    return res.json();
  },

  async seedDemoMaster(mode: 'replace' | 'merge' = 'replace'): Promise<ImportResult> {
    const res = await fetch('/api/import/seed-master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to seed master dataset');
    }
    return res.json();
  },

  async clearDatabase(): Promise<void> {
    const res = await fetch('/api/database', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'CONFIRM_DELETE' }),
    });
    if (!res.ok) {
      throw new Error('Failed to clear database');
    }
  },
};
