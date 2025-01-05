// Инициализация Supabase
const supabaseUrl = 'https://hzsctjmzqjsgmjigshwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6c2N0am16cWpzZ21qaWdzaHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMzg1MTYsImV4cCI6MjA1MTYxNDUxNn0.OVBvyWchb8yAi-xDAl5PTVks2YUD7DsYN3cVW-Gjuh4';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Игровые переменные
let balance = 0;
let clickPower = 1;
let currentUser = null;

// Инициализация игры
async function initGame() {
    // Получаем данные пользователя из localStorage
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = JSON.parse(userData);
    
    // Устанавливаем имя пользователя
    document.getElementById('username').textContent = currentUser.username;
    
    try {
        // Проверяем существование профиля и создаем его при необходимости
        const { data: existingProfile, error: checkError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('username', currentUser.username)
            .single();

        if (checkError && checkError.code === 'PGRST116') {
            // Профиль не найден, создаем новый
            const { data: newProfile, error: createError } = await supabaseClient
                .from('profiles')
                .insert([
                    {
                        username: currentUser.username,
                        user_password: currentUser.user_password,
                        balance: 0,
                        click_power: 1,
                        total_clicks: 0
                    }
                ])
                .select()
                .single();

            if (createError) throw createError;
            currentUser = newProfile;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else if (checkError) {
            throw checkError;
        } else {
            currentUser = existingProfile;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        // Устанавливаем значения из профиля
        balance = currentUser.balance || 0;
        clickPower = currentUser.click_power || 1;
        updateBalance();
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
    }
}

// Обновление баланса
function updateBalance() {
    const balanceElement = document.getElementById('balance');
    balanceElement.textContent = balance;
    balanceElement.classList.add('balance-increase');
    setTimeout(() => balanceElement.classList.remove('balance-increase'), 300);
}

// Обработка клика
async function handleClick() {
    balance += clickPower;
    updateBalance();
    
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ 
                balance: balance,
                total_clicks: (currentUser.total_clicks || 0) + 1
            })
            .eq('username', currentUser.username);
            
        if (error) throw error;
        
        // Обновляем данные в localStorage
        currentUser.balance = balance;
        currentUser.total_clicks = (currentUser.total_clicks || 0) + 1;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } catch (error) {
        console.error('Ошибка сохранения баланса:', error);
    }
}

// Навигация между секциями
function switchSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранную секцию
    document.getElementById(sectionId).classList.add('active');
    
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // Клик по кнопке
    document.getElementById('clickerButton').addEventListener('click', handleClick);
    
    // Навигация
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });
});

// Обновляем app.js, чтобы после успешного входа перенаправлять на game.html
function redirectToGame() {
    window.location.href = 'game.html';
}
