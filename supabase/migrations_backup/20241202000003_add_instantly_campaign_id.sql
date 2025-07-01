-- Add instantly_campaign_id column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN instantly_campaign_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_instantly_campaign_id 
ON campaigns(instantly_campaign_id);

-- Add comment to describe the column
COMMENT ON COLUMN campaigns.instantly_campaign_id IS 'The corresponding campaign ID from Instantly.ai for email automation'; 