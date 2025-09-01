// ==UserScript==
// @name         Расписание ИТИ - Горизонтальная таблица (v11 - Пересмотренная логика переноса)
// @namespace    http://tampermonkey.net/
// @version      1.11
// @description  Принудительно отображает горизонтальную таблицу расписания на сайте t2iti.khsu.ru, даже на мобильных устройствах. Обеспечивает горизонтальный скролл только для таблицы. Закреплен столбец времени. Текст центрирован. Исправлены проблемы со ссылками, цветами легенды и переносом коротких слов.
// @author       You
// @match        https://t2iti.khsu.ru/week*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=khsu.ru
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Функция для "умного" переноса текста в ячейках
    // Работает ТОЛЬКО с текстовыми узлами, оставляя HTML-теги (например, <a>) нетронутыми
    function applySmartWordWrapToTextNode(textNode) {
        if (!textNode || textNode.nodeType !== 3) return; // Убедимся, что это текстовый узел

        const fullText = textNode.textContent || "";
        if (!fullText.trim()) return; // Пропустить пустые

        // Разбить текст на слова
        const words = fullText.split(/\s+/);
        let lines = [];
        let currentLineWords = []; // Теперь храним массив слов для текущей строки

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const nextWord = words[i + 1]; // Следующее слово

            // Добавляем текущее слово в массив слов текущей строки
            currentLineWords.push(word);

            // Проверяем, нужно ли переносить СЛЕДУЮЩЕЕ слово на новую строку
            // Если следующего слова нет (конец) или оно длинное (>=5), завершаем строку
            if (!nextWord || nextWord.length >= 5) {
                // Формируем строку из накопленных слов и добавляем в массив строк
                lines.push(currentLineWords.join(" "));
                // Начинаем новую строку
                currentLineWords = [];
            }
            // Если nextWord.length < 5, цикл продолжится, и это слово будет добавлено к currentLineWords
        }

        // Если вдруг остались непривязанные слова (например, последнее слово было коротким и не было длинного после него)
        // Хотя логика выше должна это учесть, добавим проверку на всякий случай.
        if (currentLineWords.length > 0) {
             lines.push(currentLineWords.join(" "));
        }

        // Создаем фрагмент для новых узлов
        const fragment = document.createDocumentFragment();
        lines.forEach((line, index) => {
            fragment.appendChild(document.createTextNode(line));
            if (index < lines.length - 1) { // Не добавляем <br> после последней строки
                fragment.appendChild(document.createElement('br'));
            }
        });

        // Заменяем оригинальный текстовый узел на фрагмент
        textNode.parentNode.replaceChild(fragment, textNode);
    }

    // Функция для применения "умного" переноса ко всем целевым элементам
    function applySmartWordWrap() {
        // Найти элементы, содержащие текст, который нужно обработать
        // Обрабатываем только текст внутри <p> в #name и непосредственно текстовые узлы внутри #auditory и #teacher
        const targetElements = document.querySelectorAll(
            '.pair_container #name p, .pair_container #auditory, .pair_container #teacher'
        );

        targetElements.forEach(el => {
            // Пропустить, если элемент пустой
            if (!el || !el.childNodes || el.childNodes.length === 0) return;

            // Пройтись по всем дочерним узлам элемента
            const childNodes = Array.from(el.childNodes);
            childNodes.forEach(node => {
                // Применить умный перенос ТОЛЬКО к текстовым узлам
                if (node.nodeType === 3 && node.textContent.trim()) {
                    applySmartWordWrapToTextNode(node);
                }
            });
        });
    }


    // Функция для применения изменений стилей
    function applyHorizontalTableStyles() {
        // 1. Найти элементы
        const mTable = document.getElementById('mTable');
        const sTablesContainer = document.getElementById('sTables');
        const mainContent = document.getElementById('mainContent');

        // Если основные элементы еще не загружены, выйти
        if (!mTable || !sTablesContainer) {
            console.log("Таблицы еще не загружены, ждем...");
            return false; // Указываем, что стили еще не применены
        }

        console.log("Применяем изменения стилей для горизонтальной таблицы (v11)...");

        // 2. Показать горизонтальную таблицу
        mTable.style.display = 'table';
        if (mTable.parentElement) {
            mTable.parentElement.style.display = 'block';
        }

        // 3. Скрыть вертикальные таблицы
        sTablesContainer.style.display = 'none';

        // 4. Убедиться, что основной контент виден
        if (mainContent) {
            mainContent.style.display = 'block';
        }

        // 5. Создать или получить контейнер для прокрутки таблицы
        let tableScrollContainer = document.getElementById('table-scroll-container-id');
        if (!tableScrollContainer) {
            tableScrollContainer = document.createElement('div');
            tableScrollContainer.id = 'table-scroll-container-id';
            tableScrollContainer.style.overflowX = 'auto';
            tableScrollContainer.style.width = '100%';
            tableScrollContainer.style.maxWidth = '100vw';
            tableScrollContainer.style.boxSizing = 'border-box';
            tableScrollContainer.style.position = 'relative'; // Для позиционирования sticky

            mTable.parentNode.insertBefore(tableScrollContainer, mTable);
            tableScrollContainer.appendChild(mTable);
        }

        // 6. Добавить/обновить CSS
        let customStyle = document.getElementById('custom-schedule-style-id');
        if (!customStyle) {
            customStyle = document.createElement('style');
            customStyle.id = 'custom-schedule-style-id';
            customStyle.type = 'text/css';
            document.head.appendChild(customStyle);
        }

        // Очищаем и добавляем стили
        // ВАЖНО: Определяем переменные CSS для цветов, чтобы легенда могла их использовать
        customStyle.textContent = `
            :root {
                --green: rgb(217, 255, 217);
                --yellow: rgb(255, 248, 206);
                --red: rgb(255, 237, 214);
                --exam: rgb(255, 200, 191);
                --white: rgba(255, 255, 255, 0);
                --blue: rgb(236, 244, 255);
                --other: white;
            }
            /* Убедимся, что таблица может расти по размеру содержимого */
            #mTable {
                table-layout: auto; /* Автоматический расчет ширины столбцов на основе содержимого */
                width: auto; /* Ширина определяется содержимым */
                min-width: 600px; /* Минимальная ширина для предотвращения сжатия на маленьких экранах */
                max-width: none; /* Максимальная ширина не ограничена */
                margin: 0 auto; /* Центрируем таблицу внутри контейнера скролла */
                height: auto; /* Высота определяется содержимым */
                border-collapse: separate !important; /* separate для корректной работы sticky и границ */
                border-spacing: 0; /* Убираем промежутки между ячейками */
                font-size: 13px; /* Базовый размер шрифта для всей таблицы */
                line-height: 1.2; /* Базовый межстрочный интервал */
                position: relative; /* Для позиционирования sticky */
            }

            /* Стили для ячеек таблицы - позволяют растягиваться по содержимому */
            .wTable th, .wTable td {
                vertical-align: middle !important; /* Центрирование по вертикали по умолчанию */
                padding: 4px !important; /* Внутренний отступ */
                margin: 0 !important;
                outline: none !important;
                /* Размеры определяются содержимым */
                width: auto !important;
                min-width: 100px !important; /* Минимальная ширина ячейки */
                max-width: none !important; /* Максимальная ширина не ограничена */
                height: auto !important; /* Высота определяется содержимым */
                min-height: 80px !important; /* Минимальная высота ячейки */
                max-height: none !important; /* Максимальная высота не ограничена */
                border: 1px solid #d8d8d8 !important; /* Границы ячеек */
                text-align: center !important; /* Центрирование текста по горизонтали */
                box-sizing: border-box !important; /* Включаем padding и border в размеры */
                /* Позволяем содержимому определять размеры */
                overflow: visible !important; /* Содержимое может выходить за границы (до скролла контейнера) */
                white-space: normal !important; /* Позволяем перенос строк */
                text-overflow: clip !important; /* Не обрезаем многоточием */
                font-size: inherit; /* Наследуем размер шрифта от таблицы */
            }

            /* Стили для первой колонки (время) - ЗАКРЕПЛЕНА */
            .wTable td:first-child, .wTable th:first-child {
                 position: sticky !important; /* Закрепляем */
                 left: -1px !important; /* Прилипает к левому краю контейнера */
                 z-index: 2 !important; /* Поверх других ячеек */
                 background-color: #ffffff !important; /* Фон, чтобы не было артефактов при скролле */
                 /* --- Новое --- */
                 box-shadow: inset -2px 0 0px #ffffff, -2px 0 0px #ffffff; /* Скрыть 1px артефакт слева */
                 /* --- Конец нового --- */
                 min-width: 75px !important; /* Минимальная ширина колонки времени */
                 width: auto !important;
                 max-width: none !important;
                 font-size: 12px !important; /* Немного меньший шрифт для времени */
                 padding: 4px 2px !important; /* Уменьшаем padding для времени */
                 font-weight: bold !important; /* Сделаем время немного жирнее для выделения */
                 /* Убираем стили, которые могут мешать адаптации высоты */
                 height: auto !important;
                 /* Центрирование текста в ячейке времени - используем display: table-cell как нативный способ */
                 display: table-cell !important;
                 vertical-align: middle !important; /* Центрирование по вертикали внутри ячейки */
                 text-align: center !important; /* Центрирование по горизонтали внутри ячейки */
            }
            /* Убедимся, что текст внутри .tTime тоже центрирован */
            .tTime {
                 display: flex !important;
                 flex-direction: column !important;
                 justify-content: center !important; /* Центрирование по вертикали внутри .tTime */
                 align-items: center !important; /* Центрирование по горизонтали внутри .tTime */
                 text-align: center !important;
                 width: 100% !important;
                 height: 100% !important; /* Это может быть нужно для flex, но не должно мешать росту */
                 box-sizing: border-box !important;
                 padding: 0 !important;
                 margin: 0 !important;
            }
            .tTime p {
                 margin: 0 !important;
                 padding: 0 !important;
                 line-height: inherit !important;
            }
            /* Если внутри .tTime есть <div>, центрируем его тоже */
            .tTime > div {
                 display: flex !important;
                 flex-direction: column !important;
                 justify-content: center !important;
                 align-items: center !important;
                 text-align: center !important;
                 width: 100% !important;
                 height: 100% !important;
            }

            /* Адаптируем контейнеры пар внутри ячеек */
            .pair_container {
                 width: 100% !important; /* Занимает всю ширину ячейки */
                 min-width: unset !important;
                 max-width: unset !important;
                 height: auto !important; /* Высота определяется содержимым */
                 min-height: 75px !important; /* Минимальная высота внутри */
                 max-height: none !important; /* Максимальная высота не ограничена */
                 box-sizing: border-box !important;
                 display: flex !important;
                 flex-direction: column !important;
                 justify-content: center !important; /* Центрирование по вертикали */
                 align-items: center !important; /* Центрирование по горизонтали */
                 text-align: center !important; /* Центрирование текста */
                 padding: 3px !important;
                 /* Позволяем содержимому определять размеры */
                 overflow: visible !important; /* Содержимое может выходить за границы */
                 white-space: normal !important; /* Позволяем перенос строк внутри */
                 text-overflow: clip !important; /* Не обрезаем многоточием */
                 /* Цвет фона теперь определяется напрямую или через класс типа */
                 position: relative !important;
                 font-size: inherit; /* Наследуем размер шрифта */
            }
             /* Определяем классы цветов для pair_container, если они не применяются из оригинального CSS */
             .pair_container.green { background-color: var(--green) !important; }
             .pair_container.yellow { background-color: var(--yellow) !important; }
             .pair_container.red { background-color: var(--red) !important; }
             .pair_container.white { background-color: var(--white) !important; }
             .pair_container.blue { background-color: var(--blue) !important; }
             .pair_container.exam { background-color: var(--exam) !important; }

            .pair_container #name, .pair_container #auditory, .pair_container #teacher {
                width: 100% !important;
                display: flex !important;
                flex-direction: column !important; /* Элементы внутри друг под другом */
                justify-content: center !important;
                align-items: center !important;
                text-align: center !important;
                flex-grow: 1 !important; /* Занимают доступное пространство */
                padding: 1px 0 !important;
                /* Позволяем содержимому определять размеры */
                 overflow: visible !important;
                 white-space: normal !important;
                 text-overflow: clip !important;
                 box-sizing: border-box !important;
            }
            .pair_container #name p, .pair_container #auditory, .pair_container #teacher {
                margin: 0 !important;
                padding: 1px 2px !important; /* Небольшие отступы внутри */
                font-size: inherit !important; /* Наследуем размер шрифта (13px) */
                word-wrap: break-word !important; /* Перенос слов */
                overflow-wrap: break-word !important;
                line-height: inherit !important; /* Наследуем межстрочный интервал */
                /* Позволяем содержимому определять размеры */
                 white-space: normal !important; /* Позволяем перенос внутри элементов пары */
                 overflow: visible !important;
                 text-overflow: clip !important;
                 max-width: 100% !important;
                 box-sizing: border-box !important;
                 /* Убираем стандартное поведение переноса для умного переноса JS */
                 word-break: normal !important;
            }
            /* Стили для ссылок - убедимся, что они наследуют цвет и стиль */
            .pair_container a {
                 color: green !important;
                 text-decoration: none !important;
                 word-wrap: break-word !important;
                 overflow-wrap: break-word !important;
                 /* Позволяем содержимому определять размеры */
                 white-space: normal !important;
                 overflow: visible !important;
                 text-overflow: clip !important;
                 max-width: 100% !important;
                 display: inline-block !important; /* Помогает с переносом */
                 font-size: inherit !important; /* Наследуем размер шрифта */
                 text-align: center !important; /* Центрируем текст ссылки */
                 line-height: inherit !important;
            }


            /* Медиа-запросы для экранов до 768px */
            @media screen and (max-width: 768px) {
                #mTable {
                     font-size: 12px !important; /* Уменьшаем базовый шрифт на маленьких экранах */
                     min-width: 500px !important; /* Минимальная ширина меньше */
                }
                .wTable th, .wTable td {
                     min-height: 75px !important; /* Минимальная высота меньше */
                     min-width: 90px !important; /* Минимальная ширина меньше */
                     padding: 3px !important; /* Уменьшаем padding */
                }
                .wTable td:first-child, .wTable th:first-child {
                     min-width: 65px !important; /* Минимальная ширина времени меньше */
                     font-size: 11px !important; /* Еще меньше шрифт времени */
                     background-color: #f9f9f9 !important; /* Немного другой фон для лучшей видимости */
                }
                .pair_container {
                     min-height: 70px !important; /* Минимальная высота меньше */
                     padding: 2px !important; /* Уменьшаем padding */
                }
                .pair_container #name p,
                .pair_container #auditory,
                .pair_container #teacher {
                     font-size: inherit !important; /* Наследуем уменьшенный шрифт */
                     padding: 0px 1px !important; /* Уменьшаем padding */
                }
                .centered-title {
                    font-size: 16px !important; /* Уменьшаем заголовок */
                }
                .colortype {
                     font-size: 11px !important; /* Уменьшаем шрифт легенды */
                     min-width: 90px !important; /* Уменьшаем ширину элементов легенды */
                     padding: 3px 5px !important; /* Уменьшаем padding */
                }
            }

            /* Медиа-запросы для очень маленьких экранов */
            @media screen and (max-width: 480px) {
                 #mTable {
                     font-size: 11px !important; /* Еще меньше базовый шрифт */
                     min-width: 400px !important; /* Еще меньше минимальная ширина */
                }
                 .wTable td:first-child, .wTable th:first-child {
                     min-width: 55px !important;
                     font-size: 10px !important;
                     background-color: #f0f0f0 !important; /* Еще другой фон */
                }
                 .wTable th, .wTable td {
                     min-height: 70px !important;
                     min-width: 80px !important;
                     padding: 2px !important;
                }
                 .pair_container {
                     min-height: 65px !important;
                     padding: 2px !important;
                }
                 .pair_container #name p,
                 .pair_container #auditory,
                 .pair_container #teacher {
                     font-size: inherit !important;
                     padding: 0px 1px !important;
                }
                 .centered-title {
                    font-size: 14px !important;
                }
                 .colortype {
                     font-size: 10px !important;
                     min-width: 80px !important;
                     padding: 2px 4px !important;
                }
            }

            /* Убедимся, что контейнер ints не ограничивает ширину */
             .ints {
                align-items: center;
                justify-content: center;
                display: flex;
                flex-direction: column;
                width: 100%;
                max-width: 100%;
                overflow-x: visible; /* ВАЖНО: ints не должен скроллиться */
                padding-left: 5px;
                padding-right: 5px;
                box-sizing: border-box;
            }
             .ints .container { /* .container внутри .ints */
                 width: 100%;
                 max-width: 100%;
                 overflow-x: visible; /* ВАЖНО: .container внутри ints тоже не должен скроллиться */
                 padding-left: 5px;
                 padding-right: 5px;
                 box-sizing: border-box;
            }

            /* Контейнер скролла таблицы */
            #table-scroll-container-id {
                 width: 100%;
                 max-width: 100vw;
                 overflow-x: auto; /* Только горизонтальный скролл */
                 overflow-y: visible; /* Вертикальный скролл убираем, пусть страница скроллится */
                 margin: 10px 0 20px 0; /* Отступы сверху и снизу */
                 scrollbar-width: thin; /* Для Firefox */
                 box-sizing: border-box;
                 /* Граница для визуализации (опционально) */
                 /* border: 1px solid #ccc; */
            }
            /* Для Webkit браузеров (Chrome, Safari) */
            #table-scroll-container-id::-webkit-scrollbar {
                height: 8px;
            }
            #table-scroll-container-id::-webkit-scrollbar-track {
                background: #f1f1f1;
            }
            #table-scroll-container-id::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 4px;
            }
            #table-scroll-container-id::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }

            /* Стили для кнопок навигации и легенды */
            .buttons-container {
                 width: 100%;
                 flex-wrap: wrap;
                 box-sizing: border-box;
                 justify-content: center;
            }
             .leg ul {
                 flex-wrap: wrap;
                 justify-content: center;
                 padding: 0 5px;
                 margin: 10px 0;
                 list-style: none;
                 display: flex;
                 gap: 5px;
            }
            /* Восстанавливаем стили для элементов легенды */
            .colortype {
                 flex-shrink: 0;
                 font-size: 13px; /* Базовый размер шрифта для легенды */
                 padding: 4px 6px;
                 min-width: 120px;
                 border: 1px solid #dfdfdf;
                 border-radius: 8px;
                 text-align: center;
                 white-space: nowrap; /* Не переносим текст внутри легенды */
                 background-color: inherit;
                 box-sizing: border-box;
            }
            /* Явно определяем цвета фона для каждого типа в легенде */
            .colortype.greenType { background-color: var(--green) !important; }
            .colortype.yellowType { background-color: var(--yellow) !important; }
            .colortype.redType { background-color: var(--red) !important; }
            .colortype.examType { background-color: var(--exam) !important; }
            .colortype.otherType { background-color: var(--other) !important; border: 1px solid #ccc !important; } /* Добавляем границу для белого фона */

        `;
        return true; // Указываем, что стили применены
    }

    // --- Обработка загрузки и изменений ---

    function waitForElement(selector, callback, interval = 500, timeout = 15000) {
        const startTime = Date.now();
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
                return true;
            } else if (Date.now() - startTime > timeout) {
                console.warn(`Элемент ${selector} не найден в течение ${timeout}ms.`);
                return false;
            } else {
                setTimeout(checkElement, interval);
                return false;
            }
        };
        checkElement();
    }

    // Функция для полного обновления таблицы (стили + умный перенос)
    function updateTable() {
        const stylesApplied = applyHorizontalTableStyles();
        if (stylesApplied) {
            // Даем браузеру немного времени, чтобы применить стили перед манипуляциями с DOM
            setTimeout(() => {
                try {
                    applySmartWordWrap();
                    console.log("Умный перенос текста применен (v11).");
                } catch (e) {
                    console.error("Ошибка при применении умного переноса:", e);
                }
            }, 150); // Увеличил до 150 мс для надежности
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => waitForElement('#mTable', updateTable));
    } else {
        waitForElement('#mTable', updateTable);
    }

    // MutationObserver для отслеживания изменений в DOM, например, при переходе между неделями
    const observer = new MutationObserver(function(mutationsList) {
        let shouldUpdate = false;
        for(let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // Проверяем, появились ли элементы таблиц или изменились данные внутри .main-body
                if (document.getElementById('mTable') || document.getElementById('sTables') || (mutation.target.id && mutation.target.id === 'main-body')) {
                     shouldUpdate = true;
                     break;
                }
                // Также проверяем, если добавлен/изменен непосредственно #mainContent
                if (mutation.target.id === 'mainContent' || (mutation.addedNodes.length > 0 && Array.from(mutation.addedNodes).some(node => node.id === 'mainContent'))) {
                     shouldUpdate = true;
                     break;
                }
            }
        }
        if (shouldUpdate) {
             // console.log("MutationObserver: Обнаружены изменения, обновляем таблицу...");
             waitForElement('#mTable', updateTable);
        }
    });
    // Начинаем наблюдение за изменениями в body
    observer.observe(document.body, { childList: true, subtree: true });

})();
