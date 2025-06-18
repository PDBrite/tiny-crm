-- Add status field to campaigns table
CREATE TYPE campaign_status_type AS ENUM ('active', 'queued', 'completed', 'paused');

ALTER TABLE campaigns 
ADD COLUMN status campaign_status_type NOT NULL DEFAULT 'active';

-- Add index for better performance
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Add comment
COMMENT ON COLUMN campaigns.status IS 'Campaign status: active (running), queued (not started), completed (finished), paused (temporarily stopped)'; 