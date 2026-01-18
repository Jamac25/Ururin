/* ========================================
   SUPABASE SCHEMA - Database Setup
   Run this SQL in Supabase SQL Editor
   ======================================== */

-- ========================================
-- 1. PROFILES TABLE (Extended User Info)
-- ========================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    default_currency TEXT DEFAULT 'USD',
    default_currency_symbol TEXT DEFAULT '$',
    default_zaad TEXT,
    theme TEXT DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- ========================================
-- 2. CAMPAIGNS TABLE
-- ========================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'folder',
    description TEXT,
    goal NUMERIC NOT NULL,
    deadline DATE,
    zaad_number TEXT,
    coordinator_pin TEXT, -- Consider encrypting this
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on code for fast lookups
CREATE INDEX idx_campaigns_code ON campaigns(code);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view own campaigns" 
    ON campaigns FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create campaigns" 
    ON campaigns FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaigns" 
    ON campaigns FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaigns" 
    ON campaigns FOR DELETE 
    USING (auth.uid() = user_id);

-- Policy for public access (join page)
CREATE POLICY "Public can view campaigns by code" 
    ON campaigns FOR SELECT 
    USING (true);

-- ========================================
-- 3. CONTRIBUTORS TABLE
-- ========================================

CREATE TABLE contributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'declined')),
    payment_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contributors_campaign_id ON contributors(campaign_id);
CREATE INDEX idx_contributors_status ON contributors(status);

-- Enable RLS
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;

-- Policies for campaign owners
CREATE POLICY "Campaign owners can view contributors" 
    ON contributors FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = contributors.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Campaign owners can create contributors" 
    ON contributors FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = contributors.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Campaign owners can update contributors" 
    ON contributors FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = contributors.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Campaign owners can delete contributors" 
    ON contributors FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = contributors.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

-- Policy for public (join page)
CREATE POLICY "Public can create contributors" 
    ON contributors FOR INSERT 
    WITH CHECK (true);

-- ========================================
-- 4. PAYMENTS TABLE
-- ========================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
    contributor_id UUID REFERENCES contributors(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    proof_type TEXT CHECK (proof_type IN ('image', 'text', NULL)),
    proof_data TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_campaign_id ON payments(campaign_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for campaign owners
CREATE POLICY "Campaign owners can view payments" 
    ON payments FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = payments.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Campaign owners can update payments" 
    ON payments FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = payments.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

CREATE POLICY "Campaign owners can delete payments" 
    ON payments FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM campaigns 
            WHERE campaigns.id = payments.campaign_id 
            AND campaigns.user_id = auth.uid()
        )
    );

-- Policy for public (payment confirmation)
CREATE POLICY "Public can create payments" 
    ON payments FOR INSERT 
    WITH CHECK (true);

-- ========================================
-- 5. TEMPLATES TABLE (Optional)
-- ========================================

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    text TEXT NOT NULL,
    variables JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, type)
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own templates" 
    ON templates FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates" 
    ON templates FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" 
    ON templates FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" 
    ON templates FOR DELETE 
    USING (auth.uid() = user_id);

-- ========================================
-- 6. FUNCTIONS & TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributors_updated_at BEFORE UPDATE ON contributors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 7. HELPER VIEWS (Optional)
-- ========================================

-- View for campaign statistics
CREATE OR REPLACE VIEW campaign_stats AS
SELECT 
    c.id,
    c.name,
    c.goal,
    COUNT(DISTINCT co.id) as total_contributors,
    COUNT(DISTINCT CASE WHEN co.status = 'paid' THEN co.id END) as paid_count,
    COUNT(DISTINCT CASE WHEN co.status = 'pending' THEN co.id END) as pending_count,
    COALESCE(SUM(CASE WHEN co.status = 'paid' THEN co.amount ELSE 0 END), 0) as collected,
    ROUND((COALESCE(SUM(CASE WHEN co.status = 'paid' THEN co.amount ELSE 0 END), 0) / NULLIF(c.goal, 0) * 100), 0) as percent
FROM campaigns c
LEFT JOIN contributors co ON c.id = co.campaign_id
GROUP BY c.id, c.name, c.goal;
