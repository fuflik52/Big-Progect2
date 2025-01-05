let referralCode = '';

// Функция для инициализации системы Frens
async function initFrens() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        referralCode = await generateReferralCode(user.username);
        if (referralCode) {
            updateFriendsList();
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка инициализации системы Frens');
    }
}

// Генерация реферального кода
async function generateReferralCode(username) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();

        if (error) {
            handleSupabaseError(error, 'Ошибка получения ID пользователя');
            return '';
        }

        return btoa(data.id).replace(/[^a-zA-Z0-9]/g, '');
    } catch (error) {
        handleSupabaseError(error, 'Ошибка генерации реферального кода');
        return '';
    }
}

// Обновление списка друзей
async function updateFriendsList() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // Получаем список друзей с их именами
        const { data: friends, error } = await supabaseClient
            .from('user_friends')
            .select(`
                id,
                friend:friend_id (
                    username
                )
            `)
            .eq('user_id', user.id);

        if (error) {
            handleSupabaseError(error, 'Ошибка загрузки списка друзей');
            return;
        }

        // Обновляем счетчик друзей
        const friendListHeader = document.querySelector('.friend-list-header');
        if (friendListHeader) {
            friendListHeader.textContent = `Список друзей (${friends.length})`;
        }

        // Обновляем список друзей
        const friendListContent = document.querySelector('.friend-list-content');
        if (friendListContent) {
            friendListContent.innerHTML = friends.map(friend => `
                <div class="friend-item">
                    <span class="friend-name">${friend.friend.username}</span>
                    <i class="fas fa-times friend-remove" onclick="removeFriend(${friend.id})"></i>
                </div>
            `).join('');
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка загрузки списка друзей');
    }
}

// Удаление друга
async function removeFriend(friendshipId) {
    try {
        const { error } = await supabaseClient
            .from('user_friends')
            .delete()
            .eq('id', friendshipId);

        if (error) {
            handleSupabaseError(error, 'Ошибка удаления друга');
            return;
        }

        showNotification('Друг удален из списка');
        await updateFriendsList();
    } catch (error) {
        handleSupabaseError(error, 'Ошибка удаления друга');
    }
}

// Копирование реферальной ссылки
function copyReferralLink() {
    const referralLink = `${window.location.origin}/index.html?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink)
        .then(() => showNotification('Ссылка скопирована!'))
        .catch(() => showNotification('Ошибка копирования ссылки', true));
}

// Обработка реферальной ссылки
async function handleReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    const user = getCurrentUser();
    
    if (!refCode || !user) return;

    try {
        // Декодируем ID пригласившего пользователя
        const referrerId = atob(refCode);

        // Проверяем, не пытается ли пользователь добавить сам себя
        if (referrerId === user.id) {
            showNotification('Вы не можете добавить себя в друзья');
            return;
        }
        
        // Проверяем, существует ли уже такая дружба
        const { data: existingFriend, error: checkError } = await supabaseClient
            .from('user_friends')
            .select('id')
            .match({
                user_id: referrerId,
                friend_id: user.id
            })
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            handleSupabaseError(checkError, 'Ошибка проверки дружбы');
            return;
        }

        if (existingFriend) {
            showNotification('Вы уже являетесь другом этого пользователя');
            return;
        }

        // Создаем связь дружбы
        const { error: createError } = await supabaseClient
            .from('user_friends')
            .insert([
                {
                    user_id: referrerId,
                    friend_id: user.id
                }
            ]);

        if (createError) {
            handleSupabaseError(createError, 'Ошибка добавления в друзья');
            return;
        }

        // Начисляем бонус пригласившему
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                balance: supabase.sql`balance + ${Math.floor(user.balance * 0.1)}`
            })
            .eq('id', referrerId);

        if (updateError) {
            handleSupabaseError(updateError, 'Ошибка начисления бонуса');
            return;
        }

        showNotification('Вы успешно добавлены в список друзей!');
        
        // Обновляем список друзей
        updateFriendsList();
        
        // Удаляем параметр ref из URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        handleSupabaseError(error, 'Ошибка обработки реферальной ссылки');
    }
}

// Показ уведомлений
function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Обработка ошибок Supabase
function handleSupabaseError(error, message) {
    console.error(message, error);
    showNotification(message, true);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initFrens();
    handleReferral();
});

// Инициализация списка друзей
async function initFriends() {
    const user = getCurrentUser();
    if (!user) return;

    // Отображаем имя пользователя
    const usernameElement = document.getElementById('yourUsername');
    if (usernameElement) {
        usernameElement.textContent = user.username;
    }

    // Загружаем список друзей
    await updateFriendsList();
}

// Добавление друга по имени
async function addFriend() {
    const user = getCurrentUser();
    if (!user) return;

    const friendUsernameInput = document.getElementById('friendUsername');
    const friendUsername = friendUsernameInput.value.trim();

    if (!friendUsername) {
        showNotification('Введите имя друга', true);
        return;
    }

    if (friendUsername === user.username) {
        showNotification('Вы не можете добавить себя в друзья', true);
        return;
    }

    try {
        // Проверяем существование пользователя
        const { data: friendUser, error: userError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('username', friendUsername)
            .single();

        if (userError || !friendUser) {
            showNotification('Пользователь не найден', true);
            return;
        }

        // Проверяем, не является ли уже другом
        const { data: existingFriends, error: checkError } = await supabaseClient
            .from('user_friends')
            .select('id')
            .eq('user_id', user.id)
            .eq('friend_id', friendUser.id);

        if (checkError) {
            handleSupabaseError(checkError, 'Ошибка проверки дружбы');
            return;
        }

        if (existingFriends && existingFriends.length > 0) {
            showNotification('Этот пользователь уже в списке друзей', true);
            return;
        }

        // Добавляем друга
        const { error: addError } = await supabaseClient
            .from('user_friends')
            .insert([
                {
                    user_id: user.id,
                    friend_id: friendUser.id
                }
            ]);

        if (addError) {
            handleSupabaseError(addError, 'Ошибка добавления друга');
            return;
        }

        // Очищаем поле ввода и обновляем список
        friendUsernameInput.value = '';
        showNotification('Друг успешно добавлен!');
        await updateFriendsList();

    } catch (error) {
        handleSupabaseError(error, 'Ошибка добавления друга');
    }
}

// Копирование имени пользователя
function copyUsername() {
    const user = getCurrentUser();
    if (!user) return;

    navigator.clipboard.writeText(user.username)
        .then(() => showNotification('Имя пользователя скопировано'))
        .catch(() => showNotification('Ошибка копирования', true));
}
