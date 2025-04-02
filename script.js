$(document).ready(function() {
    // Игровые переменные
    const gameState = {
        screen: 'start',
        running: false,
        paused: false,
        timeLeft: 20,
        score: 0,
        tools: 0,
        health: 2,
        maxHealth: 5,
        carPosition: 0, // -1: left, 0: center, 1: right
        elements: [],
        superpowerUsed: false,
        username: '',
        gameInterval: null,
        timerInterval: null,
        lastSpawnTime: 0,
        spawnInterval: 1000
    };

    // DOM элементы
    const elements = {
        startScreen: $('#start-screen'),
        nameScreen: $('#name-screen'),
        gameScreen: $('#game-screen'),
        resultScreen: $('#result-screen'),
        road: $('#road'),
        car: $('#car'),
        timer: $('#timer'),
        score: $('#score'),
        tools: $('#tools'),
        health: $('#health'),
        superpowerBtn: $('#superpower-btn'),
        nextBtn: $('#next-btn'),
        startGameBtn: $('#start-game-btn'),
        restartBtn: $('#restart-btn'),
        usernameInput: $('#username'),
        resultUsername: $('#result-username'),
        resultScore: $('#result-score'),
        resultTools: $('#result-tools'),
        leaderboardBody: $('#leaderboard-body'),
        instructions: $('#instructions p'),
        leftBtn: $('#left-btn'),
        rightBtn: $('#right-btn')
    };

    // Изображения для предзагрузки
    const images = {
        car: 'media/car.png',
        barrel: 'media/barrel.png',
        toolkit: 'media/toolkit.png',
        road: 'media/road.png',
        health: 'media/health.png',
        background: 'media/background.png'
    };

    let loadedImages = 0;
    const totalImages = Object.keys(images).length;

    // Инициализация игры
    function init() {
        preloadImages(function() {
            setupEventListeners();
            animateInstructions();
        });
    }

    // Предзагрузка изображений
    function preloadImages(callback) {
        Object.entries(images).forEach(([key, src]) => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                loadedImages++;
                if (loadedImages === totalImages) {
                    $('.preloader').fadeOut(500, callback);
                }
            };
            img.onerror = () => {
                console.error('Ошибка загрузки изображения:', src);
                loadedImages++;
                if (loadedImages === totalImages) {
                    $('.preloader').fadeOut(500, callback);
                }
            };
        });
    }

    // Настройка обработчиков событий
    function setupEventListeners() {
        elements.nextBtn.click(showNameScreen);
        elements.startGameBtn.click(startGame);
        elements.restartBtn.click(restartGame);
        elements.superpowerBtn.click(useSuperpower);
        
        // Клавиатура
        $(document).keydown(function(e) {
            if (gameState.running && !gameState.paused) {
                if (e.key.toLowerCase() === 'a') {
                    moveCar(-1);
                } else if (e.key.toLowerCase() === 'd') {
                    moveCar(1);
                }
            }
            
            // Пауза (код клавиши 19)
            if (e.keyCode === 19 || e.key.toLowerCase() === 'p') {
                togglePause();
            }
        });
        
        // Мобильное управление
        elements.leftBtn.on('touchstart', () => moveCar(-1));
        elements.rightBtn.on('touchstart', () => moveCar(1));
    }

    // Анимация инструкции
    function animateInstructions() {
        elements.instructions.each(function(index) {
            $(this).css('animation-delay', (index * 0.3) + 's');
        });
    }

    // Показать экран ввода имени
    function showNameScreen() {
        elements.startScreen.css('opacity', '0');
        setTimeout(() => {
            elements.startScreen.hide();
            elements.nameScreen.css('opacity', '1').show();
        }, 500);
    }

    // Начать игру
    function startGame() {
        gameState.username = elements.usernameInput.val().trim();
        if (!gameState.username) {
            alert('Пожалуйста, введите ваше имя');
            return;
        }

        // Сброс состояния игры
        resetGameState();
        
        // Обновление UI
        updateUI();
        
        // Показать игровой экран
        elements.nameScreen.css('opacity', '0');
        setTimeout(() => {
            elements.nameScreen.hide();
            elements.gameScreen.css('opacity', '1').show();
        }, 500);
        
        // Запуск игрового цикла
        gameState.running = true;
        gameState.lastSpawnTime = Date.now();
        gameState.gameInterval = setInterval(gameLoop, 1000 / 60);
        
        // Запуск таймера
        gameState.timerInterval = setInterval(() => {
            if (!gameState.paused && gameState.running) {
                gameState.timeLeft--;
                updateTimer();
                
                if (gameState.timeLeft <= 0) {
                    endGame();
                }
            }
        }, 1000);
    }

    // Сброс состояния игры
    function resetGameState() {
        gameState.running = false;
        gameState.paused = false;
        gameState.timeLeft = 20;
        gameState.score = 0;
        gameState.tools = 0;
        gameState.health = 2;
        gameState.carPosition = 0;
        gameState.elements = [];
        gameState.superpowerUsed = false;
        
        // Очистить дорогу
        elements.road.find('.pothole, .tool, .health, .explosion').remove();
        
        // Позиционировать машину
        updateCarPosition();
        
        // Показать кнопку суперсилы
        elements.superpowerBtn.show();
    }

    // Игровой цикл
    function gameLoop() {
        if (gameState.paused || !gameState.running) return;
        
        const now = Date.now();
        
        // Создание новых элементов
        if (now - gameState.lastSpawnTime > gameState.spawnInterval) {
            spawnElements();
            gameState.lastSpawnTime = now;
        }
        
        // Движение элементов
        moveElements();
        
        // Проверка столкновений
        checkCollisions();
    }

    // Создание элементов на дороге
    function spawnElements() {
        const roadWidth = elements.road.width();
        const types = ['pothole', 'tool', 'health'];
        
        // Создать 1-3 элемента
        const count = Math.floor(Math.random() * 3) + 1;
        
        // Гарантировать минимум 2 элемента на дороге
        const neededElements = Math.max(0, 2 - gameState.elements.length);
        
        for (let i = 0; i < count + neededElements; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            spawnElement(type);
        }
    }

    // Создать один элемент
    function spawnElement(type) {
        const roadWidth = elements.road.width();
        let size, height, className;
        
        switch (type) {
            case 'pothole':
                size = 40;
                height = 60;
                className = 'pothole';
                break;
            case 'tool':
                size = 30;
                height = 30;
                className = 'tool';
                break;
            case 'health':
                size = 30;
                height = 30;
                className = 'health';
                break;
        }
        
        // Позиция (выбоины не могут перекрывать всю дорогу)
        let left;
        if (type === 'pothole') {
            const minGap = 50;
            left = minGap + Math.random() * (roadWidth - size - 2 * minGap);
        } else {
            left = Math.random() * (roadWidth - size);
        }
        
        // Создать элемент
        const element = $('<div>').addClass(className).css({
            left: left + 'px',
            top: '-' + height + 'px'
        });
        
        elements.road.append(element);
        
        // Сохранить данные элемента
        gameState.elements.push({
            element: element,
            type: type,
            y: -height,
            speed: 3 + Math.random() * 2,
            width: size,
            height: height,
            left: left
        });
    }

    // Движение элементов
    function moveElements() {
        const roadHeight = elements.road.height();
        
        for (let i = gameState.elements.length - 1; i >= 0; i--) {
            const elem = gameState.elements[i];
            
            if (!gameState.paused) {
                elem.y += elem.speed;
                elem.element.css('top', elem.y + 'px');
            }
            
            // Удалить элементы за пределами дороги
            if (elem.y > roadHeight) {
                elem.element.remove();
                gameState.elements.splice(i, 1);
            }
        }
    }

    // Проверка столкновений
    function checkCollisions() {
        if (gameState.paused) return;
        
        const carRect = {
            left: elements.car.position().left,
            top: elements.car.position().top,
            right: elements.car.position().left + elements.car.width(),
            bottom: elements.car.position().top + elements.car.height()
        };
        
        for (let i = gameState.elements.length - 1; i >= 0; i--) {
            const elem = gameState.elements[i];
            
            const elemRect = {
                left: elem.left,
                top: elem.y,
                right: elem.left + elem.width,
                bottom: elem.y + elem.height
            };
            
            // Проверка пересечения
            if (carRect.left < elemRect.right &&
                carRect.right > elemRect.left &&
                carRect.top < elemRect.bottom &&
                carRect.bottom > elemRect.top) {
                
                // Обработка столкновения
                handleCollision(elem, i);
                return;
            }
        }
    }

    // Обработка столкновения
    function handleCollision(element, index) {
        switch (element.type) {
            case 'pothole':
                if (gameState.tools > 0) {
                    // Ремонт выбоины
                    gameState.tools--;
                    gameState.score++;
                    updateUI();
                    
                    // Удалить выбоину
                    element.element.remove();
                    gameState.elements.splice(index, 1);
                } else {
                    // Получение урона
                    gameState.health--;
                    updateUI();
                    
                    // Удалить выбоину
                    element.element.remove();
                    gameState.elements.splice(index, 1);
                    
                    // Проверка здоровья
                    if (gameState.health <= 0) {
                        const carRect = {
                            left: elements.car.position().left,
                            top: elements.car.position().top
                        };
                        createExplosion(
                            carRect.left + elements.car.width() / 2,
                            carRect.top + elements.car.height() / 2
                        );
                        setTimeout(endGame, 500);
                    }
                }
                break;
                
            case 'tool':
                // Сбор инструмента
                gameState.tools++;
                updateUI();
                
                // Удалить инструмент
                element.element.remove();
                gameState.elements.splice(index, 1);
                break;
                
            case 'health':
                // Сбор здоровья
                if (gameState.health < gameState.maxHealth) {
                    gameState.health++;
                    updateUI();
                }
                
                // Удалить здоровье
                element.element.remove();
                gameState.elements.splice(index, 1);
                break;
        }
    }

    // Создать анимацию взрыва
    function createExplosion(x, y) {
        const explosion = $('<div>').addClass('explosion').css({
            left: x - 50 + 'px',
            top: y - 50 + 'px'
        });
        
        elements.road.append(explosion);
        
        setTimeout(() => {
            explosion.remove();
        }, 500);
    }

    // Использовать суперсилу
    function useSuperpower() {
        if (gameState.superpowerUsed || !gameState.running || gameState.paused) return;
        
        gameState.superpowerUsed = true;
        elements.superpowerBtn.hide();
        
        // Подсчет отремонтированных выбоин
        let repaired = 0;
        
        for (let i = gameState.elements.length - 1; i >= 0; i--) {
            const elem = gameState.elements[i];
            
            if (elem.type === 'pothole') {
                repaired++;
                elem.element.remove();
                gameState.elements.splice(i, 1);
            }
        }
        
        // Обновить счет
        gameState.score += repaired;
        updateUI();
    }

    // Движение машины
    function moveCar(direction) {
        if (gameState.carPosition + direction >= -1 && gameState.carPosition + direction <= 1) {
            gameState.carPosition += direction;
            updateCarPosition();
        }
    }

    // Обновить позицию машины
    function updateCarPosition() {
        let left;
        switch (gameState.carPosition) {
            case -1: left = 25; break;  // Левая полоса
            case 0: left = 125; break;  // Центр
            case 1: left = 225; break;  // Правая полоса
        }
        elements.car.css('left', left + 'px');
    }

    // Переключение паузы
    function togglePause() {
        if (!gameState.running) return;
        
        gameState.paused = !gameState.paused;
        
        if (gameState.paused) {
            // Можно добавить overlay паузы
        } else {
            // Убрать overlay паузы
        }
    }

    // Обновление UI
    function updateUI() {
        // Таймер обновляется отдельно
        elements.score.text('Выбоин: ' + gameState.score);
        elements.tools.text('Инструменты: ' + gameState.tools);
        
        // Обновить здоровье
        elements.health.empty();
        for (let i = 0; i < gameState.health; i++) {
            $('<div>').addClass('health-icon').appendTo(elements.health);
        }
    }

    // Обновление таймера
    function updateTimer() {
        const minutes = Math.floor(gameState.timeLeft / 60);
        const seconds = gameState.timeLeft % 60;
        elements.timer.text(
            minutes.toString().padStart(2, '0') + ':' + 
            seconds.toString().padStart(2, '0')
        );
    }

    // Завершение игры
    function endGame() {
        gameState.running = false;
        
        // Остановить интервалы
        clearInterval(gameState.gameInterval);
        clearInterval(gameState.timerInterval);
        
        // Обновить экран результатов
        elements.resultUsername.text(gameState.username);
        elements.resultScore.text(gameState.score);
        elements.resultTools.text(gameState.tools);
        
        // Отправить результаты на сервер
        submitResults();
        
        // Показать экран результатов
        elements.gameScreen.css('opacity', '0');
        setTimeout(() => {
            elements.gameScreen.hide();
            elements.resultScreen.css('opacity', '1').show();
        }, 500);
    }

    // Отправить результаты на сервер
    function submitResults() {
        const data = {
            username: gameState.username,
            score: gameState.score,
            toolkit: gameState.tools
        };
        
        // В реальной реализации здесь будет AJAX запрос к api.php
        console.log('Отправка результатов:', data);
        
        // Для демонстрации используем simulated response
        simulateServerResponse(data);
    }

    // Симуляция ответа сервера
    function simulateServerResponse(data) {
        // В реальной реализации это будет $.ajax запрос к api.php
        setTimeout(() => {
            const response = [
                {"id":"1","username":"Алексей","score":"25","toolkit":"15"},
                {"id":"2","username":"Мария","score":"20","toolkit":"12"},
                {"id":"3","username":"Иван","score":"18","toolkit":"10"},
                {"id":"4","username":data.username,"score":data.score.toString(),"toolkit":data.toolkit.toString()},
                {"id":"5","username":"Ольга","score":"15","toolkit":"8"},
                {"id":"6","username":"Дмитрий","score":"12","toolkit":"6"}
            ];
            
            updateLeaderboard(response, data.username);
        }, 500);
    }

    // Обновление таблицы лидеров
    function updateLeaderboard(data, currentUsername) {
        // Сортировка по количеству очков (по убыванию)
        data.sort((a, b) => parseInt(b.score) - parseInt(a.score));
        
        elements.leaderboardBody.empty();
        
        let currentRank = 1;
        let prevScore = null;
        
        for (let i = 0; i < data.length; i++) {
            const player = data[i];
            const playerScore = parseInt(player.score);
            
            // Определение ранга (учет одинаковых очков)
            if (prevScore !== null && playerScore !== prevScore) {
                currentRank = i + 1;
            }
            prevScore = playerScore;
            
            // Создание строки
            const row = $('<tr>');
            
            // Подсветка текущего игрока
            if (player.username === currentUsername) {
                row.addClass('highlight');
            }
            
            row.html(`
                <td>${currentRank}</td>
                <td>${player.username}</td>
                <td>${player.score}</td>
                <td>${player.toolkit}</td>
            `);
            
            elements.leaderboardBody.append(row);
        }
    }

    // Перезапуск игры
    function restartGame() {
        elements.resultScreen.css('opacity', '0');
        setTimeout(() => {
            elements.resultScreen.hide();
            elements.startScreen.css('opacity', '1').show();
            
            // Сбросить анимацию инструкции
            elements.instructions.css('opacity', '0').css('transform', 'translateY(20px)');
            animateInstructions();
        }, 500);
    }

    // Запуск игры
    init();
});