// Конфигурация Supabase
const supabaseUrl = 'https://hzsctjmzqjsgmjigshwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMzg1MTYsImV4cCI6MjA1MTYxNDUxNn0.OVBvyWchb8yAi-xDAl5PTVks2YUD7DsYN3cVW-Gjuh4';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

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
