import { signIn, clearSession } from '../authService';
import { getRfxList } from '../rfxService';
import { updateProfile } from '../profileService';
import { generateProposal } from '../aiService';
import { getMapLayers } from '../mapService';
import { listFiles } from '../storageService';
import { addCredits } from '../creditService';

const mockFetchResponse = (data, overrides = {}) => ({
  ok: overrides.ok ?? true,
  status: overrides.status ?? 200,
  headers: { get: () => 'application/json' },
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
  ...overrides
});

beforeEach(() => {
  global.fetch = jest.fn();
  localStorage.clear();
  clearSession();
});

describe('service smoke tests', () => {
  test('authService signIn hits /auth/login', async () => {
    global.fetch.mockResolvedValueOnce(
      mockFetchResponse({ token: 'abc', user: { id: 'user-1', email: 'test@example.com' } })
    );

    await signIn('test@example.com', 'password');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('rfxService getRfxList queries /rfx with filters', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse([]));
    await getRfxList({ status: 'open', region: 'south' });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/rfx');
    expect(url).toContain('status=open');
    expect(url).toContain('region=south');
  });

  test('profileService updateProfile calls /profiles/me', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ id: 'profile-1' }));
    await updateProfile({ company: 'AccelProcure' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/profiles/me',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  test('aiService generateProposal posts to /ai/proposal', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ proposal: 'text' }));
    await generateProposal('rfx-123');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/ai/proposal',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('mapService getMapLayers reads /map', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ features: [] }));
    await getMapLayers({ status: 'open' });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/map');
    expect(url).toContain('status=open');
  });

  test('storageService listFiles requests /storage/files', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse([]));
    await listFiles('docs');

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/storage/files?path=docs');
  });

  test('creditService addCredits posts to /credits/add', async () => {
    global.fetch.mockResolvedValueOnce(mockFetchResponse({ newBalance: 100 }));
    await addCredits(50, 'pm_123');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/credits/add',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
