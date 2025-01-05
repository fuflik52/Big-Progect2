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

    const friendListElement = document.querySelector('.friend-list-content');
    if (!friendListElement) return;

    try {
        const { data: friends, error } = await supabaseClient
            .from('user_friends')
            .select(`
                friend:profiles!user_friends_friend_id_fkey(
                    username,
                    balance,
                    total_clicks
                )
            `)
            .eq('user_id', user.id);

        if (error) {
            handleSupabaseError(error, 'Ошибка загрузки списка друзей');
            return;
        }

        // Обновляем счетчик друзей
        const friendCountElement = document.querySelector('.friend-list-header');
        if (friendCountElement) {
            friendCountElement.textContent = `Список друзей (${friends ? friends.length : 0})`;
        }

        // Очищаем и обновляем список друзей
        friendListElement.innerHTML = '';
        if (friends && friends.length > 0) {
            friends.forEach(({ friend }) => {
                const friendElement = document.createElement('div');
                friendElement.className = 'friend-item';
                friendElement.innerHTML = `
                    <div class="friend-info">
                        <div class="friend-name">${friend.username}</div>
                        <div class="friend-stats">
                            Баланс: ${friend.balance} | Всего кликов: ${friend.total_clicks}
                        </div>
                    </div>
                `;
                friendListElement.appendChild(friendElement);
            });
        } else {
            friendListElement.innerHTML = '<div class="no-friends">У вас пока нет друзей</div>';
        }
    } catch (error) {
        handleSupabaseError(error, 'Ошибка обновления списка друзей');
    }
}

// Копирование реферальной ссылки
function copyReferralLink() {
    const referralLink = `${window.location.origin}/index.html?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink)
        .then(() => showNotification('Ссылка скопирована!'))
        .catch(() => showNotification('Ошибка копирования ссылки', true));
}

// Обработка реферальной ссылки при входе
async function handleReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (!refCode || !getCurrentUser()) return;

    try {
        // Декодируем ID пригласившего пользователя
        const referrerId = atob(refCode);
        
        // Проверяем, существует ли уже такая дружба
        const { data: existingFriend, error: checkError } = await supabaseClient
            .from('user_friends')
            .select('id')
            .match({
                user_id: referrerId,
                friend_id: getCurrentUser().id
            })
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
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
                    friend_id: getCurrentUser().id
                }
            ]);

        if (createError) throw createError;

        showNotification('Вы успешно добавлены в список друзей!');
        
        // Добавляем бонус пригласившему
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                balance: supabase.sql`balance + ${Math.floor(getCurrentUser().balance * 0.1)}`
            })
            .eq('id', referrerId);

        if (updateError) throw updateError;

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
