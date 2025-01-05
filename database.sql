-- Удаление существующих таблиц
DROP TABLE IF EXISTS user_cards;
DROP TABLE IF EXISTS user_friends;
DROP TABLE IF EXISTS mining_stats;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS profiles;

-- 1. Создание таблицы профилей
CREATE TABLE profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    user_password VARCHAR(255) NOT NULL CHECK (LENGTH(user_password) >= 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    click_power INTEGER DEFAULT 1 CHECK (click_power >= 1),
    total_clicks INTEGER DEFAULT 0 CHECK (total_clicks >= 0),
    energy INTEGER DEFAULT 100 CHECK (energy >= 0 AND energy <= 100),
    last_energy_update TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    last_daily_reward TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_profiles_username ON profiles(username);

-- 2. Создание таблицы друзей
CREATE TABLE user_friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE INDEX idx_user_friends_user_id ON user_friends(user_id);
CREATE INDEX idx_user_friends_friend_id ON user_friends(friend_id);

-- 3. Создание таблицы карт
CREATE TABLE user_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    card_type VARCHAR(50) NOT NULL,
    card_level INTEGER DEFAULT 1 CHECK (card_level >= 1),
    power_bonus INTEGER DEFAULT 0 CHECK (power_bonus >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX idx_user_cards_type ON user_cards(card_type);

-- 4. Создание таблицы майнинга
CREATE TABLE mining_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    mining_power INTEGER DEFAULT 0 CHECK (mining_power >= 0),
    last_mining_time TIMESTAMP WITH TIME ZONE,
    total_mined INTEGER DEFAULT 0 CHECK (total_mined >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_mining_stats_user_id ON mining_stats(user_id);

-- 5. Создание таблицы наград
CREATE TABLE rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_rewards_user_id ON rewards(user_id);
CREATE INDEX idx_rewards_type ON rewards(reward_type);

-- Настройка RLS и политик
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
CREATE POLICY "profiles_policy" ON profiles USING (true) WITH CHECK (true);

-- Политики для user_friends
CREATE POLICY "user_friends_policy" ON user_friends USING (true) WITH CHECK (true);

-- Политики для user_cards
CREATE POLICY "user_cards_policy" ON user_cards USING (true) WITH CHECK (true);

-- Политики для mining_stats
CREATE POLICY "mining_stats_policy" ON mining_stats USING (true) WITH CHECK (true);

-- Политики для rewards
CREATE POLICY "rewards_policy" ON rewards USING (true) WITH CHECK (true);

-- Создание функции для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для обновления updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_cards_updated_at
    BEFORE UPDATE ON user_cards
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_mining_stats_updated_at
    BEFORE UPDATE ON mining_stats
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
