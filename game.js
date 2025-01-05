// Игровые переменные
let currentEnergy = 100;
let maxEnergy = 100;
let energyRegenInterval;
let lastEnergyUpdate = Date.now();
let isUpdatingEnergy = false;

// Инициализация игры
async function initGame() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Устанавливаем имя пользователя и другие элементы интерфейса
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = user.username;
    }

    try {
        // Получаем актуальные данные из базы
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            handleSupabaseError(error, 'Ошибка загрузки профиля');
            return;
        }

        if (profile) {
            setCurrentUser(profile);
            
            // Инициализируем значения
            currentEnergy = profile.energy ?? maxEnergy;
            lastEnergyUpdate = new Date(profile.last_energy_update).getTime();
            
            // Обновляем интерфейс
            updateBalance();
            updateEnergy();
            startEnergyRegeneration();
        } else {
            logout();
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка инициализации игры');
    }
}

// Обновление баланса
function updateBalance() {
    const user = getCurrentUser();
    const balanceElement = document.getElementById('balance');
    if (balanceElement && user) {
        balanceElement.textContent = user.balance;
    }
}

// Обновление энергии
function updateEnergy() {
    const energyFill = document.getElementById('energyFill');
    const currentEnergyElement = document.getElementById('currentEnergy');
    const maxEnergyElement = document.getElementById('maxEnergy');
    
    if (!energyFill || !currentEnergyElement || !maxEnergyElement) {
        return;
    }

    const energyPercentage = (currentEnergy / maxEnergy) * 100;
    energyFill.style.width = `${energyPercentage}%`;
    currentEnergyElement.textContent = Math.floor(currentEnergy);
    maxEnergyElement.textContent = maxEnergy;

    // Добавляем или убираем класс low-energy
    if (energyPercentage <= 20) {
        energyFill.classList.add('energy-low');
    } else {
        energyFill.classList.remove('energy-low');
    }
}

// Старт регенерации энергии
function startEnergyRegeneration() {
    // Останавливаем предыдущий интервал, если он был
    if (energyRegenInterval) {
        clearInterval(energyRegenInterval);
    }

    // Запускаем новый интервал
    energyRegenInterval = setInterval(async () => {
        if (isUpdatingEnergy || currentEnergy >= maxEnergy) {
            return;
        }

        try {
            isUpdatingEnergy = true;

            const user = getCurrentUser();
            if (!user) {
                clearInterval(energyRegenInterval);
                return;
            }

            // Добавляем 1 энергию каждую секунду
            const newEnergy = Math.min(maxEnergy, currentEnergy + 1);

            // Обновляем энергию в базе данных
            const { data, error } = await supabaseClient
                .from('profiles')
                .update({
                    energy: newEnergy,
                    last_energy_update: new Date().toISOString()
                })
                .eq('id', user.id)
                .select()
                .single();

            if (error) {
                handleSupabaseError(error, 'Ошибка обновления энергии');
                return;
            }

            if (data) {
                setCurrentUser({ ...user, ...data });
                currentEnergy = data.energy;
                updateEnergy();
            }

            lastEnergyUpdate = Date.now();
        } catch (error) {
            handleSupabaseError(error, 'Ошибка обновления энергии');
        } finally {
            isUpdatingEnergy = false;
        }
    }, 1000); // Интервал в 1 секунду
}

// Обработка клика
async function handleClick() {
    const user = getCurrentUser();
    if (!user || currentEnergy <= 0) return;

    try {
        // Уменьшаем энергию
        currentEnergy = Math.floor(Math.max(0, currentEnergy - 1));
        updateEnergy();

        // Обновляем баланс в базе данных
        const { data, error } = await supabaseClient
            .from('profiles')
            .update({
                balance: user.balance + 1,
                energy: currentEnergy,
                last_energy_update: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            handleSupabaseError(error, 'Ошибка обновления баланса');
            return;
        }

        if (data) {
            // Обновляем данные пользователя
            setCurrentUser({ ...user, ...data });
            
            // Анимация увеличения баланса
            const balanceElement = document.getElementById('balance');
            if (balanceElement) {
                balanceElement.textContent = data.balance;
                balanceElement.classList.add('balance-increase');
                setTimeout(() => balanceElement.classList.remove('balance-increase'), 300);
            }

            // Анимация клика
            const clickerButton = document.getElementById('clickerButton');
            if (clickerButton) {
                clickerButton.classList.add('clicked');
                setTimeout(() => clickerButton.classList.remove('clicked'), 100);
            }
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка обработки клика');
    }
}

// Навигация между секциями
function switchSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранную секцию
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add('active');
        
        // Если переключились на секцию Frens, обновляем список друзей
        if (sectionId === 'frensSection') {
            updateFriendsList();
        }
    }
    
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация игры
    initGame();

    // Обработчик клика по кнопке
    const clickerButton = document.getElementById('clickerButton');
    if (clickerButton) {
        clickerButton.addEventListener('click', handleClick);
    }

    // Обработчик клика по аватару для настроек
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.addEventListener('click', toggleSettings);
    }

    // Обработчики навигации
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.dataset.section) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchSection(item.dataset.section);
            });
        }
    });

    // Настройка видимости документа
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            syncEnergy();
        }
    });
});

