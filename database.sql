-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем схему public, если она не существует
CREATE SCHEMA IF NOT EXISTS public;

-- Создаем таблицу профилей пользователей
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    balance BIGINT DEFAULT 0,
    energy INTEGER DEFAULT 100,
    max_energy INTEGER DEFAULT 100,
    last_energy_update TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    total_clicks BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Создаем таблицу друзей
CREATE TABLE IF NOT EXISTS public.user_friends (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, friend_id)
);

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_friends_user_id ON user_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id ON user_friends(friend_id);

-- Создаем функцию для обновления временной метки
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для обновления временной метки
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Включаем RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Политики безопасности для user_friends
DROP POLICY IF EXISTS "Users can view their own friends" ON user_friends;
DROP POLICY IF EXISTS "Users can add friends" ON user_friends;
DROP POLICY IF EXISTS "Users can remove their own friends" ON user_friends;

CREATE POLICY "Users can view their own friends"
ON user_friends FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add friends"
ON user_friends FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own friends"
ON user_friends FOR DELETE
USING (auth.uid() = user_id);

-- Функция для создания профиля пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, balance, energy, max_energy)
    VALUES (new.id, new.raw_user_meta_data->>'username', 0, 100, 100);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Функция для обновления энергии
CREATE OR REPLACE FUNCTION public.update_energy()
RETURNS trigger AS $$
BEGIN
    -- Обновляем энергию только если прошло время с последнего обновления
    IF NEW.last_energy_update < timezone('utc'::text, now()) - interval '1 second' THEN
        -- Увеличиваем энергию на 1 за каждую секунду, но не больше максимума
        NEW.energy := LEAST(NEW.max_energy, NEW.energy + 
            EXTRACT(EPOCH FROM timezone('utc'::text, now()) - NEW.last_energy_update)::integer);
        NEW.last_energy_update := timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления энергии
DROP TRIGGER IF EXISTS on_profile_energy_update ON profiles;
CREATE TRIGGER on_profile_energy_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION public.update_energy();
