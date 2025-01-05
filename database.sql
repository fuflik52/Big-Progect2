-- Удаление существующей таблицы 
DROP TABLE IF EXISTS profiles;

-- 1. Создание базовой таблицы
CREATE TABLE profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    user_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    score INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    coins INTEGER DEFAULT 0
);

-- 2. Настройка RLS и политик
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_policy" 
    ON profiles 
    USING (true)
    WITH CHECK (true);

-- Удаление старых политик (игнорируем ошибки если их нет)
DROP POLICY IF EXISTS "Enable insert for all users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on username" ON profiles;

-- 3. Создание триггера для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE
    ON profiles
    FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Удаляем старый триггер если он существует
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Создаем триггер
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE
    ON profiles
    FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
