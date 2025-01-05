// Инициализация Supabase
const supabaseClient = supabase.createClient(
    'https://hzsctjmzqjsgmjigshwd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzU3NjQwNTYsImV4cCI6MjA1MTYxNDUxNn0.OVBvyWchb8yAi-xDAl5PTVks2YUD7DsYN3cVW-Gjuh4'
);

// Функция для показа уведомлений
function showNotification(message, isError = false) {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;

    notifications.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notifications.removeChild(notification);
        }, 300);
    }, 3000);
}

// Функция входа
async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showNotification('Пожалуйста, заполните все поля', true);
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('username', username)
            .eq('user_password', password)
            .single();

        if (error) throw error;

        if (data) {
            showNotification('Вы успешно вошли в систему!');
            localStorage.setItem('currentUser', JSON.stringify(data));
            window.location.href = 'game.html';
        } else {
            showNotification('Неверный никнейм или пароль', true);
        }
    } catch (error) {
        showNotification('Ошибка входа: ' + error.message, true);
    }
}

// Функция регистрации
async function register() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showNotification('Пожалуйста, заполните все поля', true);
        return;
    }

    if (username.length < 3) {
        showNotification('Никнейм должен содержать минимум 3 символа', true);
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', true);
        return;
    }

    try {
        // Проверяем, существует ли пользователь с таким никнеймом
        const { data: existingUser, error: checkError } = await window.supabaseClient
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
            showNotification('Этот никнейм уже занят', true);
            return;
        }

        // Создаем нового пользователя
        const { data, error } = await window.supabaseClient
            .from('profiles')
            .insert([
                {
                    username: username,
                    user_password: password,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    score: 0,
                    level: 1,
                    coins: 0
                }
            ])
            .select()
            .single();

        if (error) throw error;

        showNotification('Регистрация успешна! Добро пожаловать в игру!');
        localStorage.setItem('currentUser', JSON.stringify(data));
        window.location.href = 'game.html';
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка регистрации: ' + error.message, true);
    }
}

// Проверка авторизации при загрузке страницы
window.addEventListener('load', () => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        window.location.href = 'game.html';
    }
});
