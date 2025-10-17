type InstantlyCampaignStatus = 0 | 1 | 2 | 3 | 4 | -99 | -1 | -2;
type InstantlyEmailStatus = 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'unsubscribed';
type InstantlyInboxStatus = 'active' | 'warming' | 'paused';

interface InstantlyCampaign {
  id: string;
  name: string;
  status: InstantlyCampaignStatus;
  timestamp_created: string;
  timestamp_updated: string;
  campaign_schedule?: any;
  sequences?: any[];
  email_list?: string[];
  organization?: string | null;
  owned_by?: string | null;
}

interface InstantlyEmail {
  id: string;
  email: string;
  campaign_id: string;
  status: InstantlyEmailStatus;
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  bounced_at?: string;
  unsubscribed_at?: string;
  subject?: string;
  body?: string;
}

interface InstantlyInbox {
  id: string;
  email: string;
  name: string;
  status: InstantlyInboxStatus;
  daily_limit: number;
  sent_today: number;
  warmup_enabled: boolean;
  created_at: string;
}

interface CreateCampaignParams {
  name: string;
  from_email?: string;
  reply_to_email?: string;
  campaign_schedule?: {
    schedules: Array<{
      name?: string;
      timing?: {
        from: string;
        to: string;
      };
      days?: {
        "0"?: boolean;
        "1"?: boolean;
        "2"?: boolean;
        "3"?: boolean;
        "4"?: boolean;
        "5"?: boolean;
        "6"?: boolean;
      };
      timezone?: string;
    }>;
  };
}

interface GetEmailsParams {
  campaign_id?: string;
  status?: InstantlyEmailStatus;
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}

interface InstantlyLead {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  website?: string;
  custom_variables?: Record<string, string>;
}

class InstantlyError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'InstantlyError';
  }
}

export class InstantlyClient {
  private readonly apiKey: string;
  private readonly workspaceId?: string;
  private readonly baseUrl = 'https://api.instantly.ai/api/v2';

  constructor(apiKey: string, workspaceId?: string) {
    if (!apiKey) {
      throw new Error('Instantly API key is required');
    }
    this.apiKey = apiKey;
    this.workspaceId = workspaceId;
  }

  private async fetchAPI<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${this.apiKey}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        const errorData = isJson ? await response.json() : await response.text();
        console.error('Instantly API error details:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url,
          method: options.method || 'GET'
        });
        throw new InstantlyError(
          `Instantly API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
          response.status,
          errorData
        );
      }

      if (!isJson) {
        throw new InstantlyError('Expected JSON response from Instantly API');
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof InstantlyError) {
        throw error;
      }
      throw new InstantlyError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getCampaigns(): Promise<InstantlyCampaign[]> {
    const response = await this.fetchAPI<InstantlyCampaign[]>('/campaigns');
    return Array.isArray(response) ? response : [];
  }

  async getCampaign(campaignId: string): Promise<InstantlyCampaign> {
    const response = await this.fetchAPI<InstantlyCampaign>(
      `/campaigns/${campaignId}`
    );
    return response;
  }

  async createCampaign(params: CreateCampaignParams): Promise<InstantlyCampaign> {
    const response = await this.fetchAPI<InstantlyCampaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    console.log('Create campaign response:', JSON.stringify(response, null, 2));
    return response;
  }

  async updateCampaign(
    campaignId: string,
    updates: Partial<CreateCampaignParams>
  ): Promise<InstantlyCampaign> {
    const response = await this.fetchAPI<InstantlyCampaign>(
      `/campaigns/${campaignId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    return response;
  }

  async pauseCampaign(campaignId: string): Promise<InstantlyCampaign> {
    const response = await this.fetchAPI<InstantlyCampaign>(
      `/campaigns/${campaignId}/pause`,
      { method: 'POST' }
    );
    return response;
  }

  async resumeCampaign(campaignId: string): Promise<InstantlyCampaign> {
    const response = await this.fetchAPI<InstantlyCampaign>(
      `/campaigns/${campaignId}/resume`,
      { method: 'POST' }
    );
    return response;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await this.fetchAPI<void>(`/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
  }

  async getEmails(params: GetEmailsParams = {}): Promise<InstantlyEmail[]> {
    const searchParams = new URLSearchParams();

    if (params.campaign_id) searchParams.set('campaign_id', params.campaign_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    if (params.start_date) searchParams.set('start_date', params.start_date);
    if (params.end_date) searchParams.set('end_date', params.end_date);

    const query = searchParams.toString();
    const endpoint = query ? `/emails?${query}` : '/emails';

    const response = await this.fetchAPI<{ emails: InstantlyEmail[] }>(endpoint);
    return response.emails ?? [];
  }

  async getInboxes(): Promise<InstantlyInbox[]> {
    const response = await this.fetchAPI<{ inboxes: InstantlyInbox[] }>('/inboxes');
    return response.inboxes ?? [];
  }

  async getInbox(inboxId: string): Promise<InstantlyInbox> {
    const response = await this.fetchAPI<{ inbox: InstantlyInbox }>(
      `/inboxes/${inboxId}`
    );
    return response.inbox;
  }

  async addLeadsToCampaign(
    campaignId: string,
    leads: InstantlyLead[]
  ): Promise<{ success: boolean; added: number; failed: number }> {
    const response = await this.fetchAPI<{
      success: boolean;
      added: number;
      failed: number;
    }>(`/campaigns/${campaignId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leads }),
    });
    return response;
  }

  async removeLeadFromCampaign(
    campaignId: string,
    email: string
  ): Promise<{ success: boolean }> {
    const response = await this.fetchAPI<{ success: boolean }>(
      `/campaigns/${campaignId}/leads/${encodeURIComponent(email)}`,
      { method: 'DELETE' }
    );
    return response;
  }

  async getCampaignAnalytics(campaignId: string): Promise<{
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    open_rate: number;
    click_rate: number;
    reply_rate: number;
  }> {
    const response = await this.fetchAPI<{
      analytics: {
        sent: number;
        opened: number;
        clicked: number;
        replied: number;
        bounced: number;
        unsubscribed: number;
        open_rate: number;
        click_rate: number;
        reply_rate: number;
      };
    }>(`/campaigns/${campaignId}/analytics`);
    return response.analytics;
  }
}

let clientInstance: InstantlyClient | null = null;

export function getInstantlyClient(): InstantlyClient {
  if (!clientInstance) {
    const apiKey = process.env.INSTANTLY_API_KEY;
    const workspaceId = process.env.INSTANTLY_WORKSPACE_ID;

    if (!apiKey) {
      throw new Error(
        'INSTANTLY_API_KEY environment variable is not set. Please add it to your .env file.'
      );
    }

    clientInstance = new InstantlyClient(apiKey, workspaceId);
  }

  return clientInstance;
}

export function createInstantlyClient(apiKey: string, workspaceId?: string): InstantlyClient {
  return new InstantlyClient(apiKey, workspaceId);
}

export type {
  InstantlyCampaign,
  InstantlyEmail,
  InstantlyInbox,
  InstantlyCampaignStatus,
  InstantlyEmailStatus,
  InstantlyInboxStatus,
  CreateCampaignParams,
  GetEmailsParams,
  InstantlyLead,
};

export { InstantlyError };
