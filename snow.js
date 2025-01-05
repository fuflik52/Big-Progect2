class Snowfall {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.snowflakes = [];
        this.isActive = false;
        this.animationFrame = null;

        // Настройки снежинок
        this.snowflakeCount = 150; // Увеличили количество снежинок
        this.snowflakeSize = 4;
        this.snowflakeSpeed = 1.5; // Увеличили скорость
        this.wind = 0.8; // Усилили ветер

        // Настраиваем canvas
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
        
        // Обработчик изменения размера окна
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    // Инициализация снежинок
    initSnowflakes() {
        this.snowflakes = [];
        for (let i = 0; i < this.snowflakeCount; i++) {
            this.snowflakes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * this.snowflakeSize + 1,
                speed: Math.random() * this.snowflakeSpeed + 0.5,
                opacity: Math.random() * 0.6 + 0.4, // Увеличили минимальную прозрачность
                wind: Math.random() * this.wind - this.wind/2 // Индивидуальный ветер для каждой снежинки
            });
        }
    }

    // Обновление размера canvas
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.isActive) {
            this.initSnowflakes();
        }
    }

    // Отрисовка снежинок
    drawSnowflakes() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.snowflakes.forEach(snowflake => {
            this.ctx.beginPath();
            this.ctx.arc(snowflake.x, snowflake.y, snowflake.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${snowflake.opacity})`;
            this.ctx.fill();
        });
    }

    // Обновление позиций снежинок
    updateSnowflakes() {
        this.snowflakes.forEach(snowflake => {
            snowflake.y += snowflake.speed;
            snowflake.x += snowflake.wind;

            // Если снежинка вышла за пределы экрана, возвращаем её наверх
            if (snowflake.y > this.canvas.height) {
                snowflake.y = -snowflake.size;
                snowflake.x = Math.random() * this.canvas.width;
            }

            // Если снежинка вышла за боковые границы
            if (snowflake.x > this.canvas.width) {
                snowflake.x = 0;
            } else if (snowflake.x < 0) {
                snowflake.x = this.canvas.width;
            }
        });
    }

    // Анимация
    animate() {
        if (!this.isActive) return;

        this.updateSnowflakes();
        this.drawSnowflakes();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    // Запуск снегопада
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        document.body.appendChild(this.canvas);
        this.resizeCanvas();
        this.initSnowflakes();
        this.animate();
        
        // Сохраняем состояние в localStorage
        const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
        settings.snow = true;
        localStorage.setItem('gameSettings', JSON.stringify(settings));
    }

    // Остановка снегопада
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Сохраняем состояние в localStorage
        const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
        settings.snow = false;
        localStorage.setItem('gameSettings', JSON.stringify(settings));
    }

    // Переключение состояния
    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
    }
}

// Создаем глобальный экземпляр
const snowfall = new Snowfall();
