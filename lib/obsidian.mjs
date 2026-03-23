// lib/obsidian.mjs

class ObsidianClient {
  #baseUrl;
  #headers;

  constructor({ apiKey, baseUrl = 'http://127.0.0.1:27123' }) {
    if (!apiKey) throw new Error('apiKey is required');
    this.#baseUrl = baseUrl.replace(/\/+$/, '');
    this.#headers = { 'Authorization': `Bearer ${apiKey}` };
  }

  #encodePath(vaultPath) {
    return vaultPath.split('/').map(s => encodeURIComponent(s)).join('/');
  }

  async #request(path, options = {}) {
    const url = `${this.#baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...this.#headers, ...options.headers },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Obsidian API ${res.status}: ${body}`);
      err.status = res.status;
      throw err;
    }
    return res;
  }

  async read(vaultPath) {
    const res = await this.#request(`/vault/${this.#encodePath(vaultPath)}`, {
      headers: { 'Accept': 'text/markdown' },
    });
    return res.text();
  }

  async write(vaultPath, content) {
    await this.#request(`/vault/${this.#encodePath(vaultPath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown' },
      body: content,
    });
  }

  async writeFile(vaultPath, filePath) {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(filePath, 'utf-8');
    await this.write(vaultPath, content);
  }

  async append(vaultPath, content) {
    await this.#request(`/vault/${this.#encodePath(vaultPath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'text/markdown', 'Operation': 'append' },
      body: content,
    });
  }

  async search(query) {
    const encoded = encodeURIComponent(query);
    const res = await this.#request(`/search/simple/?query=${encoded}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });
    return res.json();
  }

  async list(vaultPath = '') {
    const encoded = vaultPath ? this.#encodePath(vaultPath) : '';
    const suffix = encoded ? `/${encoded}` : '';
    const res = await this.#request(`/vault${suffix}`, {
      headers: { 'Accept': 'application/json' },
    });
    return res.json();
  }

  async tags() {
    const res = await this.#request('/tags/', {
      headers: { 'Accept': 'application/json' },
    });
    return res.json();
  }

  async delete(vaultPath) {
    await this.#request(`/vault/${this.#encodePath(vaultPath)}`, {
      method: 'DELETE',
    });
  }

  async exists(vaultPath) {
    try {
      await this.read(vaultPath);
      return true;
    } catch (err) {
      if (err.status === 404) return false;
      throw err;
    }
  }
}

function createClient() {
  const apiKey = process.env.OBSIDIAN_API_KEY;
  if (!apiKey) {
    console.error(JSON.stringify({ error: 'OBSIDIAN_API_KEY not set' }));
    process.exit(1);
  }
  return new ObsidianClient({
    apiKey,
    baseUrl: process.env.OBSIDIAN_BASE_URL || undefined,
  });
}

export { ObsidianClient, createClient };
