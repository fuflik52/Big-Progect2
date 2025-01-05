// Конфигурация Supabase
const SUPABASE_URL = 'https://hzsctjmzqjsgmjigshwd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNDQ2Njk0MCwiZXhwIjoyMDIwMDQyOTQwfQ.I-0fHaE-0xC-X3dxQVyXvqZrKyHEVnQGUPJLBaLFQOA';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ0NjY5NDAsImV4cCI6MjAyMDA0Mjk0MH0.GQDzf4TK4mB_0cQDXXS9lABJ9IC5IqiYTALvZIWWs4E';

// Создаем клиента Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Инициализация базы данных
async function initDatabase() {
    try {
        // Проверяем авторизацию
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError) {
            console.error('Ошибка авторизации:', authError);
            return;
        }

        if (!user) {
            console.log('Пользователь не авторизован');
            return;
        }

        console.log('Текущий пользователь:', user);

        // Создаем или обновляем таблицу друзей
        const { error: friendsError } = await supabaseClient.rpc('init_friends_table');
        if (friendsError) {
            console.error('Ошибка инициализации таблицы друзей:', friendsError);
        }

        // Создаем функцию для инициализации таблицы друзей
        const { error: functionError } = await supabaseClient.rpc('create_init_friends_function');
        if (functionError && !functionError.message.includes('already exists')) {
            console.error('Ошибка создания функции:', functionError);
        }
    } catch (error) {
        console.error('Ошибка инициализации базы данных:', error);
    }
}

// Функция для создания SQL функций в базе данных
async function createDatabaseFunctions() {
    try {
        // SQL для создания функции инициализации таблицы друзей
        const createInitFriendsFunction = `
            CREATE OR REPLACE FUNCTION init_friends_table()
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
                -- Создаем таблицу друзей, если она не существует
                CREATE TABLE IF NOT EXISTS user_friends (
                    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
                    UNIQUE(user_id, friend_id)
                );

                -- Создаем индексы для оптимизации
                CREATE INDEX IF NOT EXISTS idx_user_friends_user_id ON user_friends(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_friends_friend_id ON user_friends(friend_id);

                -- Обновляем политики безопасности
                ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;

                -- Удаляем старые политики, если они существуют
                DROP POLICY IF EXISTS "Users can view their own friends" ON user_friends;
                DROP POLICY IF EXISTS "Users can add friends" ON user_friends;
                DROP POLICY IF EXISTS "Users can remove their own friends" ON user_friends;

                -- Создаем новые политики
                CREATE POLICY "Users can view their own friends"
                ON user_friends FOR SELECT
                USING (auth.uid() = user_id);

                CREATE POLICY "Users can add friends"
                ON user_friends FOR INSERT
                WITH CHECK (auth.uid() = user_id);

                CREATE POLICY "Users can remove their own friends"
                ON user_friends FOR DELETE
                USING (auth.uid() = user_id);
            END;
            $$;
        `;

        // Создаем функцию
        const { error } = await supabaseClient.rpc('create_init_friends_function', {
            sql: createInitFriendsFunction
        });

        if (error && !error.message.includes('already exists')) {
            console.error('Ошибка создания функций базы данных:', error);
        }
    } catch (error) {
        console.error('Ошибка создания функций базы данных:', error);
    }
}

// Функция для получения текущего пользователя
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) {
            console.error('Ошибка получения пользователя:', error);
            return null;
        }
        return user;
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        return null;
    }
}

// Инициализируем базу данных при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
});

// Глобальные переменные
let currentUser = null;

// Функции для работы с пользователем
async function getCurrentUser() {
    if (!currentUser) {
        // Пробуем получить данные из localStorage
        const userData = localStorage.getItem('currentUser');
        const sessionData = localStorage.getItem('supabase.auth.token');

        if (userData && sessionData) {
            currentUser = JSON.parse(userData);
            
            // Проверяем актуальность данных
            try {
                const { data: profile, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('username', currentUser.username)
                    .single();

                if (error) {
                    throw error;
                }

                if (profile) {
                    currentUser = profile;
                    localStorage.setItem('currentUser', JSON.stringify(profile));
                }
            } catch (error) {
                console.error('Ошибка обновления данных пользователя:', error);
                localStorage.removeItem('currentUser');
                localStorage.removeItem('supabase.auth.token');
                currentUser = null;
            }
        }
    }
    return currentUser;
}

function setCurrentUser(user) {
    currentUser = user;
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('supabase.auth.token');
    }
}

// Функция для обработки ошибок Supabase
function handleSupabaseError(error, message = 'Произошла ошибка') {
    console.error(message + ':', error);
    if (error.message === 'Invalid API key' || error.message.includes('JWT')) {
        // Если проблема с авторизацией, перенаправляем на страницу входа
        localStorage.removeItem('currentUser');
        localStorage.removeItem('supabase.auth.token');
        window.location.href = 'index.html';
    }
    return null;
}

// Экспортируем нужные функции и переменные
window.supabaseClient = supabaseClient;
window.getCurrentUser = getCurrentUser;
