// Инициализация Supabase
const supabaseUrl = 'https://hzsctjmzqjsgmjigshwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMzg1MTYsImV4cCI6MjA1MTYxNDUxNn0.OVBvyWchb8yAi-xDAl5PTVks2YUD7DsYN3cVW-Gjuh4';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

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
        // Сначала проверяем существование пользователя
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id, username, balance, click_power, total_clicks')
            .eq('username', username)
            .eq('user_password', password)
            .limit(1);

        if (error) {
            console.error('Ошибка запроса:', error);
            throw error;
        }

        if (data && data.length > 0) {
            showNotification('Вы успешно вошли в систему!');
            localStorage.setItem('currentUser', JSON.stringify(data[0]));
            window.location.href = 'game.html';
        } else {
            showNotification('Неверный никнейм или пароль', true);
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification('Ошибка входа. Пожалуйста, попробуйте позже', true);
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
        const { data: existingUser, error: checkError } = await supabaseClient
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
        const { data, error } = await supabaseClient
            .from('profiles')
            .insert([
                {
                    username: username,
                    user_password: password,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;

        showNotification('Регистрация успешна!');
        localStorage.setItem('currentUser', JSON.stringify(data));
        window.location.href = 'game.html';
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка регистрации: ' + error.message, true);
    }
}

// Функция для переключения видимости пароля
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const icon = document.querySelector('.password-toggle i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Функция для показа формы регистрации
function showRegistrationForm() {
    const authForm = document.querySelector('.auth-form');
    const buttons = document.querySelector('.buttons');
    const registerLink = document.querySelector('.register-link');
    
    // Меняем заголовок
    document.querySelector('h2').textContent = 'Регистрация';
    
    // Меняем кнопки
    buttons.innerHTML = '<button onclick="register()" class="btn btn-primary">Зарегистрироваться</button>';
    
    // Меняем ссылку внизу
    registerLink.innerHTML = '<p>Уже есть аккаунт? <a href="#" onclick="showLoginForm()">Войти</a></p>';
}

// Функция для показа формы входа
function showLoginForm() {
    const authForm = document.querySelector('.auth-form');
    const buttons = document.querySelector('.buttons');
    const registerLink = document.querySelector('.register-link');
    
    // Меняем заголовок
    document.querySelector('h2').textContent = 'Вход в систему';
    
    // Меняем кнопки
    buttons.innerHTML = '<button onclick="login()" class="btn btn-primary">Войти</button>';
    
    // Меняем ссылку внизу
    registerLink.innerHTML = '<p>Нет аккаунта? <a href="#" onclick="showRegistrationForm()">Зарегистрироваться</a></p>';
}

// Проверка авторизации при загрузке страницы
window.addEventListener('load', async () => {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'game.html';
    }
});