// Функции для работы с настройками
function toggleSettings() {
    const overlay = document.getElementById('settingsOverlay');
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

function loadSettings() {
    try {
        // Загружаем сохраненные настройки из localStorage
        const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
        
        // Устанавливаем значения переключателей
        const soundToggle = document.getElementById('soundToggle');
        const musicToggle = document.getElementById('musicToggle');
        const notificationsToggle = document.getElementById('notificationsToggle');
        const snowToggle = document.getElementById('snowToggle');
        
        if (soundToggle) soundToggle.checked = settings.sound ?? true;
        if (musicToggle) musicToggle.checked = settings.music ?? true;
        if (notificationsToggle) notificationsToggle.checked = settings.notifications ?? true;
        if (snowToggle) {
            // Снег включен по умолчанию
            snowToggle.checked = settings.snow ?? true;
        }
        
        // Запускаем снег при загрузке страницы
        if (!settings.hasOwnProperty('snow') || settings.snow) {
            snowfall.start();
        }
        
        // Добавляем обработчики изменений
        ['sound', 'music', 'notifications'].forEach(setting => {
            const toggle = document.getElementById(`${setting}Toggle`);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
                    settings[setting] = e.target.checked;
                    localStorage.setItem('gameSettings', JSON.stringify(settings));
                });
            }
        });

        // Добавляем обработчик для снега
        if (snowToggle) {
            snowToggle.addEventListener('change', (e) => {
                const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
                settings.snow = e.target.checked;
                localStorage.setItem('gameSettings', JSON.stringify(settings));
                
                if (e.target.checked) {
                    snowfall.start();
                } else {
                    snowfall.stop();
                }
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
}

// Функция выхода из аккаунта
async function logout() {
    try {
        // Очищаем данные пользователя
        localStorage.removeItem('currentUser');
        localStorage.removeItem('gameSettings');
        
        // Очищаем интервал регенерации энергии
        if (energyRegenInterval) {
            clearInterval(energyRegenInterval);
        }
        
        // Перенаправляем на страницу входа
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }
}

// Закрытие настроек при клике вне окна
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('settingsOverlay');
    const settingsPanel = document.querySelector('.settings-panel');
    const avatar = document.getElementById('userAvatar');
    
    if (overlay && overlay.classList.contains('active')) {
        if (!settingsPanel.contains(e.target) && e.target !== avatar) {
            overlay.classList.remove('active');
        }
    }
});

// Очистка интервала при уходе со страницы
window.addEventListener('beforeunload', () => {
    if (energyRegenInterval) {
        clearInterval(energyRegenInterval);
    }
});

// Обновляем app.js, чтобы после успешного входа перенаправлять на game.html
function redirectToGame() {
    window.location.href = 'game.html';
}

// Функция для получения текущего пользователя
function getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        return JSON.parse(userData);
    } else {
        return null;
    }
}

// Функция для установки текущего пользователя
function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Обновляем список друзей
function updateFriendsList() {
    // TODO: реализовать обновление списка друзей
}

// Обработчик ошибок Supabase
function handleSupabaseError(error, message) {
    console.error(message, error);
    showNotification(message, true);
}

// Функция для синхронизации энергии
async function syncEnergy() {
    try {
        const user = getCurrentUser();
        if (!user) return;

        const { data, error } = await supabaseClient
            .from('profiles')
            .select('energy, last_energy_update')
            .eq('id', user.id)
            .single();

        if (error) {
            handleSupabaseError(error, 'Ошибка синхронизации энергии');
            return;
        }

        if (data) {
            currentEnergy = data.energy;
            lastEnergyUpdate = new Date(data.last_energy_update).getTime();
            updateEnergy();
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка синхронизации энергии');
    }
}
